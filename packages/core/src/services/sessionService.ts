import { Session } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';
import { inventoryService } from './inventoryService';

export class SessionService {
  create(session: Omit<Session, 'id'>) {
    ensureYer(session.feeYer);
    const newSession: Session = { ...session, id: `ses-${Date.now()}` };
    db.table('sessions').push(newSession);
    auditService.log('system', 'create', 'session', newSession.id, newSession);
    return newSession;
  }

  update(id: string, patch: Partial<Session>) {
    const sessions = db.table('sessions');
    const existing = sessions.find((s) => s.id === id);
    if (!existing) throw new Error('الجلسة غير موجودة');
    const updated = { ...existing, ...patch };
    if (typeof updated.feeYer === 'number') ensureYer(updated.feeYer);
    db.upsert('sessions', updated, (s) => s.id === id);
    auditService.log('system', 'update', 'session', id, patch);
    return updated;
  }

  linkMaterials(sessionId: string, materialsJson: string) {
    try {
      const parsed: { itemId: string; qty: number }[] = JSON.parse(materialsJson);
      parsed.forEach((entry) => {
        if (entry.itemId && entry.qty) {
          inventoryService.consume(entry.itemId, entry.qty);
        }
      });
    } catch (error) {
      throw new Error('صيغة المواد غير صحيحة');
    }
    return this.update(sessionId, { materialsJson });
  }

  generateInvoice(session: Session) {
    return {
      patientId: session.patientId,
      totalYer: session.feeYer,
      linkedSessionId: session.id
    };
  }
}

export const sessionService = new SessionService();
