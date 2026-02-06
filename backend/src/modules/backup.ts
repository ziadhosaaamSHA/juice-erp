import { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";

const execFileAsync = promisify(execFile);
const defaultBackupDir = path.join("/tmp", "juice_backups");

function getDbName(dbUrl: string) {
  try {
    const url = new URL(dbUrl);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

async function validateSqlFile(filePath: string, dbName: string) {
  const banned = ["create database", "drop database", "alter database"];
  const targetDb = (dbName || "").toLowerCase();
  let remainder = "";
  for await (const chunk of createReadStream(filePath, { encoding: "utf8" })) {
    const text = remainder + chunk;
    const lines = text.split(/\r?\n/);
    remainder = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (banned.some((b) => lower.startsWith(b))) {
        throw new Error("الملف يحتوي على أوامر قاعدة بيانات غير مسموح بها.");
      }
      if (lower.startsWith("\\connect") || lower.startsWith("\\c ")) {
        const match = trimmed.match(/^\\(connect|c)\s+"?([^"\s]+)"?/i);
        const found = match?.[2]?.toLowerCase();
        if (targetDb && found && found !== targetDb) {
          throw new Error("الملف لا يخص قاعدة البيانات الحالية.");
        }
      }
    }
  }
  if (remainder) {
    const trimmed = remainder.trim();
    const lower = trimmed.toLowerCase();
    if (banned.some((b) => lower.startsWith(b))) {
      throw new Error("الملف يحتوي على أوامر قاعدة بيانات غير مسموح بها.");
    }
    if (lower.startsWith("\\connect") || lower.startsWith("\\c ")) {
      const match = trimmed.match(/^\\(connect|c)\s+"?([^"\s]+)"?/i);
      const found = match?.[2]?.toLowerCase();
      if (targetDb && found && found !== targetDb) {
        throw new Error("الملف لا يخص قاعدة البيانات الحالية.");
      }
    }
  }
}

function formatExecError(err: any, fallback: string, tool: string) {
  if (err?.code === "ENOENT") {
    return `تعذر العثور على ${tool}. يرجى تثبيته أولاً.`;
  }
  return err?.message || fallback;
}

async function resetPublicSchema(dbUrl: string) {
  const resetSql = "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS pgcrypto;";
  await execFileAsync("psql", [
    "--set",
    "ON_ERROR_STOP=on",
    "--dbname",
    dbUrl,
    "--command",
    resetSql,
  ]);
}

