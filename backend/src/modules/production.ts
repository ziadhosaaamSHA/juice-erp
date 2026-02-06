import { FastifyInstance } from "fastify";
import { pool, withTx } from "../db.js";
import { createJournalEntry } from "../accountingEngine.js";

export async function productionRoutes(app: FastifyInstance) {
  app.get("/orders", async () => {
    const res = await pool.query(
      `SELECT * FROM production_orders ORDER BY production_date DESC`
    );
    return { data: res.rows };
  });

  app.get("/orders/:id", async (req) => {
    const orderId = (req.params as { id: string }).id;
    const orderRes = await pool.query(
      `SELECT * FROM production_orders WHERE id = $1`,
      [orderId]
    );
    if (orderRes.rowCount === 0) throw new Error("Production order not found");
    const materialsRes = await pool.query(
      `SELECT * FROM production_materials WHERE production_order_id = $1`,
      [orderId]
    );
    const outputsRes = await pool.query(
      `SELECT * FROM production_outputs WHERE production_order_id = $1`,
      [orderId]
    );
    return { data: { order: orderRes.rows[0], materials: materialsRes.rows, outputs: outputsRes.rows } };
  });

  app.post("/orders", async (req) => {
    const body = req.body as {
      orderNo: string;
      productionDate: string;
      notes?: string;
      materials: { itemId: string; qtyUsed: number; unitCost: number }[];
      outputs: { itemId: string; qtyProduced: number }[];
    };

    const result = await withTx(async (client) => {
      const orderRes = await client.query(
        `INSERT INTO production_orders (order_no, production_date, status, notes)
         VALUES ($1, $2, 'planned', $3)
         RETURNING *`,
        [body.orderNo, body.productionDate, body.notes || null]
      );
      const order = orderRes.rows[0];

      for (const m of body.materials) {
        await client.query(
          `INSERT INTO production_materials
            (production_order_id, item_id, qty_used, unit_cost)
           VALUES ($1, $2, $3, $4)`,
          [order.id, m.itemId, m.qtyUsed, m.unitCost]
        );
      }

      for (const o of body.outputs) {
        await client.query(
          `INSERT INTO production_outputs
            (production_order_id, item_id, qty_produced, unit_cost)
           VALUES ($1, $2, $3, 0)`,
          [order.id, o.itemId, o.qtyProduced]
        );
      }

      return order;
    });

    return { data: result };
  });

  app.put("/orders/:id", async (req) => {
    const orderId = (req.params as { id: string }).id;
    const body = req.body as {
      orderNo: string;
      productionDate: string;
      notes?: string;
      materials: { itemId: string; qtyUsed: number; unitCost: number }[];
      outputs: { itemId: string; qtyProduced: number }[];
    };

    const result = await withTx(async (client) => {
      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1`,
        [orderId]
      );
      if (orderRes.rowCount === 0) throw new Error("Production order not found");
      const order = orderRes.rows[0];
      if (order.status !== "planned") {
        throw new Error("Only planned orders can be edited");
      }

      await client.query(
        `UPDATE production_orders
         SET order_no = $1, production_date = $2, notes = $3
         WHERE id = $4`,
        [body.orderNo, body.productionDate, body.notes || null, orderId]
      );

      await client.query(
        `DELETE FROM production_materials WHERE production_order_id = $1`,
        [orderId]
      );
      await client.query(
        `DELETE FROM production_outputs WHERE production_order_id = $1`,
        [orderId]
      );

      for (const m of body.materials) {
        await client.query(
          `INSERT INTO production_materials
            (production_order_id, item_id, qty_used, unit_cost)
           VALUES ($1, $2, $3, $4)`,
          [orderId, m.itemId, m.qtyUsed, m.unitCost]
        );
      }

      for (const o of body.outputs) {
        await client.query(
          `INSERT INTO production_outputs
            (production_order_id, item_id, qty_produced, unit_cost)
           VALUES ($1, $2, $3, 0)`,
          [orderId, o.itemId, o.qtyProduced]
        );
      }

      const updated = await client.query(
        `SELECT * FROM production_orders WHERE id = $1`,
        [orderId]
      );
      return updated.rows[0];
    });

    return { data: result };
  });

  app.delete("/orders/:id", async (req) => {
    const orderId = (req.params as { id: string }).id;
    await withTx(async (client) => {
      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1`,
        [orderId]
      );
      if (orderRes.rowCount === 0) throw new Error("Production order not found");
      const order = orderRes.rows[0];
      if (order.status !== "planned") {
        throw new Error("Only planned orders can be deleted");
      }
      await client.query(
        `DELETE FROM production_materials WHERE production_order_id = $1`,
        [orderId]
      );
      await client.query(
        `DELETE FROM production_outputs WHERE production_order_id = $1`,
        [orderId]
      );
      await client.query(
        `DELETE FROM production_orders WHERE id = $1`,
        [orderId]
      );
    });
    return { ok: true };
  });

  app.post("/orders/:id/execute", async (req) => {
    const orderId = (req.params as { id: string }).id;
    const body = (req.body || {}) as { entryDate?: string; warehouseId?: string };

    const result = await withTx(async (client) => {
      const orderRes = await client.query(
        `SELECT * FROM production_orders WHERE id = $1`,
        [orderId]
      );
      if (orderRes.rowCount === 0) throw new Error("Production order not found");
      const order = orderRes.rows[0];
      if (order.status === "done") {
        throw new Error("Production order already executed");
      }
      if (!body.warehouseId) {
        throw new Error("warehouseId is required");
      }

      const materialsRes = await client.query(
        `SELECT * FROM production_materials WHERE production_order_id = $1`,
        [orderId]
      );
      const outputsRes = await client.query(
        `SELECT * FROM production_outputs WHERE production_order_id = $1`,
        [orderId]
      );

      let totalCost = 0;
      for (const m of materialsRes.rows) {
        totalCost += Number(m.qty_used) * Number(m.unit_cost);
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
           VALUES ($1, $2, $3, 'out', 'production', $4, $5)`,
          [m.item_id, body.warehouseId, m.qty_used, orderId, m.unit_cost]
        );
      }

      const totalOutputQty = outputsRes.rows.reduce(
        (sum: number, o: any) => sum + Number(o.qty_produced),
        0
      );
      const unitCost = totalOutputQty > 0 ? totalCost / totalOutputQty : 0;

      for (const o of outputsRes.rows) {
        await client.query(
          `UPDATE production_outputs SET unit_cost = $1 WHERE id = $2`,
          [unitCost, o.id]
        );
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
           VALUES ($1, $2, $3, 'in', 'production', $4, $5)`,
          [o.item_id, body.warehouseId, o.qty_produced, orderId, unitCost]
        );
      }

      const entryId = await createJournalEntry(
        client,
        body.entryDate || order.production_date,
        `ترحيل أمر إنتاج ${order.order_no}`,
        "production",
        orderId,
        [
          { accountCode: "1310", debit: totalCost, credit: 0 },
          { accountCode: "1300", debit: 0, credit: totalCost }
        ]
      );

      await client.query(
        `UPDATE production_orders SET status = 'done' WHERE id = $1`,
        [orderId]
      );

      return { orderId, entryId, totalCost, unitCost };
    });

    return { data: result };
  });
}
