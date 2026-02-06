import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

const defaultPermissions = [
  { code: "ALL_ACCESS", description: "وصول كامل للنظام" },
  { code: "ACCOUNTING_VIEW", description: "عرض المحاسبة" },
  { code: "ACCOUNTING_POST", description: "ترحيل القيود" },
  { code: "INVENTORY_MANAGE", description: "إدارة المخزون" },
  { code: "SALES_MANAGE", description: "إدارة المبيعات" },
  { code: "PURCHASES_MANAGE", description: "إدارة المشتريات" },
  { code: "PRODUCTION_MANAGE", description: "إدارة الإنتاج" },
  { code: "DISTRIBUTION_MANAGE", description: "إدارة العهدة" },
  { code: "CRM_MANAGE", description: "إدارة العملاء والموردين" },
  { code: "REPORTS_VIEW", description: "عرض التقارير" },
  { code: "MESSAGES_MANAGE", description: "إدارة الرسائل" },
];

const defaultRoles = [
  {
    name: "Admin",
    description: "مدير النظام",
    permissions: ["ALL_ACCESS"],
  },
  {
    name: "Accountant",
    description: "محاسب",
    permissions: ["ACCOUNTING_VIEW", "ACCOUNTING_POST", "REPORTS_VIEW"],
  },
  {
    name: "Store Keeper",
    description: "أمين مخزن",
    permissions: ["INVENTORY_MANAGE", "REPORTS_VIEW"],
  },
  {
    name: "Sales",
    description: "مسؤول مبيعات",
    permissions: ["SALES_MANAGE", "CRM_MANAGE", "REPORTS_VIEW"],
  },
  {
    name: "Production Manager",
    description: "مدير إنتاج",
    permissions: ["PRODUCTION_MANAGE", "INVENTORY_MANAGE", "REPORTS_VIEW"],
  },
  {
    name: "Delivery Supervisor",
    description: "مشرف توزيع",
    permissions: ["DISTRIBUTION_MANAGE", "REPORTS_VIEW"],
  },
];

const defaultUsers = [
  { full_name: "مدير النظام", email: "admin@juice.local", role: "Admin" },
  { full_name: "محاسب", email: "accountant@juice.local", role: "Accountant" },
  { full_name: "أمين مخزن", email: "storekeeper@juice.local", role: "Store Keeper" },
  { full_name: "مسؤول مبيعات", email: "sales@juice.local", role: "Sales" },
  { full_name: "مدير إنتاج", email: "production@juice.local", role: "Production Manager" },
  { full_name: "مشرف توزيع", email: "delivery@juice.local", role: "Delivery Supervisor" },
];

