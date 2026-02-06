import { FastifyInstance } from "fastify";
import { pool, withTx } from "../db.js";
import { getWeightedAvgUnitCost } from "../inventoryCost.js";

export async function distributionRoutes(app: FastifyInstance) {
  app.get("/vehicles", async () => {
    const res = await pool.query("SELECT * FROM vehicles ORDER BY code");
    return { data: res.rows };
  });

  app.post("/vehicles", async (req) => {
    const body = req.body as { code: string; plateNo: string; driverName?: string };
    const res = await pool.query(
      `INSERT INTO vehicles (code, plate_no, driver_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [body.code, body.plateNo, body.driverName || null]
    );
    return { data: res.rows[0] };
  });

  app.post("/vehicles/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as { code: string; plateNo: string; driverName?: string };
    const res = await pool.query(
      `UPDATE vehicles
       SET code = $1, plate_no = $2, driver_name = $3
       WHERE id = $4
       RETURNING *`,
      [body.code, body.plateNo, body.driverName || null, id]
    );
    if (res.rowCount === 0) throw new Error("Vehicle not found");
    return { data: res.rows[0] };
  });

  app.delete("/vehicles/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const res = await pool.query(`DELETE FROM vehicles WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) throw new Error("Vehicle not found");
    return { ok: true };
  });

  app.post("/loads", async (req) => {
    const body = req.body as {
      vehicleId: string;
      itemId: string;
      qty: number;
      sourceWarehouseId: string;
      vehicleWarehouseId: string;
    };
    const result = await withTx(async (client) => {
      const unitCost = await getWeightedAvgUnitCost(
        client,
        body.itemId,
        body.sourceWarehouseId
      );

      // 1. Log Custody Movement
      await client.query(
        `INSERT INTO custody_movements
          (vehicle_id, warehouse_id, item_id, qty, direction, source_type, source_id)
         VALUES ($1, $2, $3, $4, 'load', 'distribution', NULL)`,
        [body.vehicleId, body.vehicleWarehouseId, body.itemId, body.qty]
      );

      // 2. Reduce from Source Warehouse (OUT)
      await client.query(
        `INSERT INTO inventory_movements
          (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
         VALUES ($1, $2, $3, 'out', 'distribution', NULL, $4)`,
        [body.itemId, body.sourceWarehouseId, body.qty, unitCost]
      );

      // 3. Add to Vehicle Warehouse (IN)
      await client.query(
        `INSERT INTO inventory_movements
          (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
         VALUES ($1, $2, $3, 'in', 'distribution', NULL, $4)`,
        [body.itemId, body.vehicleWarehouseId, body.qty, unitCost]
      );

      return { ok: true };
    });
    return { data: result };
  });

  app.post("/settlements", async (req) => {
    const body = req.body as {
      vehicleId: string;
      itemId: string;
      qtyReturn: number;
      qtySold: number;
      vehicleWarehouseId: string;
      mainWarehouseId: string;
    };

    const result = await withTx(async (client) => {
      // Handle Returns
      if (body.qtyReturn > 0) {
        const unitCost = await getWeightedAvgUnitCost(
          client,
          body.itemId,
          body.vehicleWarehouseId
        );

        // Log Custody
        await client.query(
          `INSERT INTO custody_movements
            (vehicle_id, warehouse_id, item_id, qty, direction, source_type, source_id)
           VALUES ($1, $2, $3, $4, 'return', 'distribution', NULL)`,
          [body.vehicleId, body.vehicleWarehouseId, body.itemId, body.qtyReturn]
        );

        // Remove from Vehicle (OUT)
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
           VALUES ($1, $2, $3, 'out', 'distribution', NULL, $4)`,
          [body.itemId, body.vehicleWarehouseId, body.qtyReturn, unitCost]
        );

        // Add to Main Warehouse (IN)
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
           VALUES ($1, $2, $3, 'in', 'distribution', NULL, $4)`,
          [body.itemId, body.mainWarehouseId, body.qtyReturn, unitCost]
        );
      }

      // Handle Sales
      if (body.qtySold > 0) {
        const unitCost = await getWeightedAvgUnitCost(
          client,
          body.itemId,
          body.vehicleWarehouseId
        );

        // Log Custody
        await client.query(
          `INSERT INTO custody_movements
            (vehicle_id, warehouse_id, item_id, qty, direction, source_type, source_id)
           VALUES ($1, $2, $3, $4, 'sold', 'distribution', NULL)`,
          [body.vehicleId, body.vehicleWarehouseId, body.itemId, body.qtySold]
        );

        // Remove from Vehicle (OUT) - Was missing!
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
           VALUES ($1, $2, $3, 'out', 'distribution_sold', NULL, $4)`,
          [body.itemId, body.vehicleWarehouseId, body.qtySold, unitCost]
        );
      }

      return { ok: true };
    });
    return { data: result };
  });
}
