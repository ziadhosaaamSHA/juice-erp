import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function inventoryRoutes(app: FastifyInstance) {
  app.get("/items", async () => {
    const res = await pool.query("SELECT * FROM items ORDER BY name");
    return { data: res.rows };
  });

  app.post("/items", async (req) => {
    const body = req.body as {
      sku: string;
      name: string;
      type: string;
      unit: string;
      minStock?: number;
    };
    const res = await pool.query(
      `INSERT INTO items (sku, name, type, unit, min_stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [body.sku, body.name, body.type, body.unit, body.minStock || 0]
    );
    return { data: res.rows[0] };
  });

  app.post("/items/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as {
      sku: string;
      name: string;
      type: string;
      unit: string;
      minStock?: number;
    };
    const res = await pool.query(
      `UPDATE items
       SET sku = $1, name = $2, type = $3, unit = $4, min_stock = $5
       WHERE id = $6
       RETURNING *`,
      [body.sku, body.name, body.type, body.unit, body.minStock || 0, id]
    );
    if (res.rowCount === 0) throw new Error("Item not found");
    return { data: res.rows[0] };
  });

  app.delete("/items/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const res = await pool.query(`DELETE FROM items WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) throw new Error("Item not found");
    return { ok: true };
  });

  app.get("/warehouses", async () => {
    const res = await pool.query("SELECT * FROM warehouses ORDER BY name");
    return { data: res.rows };
  });

  app.post("/warehouses", async (req) => {
    const body = req.body as { code: string; name: string; isVehicle?: boolean };
    const res = await pool.query(
      `INSERT INTO warehouses (code, name, is_vehicle)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [body.code, body.name, body.isVehicle || false]
    );
    return { data: res.rows[0] };
  });

  app.post("/warehouses/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as { code: string; name: string; isVehicle?: boolean };
    const res = await pool.query(
      `UPDATE warehouses
       SET code = $1, name = $2, is_vehicle = $3
       WHERE id = $4
       RETURNING *`,
      [body.code, body.name, body.isVehicle || false, id]
    );
    if (res.rowCount === 0) throw new Error("Warehouse not found");
    return { data: res.rows[0] };
  });

  app.delete("/warehouses/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const res = await pool.query(`DELETE FROM warehouses WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) throw new Error("Warehouse not found");
    return { ok: true };
  });

  app.get("/movements", async () => {
    const res = await pool.query(
      `SELECT im.*, i.sku, i.name AS item_name, w.code AS warehouse_code, w.name AS warehouse_name
       FROM inventory_movements im
       JOIN items i ON i.id = im.item_id
       JOIN warehouses w ON w.id = im.warehouse_id
       ORDER BY im.movement_date DESC`
    );
    return { data: res.rows };
  });

  app.post("/adjustments", async (req) => {
    const body = req.body as {
      itemId: string;
      warehouseId: string;
      qty: number;
      direction: "in" | "out";
      note?: string;
    };
    const res = await pool.query(
      `INSERT INTO inventory_movements
        (item_id, warehouse_id, qty, direction, source_type, source_id)
       VALUES ($1, $2, $3, $4, 'adjustment', NULL)
       RETURNING *`,
      [body.itemId, body.warehouseId, body.qty, body.direction]
    );
    return { data: res.rows[0] };
  });
}
