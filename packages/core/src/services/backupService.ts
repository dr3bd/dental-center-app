import crypto from 'crypto';
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

  exportSQLitePlaceholder() {
    return 'SQLite export متاح في تطبيق سطح المكتب فقط';
  }
}

export const backupService = new BackupService();
