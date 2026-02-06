import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function crmRoutes(app: FastifyInstance) {
  app.get("/customers", async () => {
    const res = await pool.query("SELECT * FROM customers ORDER BY name");
    return { data: res.rows };
  });

  app.post("/customers", async (req) => {
    const body = req.body as {
      code: string;
      name: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
    };
    const res = await pool.query(
      `INSERT INTO customers (code, name, phone, address, credit_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [body.code, body.name, body.phone || null, body.address || null, body.creditLimit || 0]
    );
    return { data: res.rows[0] };
  });

  app.post("/customers/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as {
      code: string;
      name: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
    };
    const res = await pool.query(
      `UPDATE customers
       SET code = $1, name = $2, phone = $3, address = $4, credit_limit = $5
       WHERE id = $6
       RETURNING *`,
      [body.code, body.name, body.phone || null, body.address || null, body.creditLimit || 0, id]
    );
    if (res.rowCount === 0) throw new Error("Customer not found");
    return { data: res.rows[0] };
  });

  app.delete("/customers/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const res = await pool.query(`DELETE FROM customers WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) throw new Error("Customer not found");
    return { ok: true };
  });

  app.get("/suppliers", async () => {
    const res = await pool.query("SELECT * FROM suppliers ORDER BY name");
    return { data: res.rows };
  });

  app.post("/suppliers", async (req) => {
    const body = req.body as {
      code: string;
      name: string;
      phone?: string;
      address?: string;
    };
    const res = await pool.query(
      `INSERT INTO suppliers (code, name, phone, address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [body.code, body.name, body.phone || null, body.address || null]
    );
    return { data: res.rows[0] };
  });

  app.post("/suppliers/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as {
      code: string;
      name: string;
      phone?: string;
      address?: string;
    };
    const res = await pool.query(
      `UPDATE suppliers
       SET code = $1, name = $2, phone = $3, address = $4
       WHERE id = $5
       RETURNING *`,
      [body.code, body.name, body.phone || null, body.address || null, id]
    );
    if (res.rowCount === 0) throw new Error("Supplier not found");
    return { data: res.rows[0] };
  });

  app.delete("/suppliers/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const res = await pool.query(`DELETE FROM suppliers WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) throw new Error("Supplier not found");
    return { ok: true };
  });
}
