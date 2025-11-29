import crypto from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BackupPayload } from '../models';
import { db } from '../repositories/inMemoryDatabase';

export class BackupService {
  exportJSON(password?: string) {
    const payload: BackupPayload = db.snapshot();
    const json = JSON.stringify(payload, null, 2);
    if (!password) return json;
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(password).digest();
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    return JSON.stringify({ iv: iv.toString('hex'), data: encrypted.toString('hex') });
  }

  importJSON(payload: string, password?: string) {
    let json = payload;
    try {
      const parsed = JSON.parse(payload);
      if (parsed && parsed.iv && parsed.data && password) {
        const key = crypto.createHash('sha256').update(password).digest();
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, Buffer.from(parsed.iv, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(parsed.data, 'hex')), decipher.final()]);
        json = decrypted.toString('utf8');
      }
    } catch (err) {
      if (password) {
        throw new Error('فك التشفير فشل، تأكد من كلمة المرور');
      }
    }
    const restored: BackupPayload = JSON.parse(json);
    db.reset(restored);
    return restored;
  }

  exportSQLite(fileName = 'clinic-ledger.sqlite.sql') {
    const base = process.env.DATA_DIR || join(process.cwd(), 'backups');
    mkdirSync(base, { recursive: true });
    const filePath = join(base, fileName);
    const snapshot = db.snapshot();
    const schema = this.buildSchema();
    const inserts = this.buildInserts(snapshot);
    const sql = `${schema}\n\n${inserts}`;
    writeFileSync(filePath, sql, 'utf-8');
    return filePath;
  }

  private buildSchema() {
    return `-- Clinic accounting snapshot\n` +
      `CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, code TEXT, name TEXT, type TEXT, parent_id TEXT, opening_balance_yer INTEGER);\n` +
      `CREATE TABLE IF NOT EXISTS journal_entries(id TEXT PRIMARY KEY, ts TEXT, description TEXT, closed_period BOOLEAN, posted_by TEXT);\n` +
      `CREATE TABLE IF NOT EXISTS journal_lines(entry_id TEXT, account_id TEXT, debit_yer INTEGER, credit_yer INTEGER, ref TEXT);\n` +
      `CREATE TABLE IF NOT EXISTS patients(id TEXT PRIMARY KEY, full_name_ar TEXT, phone TEXT);\n` +
      `CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY, patient_id TEXT, date TEXT, total_yer INTEGER, paid_yer INTEGER, status TEXT);\n` +
      `CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY, invoice_id TEXT, date TEXT, amount_yer INTEGER, method TEXT, ref TEXT, created_by TEXT, voided BOOLEAN);\n` +
      `CREATE TABLE IF NOT EXISTS payment_vouchers(id TEXT PRIMARY KEY, date TEXT, amount_yer INTEGER, payee TEXT, reason TEXT, created_by TEXT, voided BOOLEAN);\n`;
  }

  private buildInserts(snapshot: BackupPayload) {
    const lines: string[] = [];
    snapshot.accounts.forEach((a) =>
      lines.push(`INSERT INTO accounts(id, code, name, type, parent_id, opening_balance_yer) VALUES ('${a.id}','${a.code}','${a.name}','${a.type}',${a.parent_id ? `'${a.parent_id}'` : 'NULL'},${a.opening_balance_yer || 0});`)
    );
    snapshot.journalEntries.forEach((e) => {
      lines.push(`INSERT INTO journal_entries(id, ts, description, closed_period, posted_by) VALUES ('${e.id}','${e.ts}','${e.description || ''}',${e.closed_period ? 1 : 0},'${e.posted_by || ''}');`);
      e.lines.forEach((l) =>
        lines.push(`INSERT INTO journal_lines(entry_id, account_id, debit_yer, credit_yer, ref) VALUES ('${e.id}','${l.account_id}',${l.debit_yer || 0},${l.credit_yer || 0},'${l.ref || ''}');`)
      );
    });
    snapshot.patients.forEach((p) =>
      lines.push(`INSERT INTO patients(id, full_name_ar, phone) VALUES ('${p.id}','${p.full_name_ar}','${p.phone || ''}');`)
    );
    snapshot.invoices.forEach((i) =>
      lines.push(`INSERT INTO invoices(id, patient_id, date, total_yer, paid_yer, status) VALUES ('${i.id}','${i.patient_id}','${i.date}',${i.total_yer},${i.paid_yer},'${i.status}');`)
    );
    snapshot.receipts.forEach((r) =>
      lines.push(`INSERT INTO receipts(id, invoice_id, date, amount_yer, method, ref, created_by, voided) VALUES ('${r.id}',${r.invoice_id ? `'${r.invoice_id}'` : 'NULL'},'${r.date}',${r.amount_yer},'${r.method}','${r.ref || ''}','${r.created_by}','${r.voided ? 1 : 0}');`)
    );
    snapshot.paymentVouchers.forEach((v) =>
      lines.push(`INSERT INTO payment_vouchers(id, date, amount_yer, payee, reason, created_by, voided) VALUES ('${v.id}','${v.date}',${v.amount_yer},'${v.payee}','${v.reason}','${v.created_by}',${v.voided ? 1 : 0});`)
    );
    return lines.join('\n');
  }
}

export const backupService = new BackupService();
