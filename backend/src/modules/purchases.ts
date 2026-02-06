import { FastifyInstance } from "fastify";
import { pool, withTx } from "../db.js";
import { createJournalEntry } from "../accountingEngine.js";

export async function purchasesRoutes(app: FastifyInstance) {
  app.get("/invoices", async () => {
    const res = await pool.query(
      `SELECT pi.*, s.name as supplier_name
       FROM purchase_invoices pi
       LEFT JOIN suppliers s ON s.id = pi.supplier_id
       ORDER BY pi.invoice_date DESC`
    );
    return { data: res.rows };
  });

  app.get("/invoices/:id", async (req) => {
    const invoiceId = (req.params as { id: string }).id;
    const invRes = await pool.query(
      `SELECT * FROM purchase_invoices WHERE id = $1`,
      [invoiceId]
    );
    if (invRes.rowCount === 0) throw new Error("Invoice not found");
    const itemsRes = await pool.query(
      `SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = $1`,
      [invoiceId]
    );
    return { data: { invoice: invRes.rows[0], items: itemsRes.rows } };
  });

  app.post("/invoices", async (req) => {
    const body = req.body as {
      invoiceNo: string;
      supplierId?: string | null;
      invoiceDate: string;
      notes?: string;
      items: {
        itemId: string;
        warehouseId: string;
        qty: number;
        unitPrice: number;
      }[];
    };
    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0
    );

    const result = await withTx(async (client) => {
      const invRes = await client.query(
        `INSERT INTO purchase_invoices
          (invoice_no, supplier_id, invoice_date, status, total_amount, notes)
         VALUES ($1, $2, $3, 'draft', $4, $5)
         RETURNING *`,
        [body.invoiceNo, body.supplierId || null, body.invoiceDate, totalAmount, body.notes || null]
      );
      const invoice = invRes.rows[0];

      for (const line of body.items) {
        const lineTotal = line.qty * line.unitPrice;
        await client.query(
          `INSERT INTO purchase_invoice_items
            (purchase_invoice_id, item_id, warehouse_id, qty, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoice.id, line.itemId, line.warehouseId, line.qty, line.unitPrice, lineTotal]
        );
      }

      return invoice;
    });

    return { data: result };
  });

  app.put("/invoices/:id", async (req) => {
    const invoiceId = (req.params as { id: string }).id;
    const body = req.body as {
      invoiceNo: string;
      supplierId?: string | null;
      invoiceDate: string;
      notes?: string;
      items: {
        itemId: string;
        warehouseId: string;
        qty: number;
        unitPrice: number;
      }[];
    };
    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0
    );

    const result = await withTx(async (client) => {
      const invRes = await client.query(
        `SELECT * FROM purchase_invoices WHERE id = $1`,
        [invoiceId]
      );
      if (invRes.rowCount === 0) throw new Error("Invoice not found");
      const invoice = invRes.rows[0];
      if (invoice.status !== "draft") {
        throw new Error("Only draft invoices can be edited");
      }

      await client.query(
        `UPDATE purchase_invoices
         SET invoice_no = $1, supplier_id = $2, invoice_date = $3, total_amount = $4, notes = $5
         WHERE id = $6`,
        [body.invoiceNo, body.supplierId || null, body.invoiceDate, totalAmount, body.notes || null, invoiceId]
      );

      await client.query(
        `DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = $1`,
        [invoiceId]
      );

      for (const line of body.items) {
        const lineTotal = line.qty * line.unitPrice;
        await client.query(
          `INSERT INTO purchase_invoice_items
            (purchase_invoice_id, item_id, warehouse_id, qty, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoiceId, line.itemId, line.warehouseId, line.qty, line.unitPrice, lineTotal]
        );
      }

      const updated = await client.query(
        `SELECT * FROM purchase_invoices WHERE id = $1`,
        [invoiceId]
      );
      return updated.rows[0];
    });

    return { data: result };
  });

  app.delete("/invoices/:id", async (req) => {
    const invoiceId = (req.params as { id: string }).id;
    await withTx(async (client) => {
      const invRes = await client.query(
        `SELECT * FROM purchase_invoices WHERE id = $1`,
        [invoiceId]
      );
      if (invRes.rowCount === 0) throw new Error("Invoice not found");
      const invoice = invRes.rows[0];
      if (invoice.status !== "draft") {
        throw new Error("Only draft invoices can be deleted");
      }
      await client.query(
        `DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = $1`,
        [invoiceId]
      );
      await client.query(
        `DELETE FROM purchase_invoices WHERE id = $1`,
        [invoiceId]
      );
    });
    return { ok: true };
  });

  app.post("/invoices/:id/post", async (req) => {
    const invoiceId = (req.params as { id: string }).id;
    const body = (req.body || {}) as { entryDate?: string };

    const result = await withTx(async (client) => {
      const invRes = await client.query(
        `SELECT * FROM purchase_invoices WHERE id = $1`,
        [invoiceId]
      );
      if (invRes.rowCount === 0) throw new Error("Invoice not found");
      const invoice = invRes.rows[0];
      if (invoice.status === "posted") {
        throw new Error("Invoice already posted");
      }
      if (Number(invoice.total_amount) <= 0) {
        throw new Error("Invoice total must be greater than zero");
      }

      const linesRes = await client.query(
        `SELECT pii.*, i.type as item_type
         FROM purchase_invoice_items pii
         JOIN items i ON i.id = pii.item_id
         WHERE pii.purchase_invoice_id = $1`,
        [invoiceId]
      );

      for (const line of linesRes.rows) {
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id, unit_cost)
           VALUES ($1, $2, $3, 'in', 'purchase_invoice', $4, $5)`,
          [line.item_id, line.warehouse_id, line.qty, invoiceId, line.unit_price]
        );
      }

      const totalRaw = linesRes.rows
        .filter((l: any) => l.item_type === "raw")
        .reduce((sum: number, l: any) => sum + Number(l.line_total), 0);
      const totalFinished = linesRes.rows
        .filter((l: any) => l.item_type === "finished")
        .reduce((sum: number, l: any) => sum + Number(l.line_total), 0);

      const journalLines = [
        { accountCode: "2100", debit: 0, credit: Number(invoice.total_amount) }
      ];
      if (totalRaw > 0) journalLines.push({ accountCode: "1300", debit: totalRaw, credit: 0 });
      if (totalFinished > 0) journalLines.push({ accountCode: "1310", debit: totalFinished, credit: 0 });

      const entryId = await createJournalEntry(
        client,
        body.entryDate || invoice.invoice_date,
        `ترحيل فاتورة مشتريات ${invoice.invoice_no}`,
        "purchase_invoice",
        invoiceId,
        journalLines
      );

      await client.query(
        `UPDATE purchase_invoices SET status = 'posted' WHERE id = $1`,
        [invoiceId]
      );

      return { invoiceId, entryId };
    });

    return { data: result };
  });
}
