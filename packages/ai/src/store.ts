import { DatabaseSync } from "node:sqlite";

// ponytail: SQLite nativo atende ao benchmark em uma máquina, com transação entre processos.
// Limite: não é orçamento distribuído. Produção com contas usará PostgreSQL e autorização.
export class LocalBudgetStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS budget(day TEXT PRIMARY KEY, calls INTEGER NOT NULL, bytes INTEGER NOT NULL, output_tokens INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL);`);
  }
  reserve(day: string, bytes: number) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isSafeInteger(bytes) ||
      bytes < 1 ||
      bytes > 12_000
    )
      throw new Error("Reserva inválida.");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT OR IGNORE INTO budget VALUES (?,0,0,0)").run(day);
      const result = this.db
        .prepare(
          "UPDATE budget SET calls=calls+1, bytes=bytes+?, output_tokens=output_tokens+512 WHERE day=? AND calls<10 AND bytes+?<=120000 AND output_tokens+512<=5120",
        )
        .run(bytes, day, bytes);
      if (result.changes !== 1)
        throw new Error(
          "Limite diário local atingido. Nenhuma chamada foi iniciada.",
        );
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  get(key: string, now: number): unknown | undefined {
    const row = this.db
      .prepare("SELECT payload FROM cache WHERE key=? AND expires>?")
      .get(key, now);
    return row ? JSON.parse(String(row.payload)) : undefined;
  }
  put(key: string, payload: unknown, now: number) {
    this.db.prepare("DELETE FROM cache WHERE expires<=?").run(now);
    this.db
      .prepare("INSERT OR REPLACE INTO cache VALUES (?,?,?)")
      .run(key, JSON.stringify(payload), now + 86_400_000);
  }
  usage(day: string) {
    return (
      this.db
        .prepare("SELECT calls,bytes,output_tokens FROM budget WHERE day=?")
        .get(day) ?? { calls: 0, bytes: 0, output_tokens: 0 }
    );
  }
  close() {
    this.db.close();
  }
}
