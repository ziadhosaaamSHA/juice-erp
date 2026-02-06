import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

const resetPhrases: Record<string, string> = {
  transactions: "إعادة تعيين الحركة",
  all: "حذف كل البيانات التشغيلية",
};

export async function settingsRoutes(app: FastifyInstance) {
  app.post("/reset", async (req) => {
    const body = req.body as { mode?: string; confirmText?: string };
    const mode = body.mode || "transactions";
    const confirmText = (body.confirmText || "").trim();
    const phrase = resetPhrases[mode];

    if (!phrase) {
      throw new Error("Invalid reset mode");
    }

    if (confirmText !== phrase) {
      throw new Error("Confirmation text mismatch");
    }

    const txTables = [
      "journal_lines",
      "journal_entries",
      "inventory_movements",
      "production_materials",
      "production_outputs",
      "production_orders",
      "sales_invoice_items",
      "sales_invoices",
      "sales_returns",
      "purchase_invoice_items",
      "purchase_invoices",
      "custody_movements",
      "alerts",
      "messages_log",
    ];

    const masterTables = [
      "customers",
      "suppliers",
      "items",
      "warehouses",
      "vehicles",
    ];

    const tablesToClear = mode === "all" ? [...txTables, ...masterTables] : txTables;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`TRUNCATE TABLE ${tablesToClear.join(", ")} RESTART IDENTITY CASCADE`);
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
