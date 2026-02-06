import { FastifyInstance } from "fastify";
import { pool, withTx } from "../db.js";
import { createJournalEntry } from "../accountingEngine.js";
import { getWeightedAvgUnitCost } from "../inventoryCost.js";

export async function salesRoutes(app: FastifyInstance) {
  app.get("/invoices", async () => {
    const res = await pool.query(
      `SELECT si.*, c.name as customer_name
       FROM sales_invoices si
       LEFT JOIN customers c ON c.id = si.customer_id
       ORDER BY si.invoice_date DESC`
    );
    return { data: res.rows };
  });

  app.post("/invoices", async (req) => {
    const body = req.body as {
      invoiceNo: string;
      customerId?: string | null;
      invoiceDate: string;
      notes?: string;
      items: {
        itemId: string;
        warehouseId: string;
        qty: number;
        unitPrice: number;
        unitCost?: number;
      }[];
    };
    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0
    );

    const result = await withTx(async (client) => {
      const invRes = await client.query(
        `INSERT INTO sales_invoices
          (invoice_no, customer_id, invoice_date, status, total_amount, notes)
         VALUES ($1, $2, $3, 'draft', $4, $5)
         RETURNING *`,
        [body.invoiceNo, body.customerId || null, body.invoiceDate, totalAmount, body.notes || null]
      );
      const invoice = invRes.rows[0];

      for (const line of body.items) {
        const lineTotal = line.qty * line.unitPrice;
        await client.query(
          `INSERT INTO sales_invoice_items
            (sales_invoice_id, item_id, warehouse_id, qty, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoice.id, line.itemId, line.warehouseId, line.qty, line.unitPrice, lineTotal]
        );
      }

      return invoice;
    });

    return { data: result };
  });

  app.post("/invoices/:id/post", async (req) => {
    const invoiceId = (req.params as { id: string }).id;
    const body = (req.body || {}) as {
      entryDate?: string;
      itemsCost?: { itemId: string; unitCost: number }[];
    };

    const result = await withTx(async (client) => {
      const invRes = await client.query(
        `SELECT * FROM sales_invoices WHERE id = $1`,
        [invoiceId]
      );
      if (invRes.rowCount === 0) throw new Error("Invoice not found");
      const invoice = invRes.rows[0];
      if (invoice.status === "posted") {
        throw new Error("Invoice already posted");
      }

      const linesRes = await client.query(
        `SELECT * FROM sales_invoice_items WHERE sales_invoice_id = $1`,
        [invoiceId]
      );

      for (const line of linesRes.rows) {
        await client.query(
          `INSERT INTO inventory_movements
            (item_id, warehouse_id, qty, direction, source_type, source_id)
           VALUES ($1, $2, $3, 'out', 'sales_invoice', $4)`,
          [line.item_id, line.warehouse_id, line.qty, invoiceId]
        );
      }

      const itemsCostMap = new Map<string, number>();
      for (const c of body.itemsCost || []) {
        itemsCostMap.set(c.itemId, c.unitCost);
      }

      let cogsTotal = 0;
      for (const line of linesRes.rows) {
        const overridden = itemsCostMap.get(line.item_id);
        const unitCost =
          typeof overridden === "number"
            ? overridden
            : await getWeightedAvgUnitCost(client, line.item_id, line.warehouse_id);
        cogsTotal += unitCost * Number(line.qty);
      }

      const entryId = await createJournalEntry(
        client,
        body.entryDate || invoice.invoice_date,
        `ترحيل فاتورة مبيعات ${invoice.invoice_no}`,
        "sales_invoice",
        invoiceId,
        [
          { accountCode: "1200", debit: Number(invoice.total_amount), credit: 0 },
          { accountCode: "4100", debit: 0, credit: Number(invoice.total_amount) },
          { accountCode: "5100", debit: cogsTotal, credit: 0 },
          { accountCode: "1310", debit: 0, credit: cogsTotal }
        ]
      );

      await client.query(
        `UPDATE sales_invoices SET status = 'posted' WHERE id = $1`,
        [invoiceId]
      );

      return { invoiceId, entryId };
    });

    return { data: result };
  });

  app.get("/returns", async () => {
    const res = await pool.query(
      `SELECT * FROM sales_returns ORDER BY return_date DESC`
    );
    return { data: res.rows };
  });

  app.post("/returns", async (req) => {
    const body = req.body as {
      returnNo: string;
      salesInvoiceId?: string | null;
      returnDate: string;
      totalAmount: number;
    };
    const res = await pool.query(
      `INSERT INTO sales_returns (return_no, sales_invoice_id, return_date, total_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [body.returnNo, body.salesInvoiceId || null, body.returnDate, body.totalAmount]
    );
    return { data: res.rows[0] };
  });
}
