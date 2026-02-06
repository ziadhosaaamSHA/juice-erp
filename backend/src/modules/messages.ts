import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function messagesRoutes(app: FastifyInstance) {
  app.post("/sms", async (req) => {
    const body = req.body as { recipient: string; body: string };
    const res = await pool.query(
      `INSERT INTO messages_log (channel, recipient, body, status)
       VALUES ('sms', $1, $2, 'queued')
       RETURNING *`,
      [body.recipient, body.body]
    );
    return { data: res.rows[0] };
  });

  app.post("/whatsapp", async (req) => {
    const body = req.body as { recipient: string; body: string };
    const res = await pool.query(
      `INSERT INTO messages_log (channel, recipient, body, status)
       VALUES ('whatsapp', $1, $2, 'queued')
       RETURNING *`,
      [body.recipient, body.body]
    );
    return { data: res.rows[0] };
  });

  app.get("/logs", async () => {
    const res = await pool.query(
      `SELECT * FROM messages_log ORDER BY created_at DESC`
    );
    return { data: res.rows };
  });
}
