import { PoolClient } from "pg";

export async function getWeightedAvgUnitCost(
  client: PoolClient,
  itemId: string,
  warehouseId?: string | null
) {
  // Prefer warehouse-specific costing; fallback to item-wide if not available.
  const queries: { sql: string; params: any[] }[] = [];

  if (warehouseId) {
    queries.push({
      sql: `
        SELECT COALESCE(SUM(qty * unit_cost) / NULLIF(SUM(qty), 0), 0) AS avg_cost
        FROM inventory_movements
        WHERE item_id = $1
          AND warehouse_id = $2
          AND direction = 'in'
          AND unit_cost > 0
      `,
      params: [itemId, warehouseId],
    });
  }

  queries.push({
    sql: `
      SELECT COALESCE(SUM(qty * unit_cost) / NULLIF(SUM(qty), 0), 0) AS avg_cost
      FROM inventory_movements
      WHERE item_id = $1
        AND direction = 'in'
        AND unit_cost > 0
    `,
    params: [itemId],
  });

  for (const q of queries) {
    const res = await client.query(q.sql, q.params);
    const avg = Number(res.rows?.[0]?.avg_cost || 0);
    if (avg > 0) return avg;
  }

  return 0;
}