export async function teamsRoutes(app: FastifyInstance) {
  app.get("/permissions", async () => {
    const res = await pool.query("SELECT * FROM permissions ORDER BY code");
    return { data: res.rows };
  });

  app.get("/roles", async () => {
    const res = await pool.query(
      `SELECT r.id, r.name, r.description,
        COALESCE(array_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       GROUP BY r.id
       ORDER BY r.name`
    );
    const systemNames = new Set(defaultRoles.map((r) => r.name));
    const data = res.rows.map((r: any) => ({
      ...r,
      is_system: systemNames.has(r.name),
    }));
    return { data };
  });

  app.post("/roles", async (req) => {
    const body = req.body as {
      name: string;
      description?: string;
      permissions?: string[];
    };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const roleRes = await client.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING *`,
        [body.name, body.description || null]
      );
      const role = roleRes.rows[0];

      const perms = body.permissions || [];
      for (const code of perms) {
        await client.query(
          `INSERT INTO permissions (code, description)
           VALUES ($1, $2)
           ON CONFLICT (code) DO NOTHING`,
          [code, code]
        );
        const permRes = await client.query(
          `SELECT id FROM permissions WHERE code = $1`,
          [code]
        );
        const permId = permRes.rows[0]?.id;
        if (permId) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [role.id, permId]
          );
        }
      }

      await client.query("COMMIT");
      return { data: role };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.post("/roles/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as {
      name: string;
      description?: string;
      permissions?: string[];
    };
    const roleRes = await pool.query(`SELECT id, name FROM roles WHERE id = $1`, [id]);
    const role = roleRes.rows[0];
    if (!role) throw new Error("Role not found");
    if (defaultRoles.some((r) => r.name === role.name)) {
      throw new Error("Cannot modify system role");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE roles SET name = $1, description = $2 WHERE id = $3`,
        [body.name, body.description || null, id]
      );
      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
      const perms = body.permissions || [];
      for (const code of perms) {
        await client.query(
          `INSERT INTO permissions (code, description)
           VALUES ($1, $2)
           ON CONFLICT (code) DO NOTHING`,
          [code, code]
        );
        const permRes = await client.query(`SELECT id FROM permissions WHERE code = $1`, [code]);
        const permId = permRes.rows[0]?.id;
        if (permId) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, permId]
          );
        }
      }
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.delete("/roles/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const roleRes = await pool.query(`SELECT id, name FROM roles WHERE id = $1`, [id]);
    const role = roleRes.rows[0];
    if (!role) throw new Error("Role not found");
    if (defaultRoles.some((r) => r.name === role.name)) {
      throw new Error("Cannot delete system role");
    }
    await pool.query(`DELETE FROM roles WHERE id = $1`, [id]);
    return { ok: true };
  });

  app.get("/users", async () => {
    const res = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active,
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles,
        (array_agg(r.id) FILTER (WHERE r.id IS NOT NULL))[1] as role_id
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    const systemEmails = new Set(defaultUsers.map((u) => u.email));
    const data = res.rows.map((u: any) => ({
      ...u,
      is_system: systemEmails.has(u.email),
    }));
    return { data };
  });

  app.post("/users", async (req) => {
    const body = req.body as {
      fullName: string;
      email: string;
      phone?: string | null;
      roleId: string;
    };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRes = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [body.fullName, body.email, body.phone || null, "hashed"]
      );
      const user = userRes.rows[0];
      if (body.roleId) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [user.id, body.roleId]
        );
      }
      await client.query("COMMIT");
      return { data: user };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.post("/users/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const body = req.body as {
      fullName: string;
      email: string;
      phone?: string | null;
      roleId: string;
      isActive?: boolean;
    };
    const userRes = await pool.query(`SELECT id, email FROM users WHERE id = $1`, [id]);
    const user = userRes.rows[0];
    if (!user) throw new Error("User not found");
    if (defaultUsers.some((u) => u.email === user.email)) {
      throw new Error("Cannot modify system user");
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE users SET full_name = $1, email = $2, phone = $3, is_active = $4 WHERE id = $5`,
        [body.fullName, body.email, body.phone || null, body.isActive !== false, id]
      );
      await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
      if (body.roleId) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [id, body.roleId]
        );
      }
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.delete("/users/:id", async (req) => {
    const id = (req.params as { id: string }).id;
    const userRes = await pool.query(`SELECT id, email FROM users WHERE id = $1`, [id]);
    const user = userRes.rows[0];
    if (!user) throw new Error("User not found");
    if (defaultUsers.some((u) => u.email === user.email)) {
      throw new Error("Cannot delete system user");
    }
    const res = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
    if (res.rowCount === 0) throw new Error("User not found");
    return { ok: true };
  });

  app.post("/seed", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const perm of defaultPermissions) {
        await client.query(
          `INSERT INTO permissions (code, description)
           VALUES ($1, $2)
           ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description`,
          [perm.code, perm.description]
        );
      }

      for (const role of defaultRoles) {
        const roleRes = await client.query(
          `INSERT INTO roles (name, description)
           VALUES ($1, $2)
           ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
           RETURNING id`,
          [role.name, role.description]
        );
        const roleId = roleRes.rows[0]?.id;
        if (!roleId) continue;

        for (const code of role.permissions) {
          const permRes = await client.query(`SELECT id FROM permissions WHERE code = $1`, [code]);
          const permId = permRes.rows[0]?.id;
          if (permId) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [roleId, permId]
            );
          }
        }
      }

      for (const user of defaultUsers) {
        const userRes = await client.query(
          `INSERT INTO users (full_name, email, phone, password_hash)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [user.full_name, user.email, null, "hashed"]
        );
        const userId = userRes.rows[0]?.id;
        if (!userId) continue;
        const roleRes = await client.query(`SELECT id FROM roles WHERE name = $1`, [user.role]);
        const roleId = roleRes.rows[0]?.id;
        if (roleId) {
          await client.query(
            `INSERT INTO user_roles (user_id, role_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userId, roleId]
          );
        }
      }

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