async function ensureBackupTable() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS backup_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      backup_date timestamptz NOT NULL DEFAULT now(),
      file_name text,
      size_mb numeric(10,2) NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'completed',
      notes text
    )`
  );
  await pool.query(
    `ALTER TABLE backup_history ADD COLUMN IF NOT EXISTS last_restored_at timestamptz`
  );
  await pool.query(
    `ALTER TABLE backup_history ADD COLUMN IF NOT EXISTS restore_count integer NOT NULL DEFAULT 0`
  );
}

async function getBackupDir() {
  return process.env.BACKUP_DIR || defaultBackupDir;
}

export async function backupRoutes(app: FastifyInstance) {
  await ensureBackupTable();
  app.get("/history", async () => {
    await ensureBackupTable();
    const res = await pool.query(
      `SELECT id, backup_date, file_name, size_mb, status, notes, last_restored_at, restore_count
       FROM backup_history
       ORDER BY backup_date DESC`
    );
    return { data: res.rows };
  });

  app.get("/last", async () => {
    await ensureBackupTable();
    const res = await pool.query(
      `SELECT id, backup_date, file_name, size_mb, status, notes, last_restored_at, restore_count
       FROM backup_history
       ORDER BY backup_date DESC
       LIMIT 1`
    );
    return { data: res.rows[0] || null };
  });

  app.post("/run", async () => {
    await ensureBackupTable();
    const fileName = `backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.sql`;
    const insert = await pool.query(
      `INSERT INTO backup_history (file_name, size_mb, status, notes)
       VALUES ($1, $2, 'running', $3)
       RETURNING *`,
      [fileName, 0, "جارٍ إنشاء النسخة"]
    );
    const row = insert.rows[0];
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is required");

    const dir = await getBackupDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);

    try {
      await execFileAsync("pg_dump", [
        "--dbname",
        dbUrl,
        "--no-owner",
        "--no-privileges",
        "--format",
        "plain",
        "--file",
        filePath,
      ]);

      const stat = await fs.stat(filePath);
      const sizeMb = Number((stat.size / (1024 * 1024)).toFixed(2));
      const done = await pool.query(
        `UPDATE backup_history
         SET status = 'completed', size_mb = $1, notes = $2, backup_date = now()
         WHERE id = $3
         RETURNING *`,
        [sizeMb, "اكتملت النسخة بنجاح", row.id]
      );
      return { data: done.rows[0] };
    } catch (err: any) {
      const msg = formatExecError(err, "Backup failed", "pg_dump");
      await pool.query(
        `UPDATE backup_history
         SET status = 'failed', notes = $1, backup_date = now()
         WHERE id = $2`,
        [msg, row.id]
      );
      throw new Error(msg);
    }
  });

  app.post("/history/:id/restore", async (req) => {
    await ensureBackupTable();
    const id = (req.params as { id: string }).id;
    const res = await pool.query(
      `SELECT file_name, status FROM backup_history WHERE id = $1`,
      [id]
    );
    if (res.rowCount === 0) throw new Error("Backup not found");
    if (res.rows[0].status !== "completed") {
      throw new Error("Backup is not ready for restore");
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is required");

    const dir = await getBackupDir();
    const fileName = res.rows[0].file_name || `backup_${id}.sql`;
    const filePath = path.join(dir, fileName);

    try {
      await resetPublicSchema(dbUrl);
      await execFileAsync("psql", [
        "--set",
        "ON_ERROR_STOP=on",
        "--dbname",
        dbUrl,
        "--file",
        filePath,
      ]);

      await pool.query(
        `UPDATE backup_history
         SET last_restored_at = now(), restore_count = restore_count + 1, notes = $1
         WHERE id = $2`,
        ["تم استرجاع النسخة", id]
      );
      return { ok: true };
    } catch (err: any) {
      const msg = formatExecError(err, "Restore failed", "psql");
      await pool.query(
        `UPDATE backup_history
         SET notes = $1
         WHERE id = $2`,
        [msg, id]
      );
      throw new Error(msg);
    }
  });

  app.post("/restore-upload", async (req) => {
    await ensureBackupTable();
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is required");
    const dbName = getDbName(dbUrl);

    const data = await (req as any).file();
    if (!data) throw new Error("File is required");
    const filename = data.filename || "";
    const ext = path.extname(filename).toLowerCase();
    if (ext !== ".sql") {
      throw new Error("Only .sql files are allowed");
    }

    const dir = await getBackupDir();
    await fs.mkdir(dir, { recursive: true });
    const safeName = `upload_${Date.now()}_${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(dir, safeName);
    await pipeline(data.file, createWriteStream(filePath));

    const stat = await fs.stat(filePath);
    const sizeMb = Number((stat.size / (1024 * 1024)).toFixed(2));
    try {
      await validateSqlFile(filePath, dbName);
    } catch (err) {
      await fs.unlink(filePath).catch(() => {});
      throw err;
    }
    const insert = await pool.query(
      `INSERT INTO backup_history (file_name, size_mb, status, notes)
       VALUES ($1, $2, 'running', $3)
       RETURNING *`,
      [safeName, sizeMb, "جارٍ استعادة النسخة من ملف خارجي"]
    );
    const row = insert.rows[0];

    try {
      await resetPublicSchema(dbUrl);
      await execFileAsync("psql", [
        "--set",
        "ON_ERROR_STOP=on",
        "--dbname",
        dbUrl,
        "--file",
        filePath,
      ]);

      await pool.query(
        `UPDATE backup_history
         SET status = 'completed', notes = $1, last_restored_at = now(), restore_count = restore_count + 1
         WHERE id = $2`,
        ["تم استرجاع النسخة من ملف خارجي", row.id]
      );
      return { ok: true };
    } catch (err: any) {
      const msg = formatExecError(err, "Restore failed", "psql");
      await pool.query(
        `UPDATE backup_history
         SET status = 'failed', notes = $1
         WHERE id = $2`,
        [msg, row.id]
      );
      throw new Error(msg);
    }
  });

  app.post("/history/:id/status", async (req) => {
    await ensureBackupTable();
    const id = (req.params as { id: string }).id;
    const body = req.body as { status: string; notes?: string };
    const res = await pool.query(
      `UPDATE backup_history SET status = $1, notes = $2 WHERE id = $3 RETURNING *`,
      [body.status, body.notes || null, id]
    );
    if (res.rowCount === 0) throw new Error("Backup not found");
    return { data: res.rows[0] };
  });

  app.get("/history/:id/download", async (req, reply) => {
    await ensureBackupTable();
    const id = (req.params as { id: string }).id;
    const res = await pool.query(
      `SELECT file_name FROM backup_history WHERE id = $1`,
      [id]
    );
    if (res.rowCount === 0) throw new Error("Backup not found");
    const fileName = res.rows[0].file_name || `backup_${id}.sql`;
    const dir = await getBackupDir();
    const filePath = path.join(dir, fileName);
    const data = await fs.readFile(filePath);
    reply.header("Content-Type", "application/sql");
    reply.header("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    return reply.send(data);
  });
}
