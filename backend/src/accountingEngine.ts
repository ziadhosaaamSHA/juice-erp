import { PoolClient } from "pg";

export type JournalLine = {
  accountCode: string;
  debit: number;
  credit: number;
  note?: string;
};

export async function getAccountIdByCode(client: PoolClient, code: string) {
  const res = await client.query("SELECT id FROM accounts WHERE code = $1", [code]);
  if (res.rowCount === 0) {
    throw new Error(`Account code not found: ${code}`);
  }
  return res.rows[0].id as string;
}

export async function createJournalEntry(
  client: PoolClient,
  entryDate: string,
  description: string,
  sourceType: string,
  sourceId: string | null,
  lines: JournalLine[]
) {
  if (!lines || lines.length === 0) {
    throw new Error("Journal entry must have at least one line");
  }

  let debitCents = 0;
  let creditCents = 0;
  for (const line of lines) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    if (debit < 0 || credit < 0) {
      throw new Error("Debit/Credit cannot be negative");
    }
    if (debit > 0 && credit > 0) {
      throw new Error("Journal line cannot have both debit and credit");
    }
    if (debit === 0 && credit === 0) {
      throw new Error("Journal line must have debit or credit");
    }
    debitCents += Math.round(debit * 100);
    creditCents += Math.round(credit * 100);
  }

  if (debitCents !== creditCents) {
    throw new Error(`Journal entry not balanced: debit=${debitCents} credit=${creditCents}`);
  }

  const entryRes = await client.query(
    `INSERT INTO journal_entries (entry_date, description, source_type, source_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [entryDate, description, sourceType, sourceId]
  );
  const entryId = entryRes.rows[0].id as string;

  for (const line of lines) {
    const accountId = await getAccountIdByCode(client, line.accountCode);
    await client.query(
      `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, line_note)
       VALUES ($1, $2, $3, $4, $5)`,
      [entryId, accountId, line.debit, line.credit, line.note || null]
    );
  }

  return entryId;
}
