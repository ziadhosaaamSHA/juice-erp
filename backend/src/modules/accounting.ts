import { FastifyInstance } from "fastify";
import { pool, withTx } from "../db.js";
import { createJournalEntry } from "../accountingEngine.js";

export async function accountingRoutes(app: FastifyInstance) {
  app.get("/accounts", async () => {
    const res = await pool.query("SELECT * FROM accounts ORDER BY code");
    return { data: res.rows };
  });

  app.post("/accounts", async (req) => {
    const body = req.body as {
      code: string;
      name: string;
      type: string;
      parentId?: string | null;
    };
    const res = await pool.query(
      `INSERT INTO accounts (code, name, type, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [body.code, body.name, body.type, body.parentId || null]
    );
    return { data: res.rows[0] };
  });

  app.get("/journal-entries", async () => {
    const res = await pool.query(
      `SELECT
         je.id as journal_entry_id,
         je.entry_date,
         je.description,
         je.source_type,
         je.source_id,
         jl.id as journal_line_id,
         jl.debit,
         jl.credit,
         jl.line_note,
         a.code as account_code,
         a.name as account_name
       FROM journal_entries je
       LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
       LEFT JOIN accounts a ON a.id = jl.account_id
       ORDER BY je.entry_date DESC, je.created_at DESC`
    );
    return { data: res.rows };
  });

  app.post("/journal-entries", async (req) => {
    const body = req.body as {
      entryDate: string;
      description: string;
      sourceType: string;
      sourceId?: string | null;
      lines: { accountCode: string; debit: number; credit: number; note?: string }[];
    };
    const entryId = await withTx((client) =>
      createJournalEntry(
        client,
        body.entryDate,
        body.description,
        body.sourceType,
        body.sourceId || null,
        body.lines
      )
    );
    return { data: { id: entryId } };
  });

  app.post("/opening-capital", async (req) => {
    const body = req.body as {
      entryDate: string;
      amount: number;
      cashAccountCode?: string;
      equityAccountCode?: string;
      note?: string;
    };
    const cashCode = body.cashAccountCode || "1100";
    const equityCode = body.equityAccountCode || "3100";
    const entryId = await withTx((client) =>
      createJournalEntry(
        client,
        body.entryDate,
        body.note || "قيد رأس المال الافتتاحي",
        "opening",
        null,
        [
          { accountCode: cashCode, debit: body.amount, credit: 0 },
          { accountCode: equityCode, debit: 0, credit: body.amount }
        ]
      )
    );
    return { data: { id: entryId } };
  });
}
