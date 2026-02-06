import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function reportsRoutes(app: FastifyInstance) {
  app.get("/profit", async () => {
    const res = await pool.query(
      `SELECT
         SUM(CASE WHEN a.code = '4100' THEN jl.credit - jl.debit ELSE 0 END) AS sales,
         SUM(CASE WHEN a.code = '5100' THEN jl.debit - jl.credit ELSE 0 END) AS cogs
       FROM journal_lines jl
       JOIN accounts a ON a.id = jl.account_id`
    );
    const sales = Number(res.rows[0]?.sales || 0);
    const cogs = Number(res.rows[0]?.cogs || 0);
    return { data: { sales, cogs, profit: sales - cogs } };
  });

  app.get("/inventory", async () => {
    const res = await pool.query(
      `SELECT
        i.id,
        i.sku,
        i.name,
        i.type,
        i.unit,
        i.min_stock,
        COALESCE(SUM(
          CASE
            WHEN im.direction = 'in' THEN im.qty
            WHEN im.direction = 'out' THEN -im.qty
            ELSE 0
          END
        ), 0) AS on_hand
       FROM items i
       LEFT JOIN inventory_movements im ON im.item_id = i.id
       GROUP BY i.id, i.sku, i.name, i.type, i.unit, i.min_stock
       ORDER BY i.name`
    );
    return { data: res.rows };
  });

  app.get("/customer-debt", async () => {
    const res = await pool.query(
      `SELECT c.id, c.name,
        SUM(si.total_amount) AS total_sales
       FROM customers c
       LEFT JOIN sales_invoices si ON si.customer_id = c.id AND si.status = 'posted'
       GROUP BY c.id, c.name
       ORDER BY total_sales DESC NULLS LAST`
    );
    return { data: res.rows };
  });

  app.get("/production-cost", async () => {
    const res = await pool.query(
      `SELECT po.id, po.order_no,
        SUM(pm.qty_used * pm.unit_cost) AS total_cost
       FROM production_orders po
       LEFT JOIN production_materials pm ON pm.production_order_id = po.id
       GROUP BY po.id, po.order_no
       ORDER BY po.order_no`
    );
    return { data: res.rows };
  });

  app.get("/vehicle-custody", async () => {
    const res = await pool.query(
      `SELECT v.id, v.code, v.plate_no,
        SUM(CASE WHEN cm.direction = 'load' THEN cm.qty ELSE 0 END) AS loaded,
        SUM(CASE WHEN cm.direction = 'return' THEN cm.qty ELSE 0 END) AS returned,
        SUM(CASE WHEN cm.direction = 'sold' THEN cm.qty ELSE 0 END) AS sold
       FROM vehicles v
       LEFT JOIN custody_movements cm ON cm.vehicle_id = v.id
       GROUP BY v.id, v.code, v.plate_no
       ORDER BY v.code`
    );
    return { data: res.rows };
  });
}
