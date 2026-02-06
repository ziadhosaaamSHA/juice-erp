import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function alertsRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    const lowStock = await pool.query(
      `SELECT i.id, i.name, i.min_stock,
        COALESCE(SUM(CASE WHEN im.direction = 'in' THEN im.qty ELSE 0 END) -
                 SUM(CASE WHEN im.direction = 'out' THEN im.qty ELSE 0 END), 0) AS on_hand
       FROM items i
       LEFT JOIN inventory_movements im ON im.item_id = i.id
       GROUP BY i.id, i.name, i.min_stock
       HAVING COALESCE(SUM(CASE WHEN im.direction = 'in' THEN im.qty ELSE 0 END) -
                      SUM(CASE WHEN im.direction = 'out' THEN im.qty ELSE 0 END), 0) < i.min_stock`
    );

    const now = new Date();
    const alerts = lowStock.rows.map((row: any) => ({
      alert_type: "low_stock",
      message: `مخزون منخفض للصنف ${row.name}`,
      entity_type: "item",
      entity_id: row.id,
      created_at: now
    }));

    return { data: alerts };
  });

  app.post("/:id/read", async (req) => {
    const id = (req.params as { id: string }).id;
    await pool.query(`UPDATE alerts SET is_read = true WHERE id = $1`, [id]);
    return { ok: true };
  });
}
