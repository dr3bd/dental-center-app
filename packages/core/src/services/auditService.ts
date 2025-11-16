import { AuditLogEntry } from '../models';
import { db } from '../repositories/inMemoryDatabase';

export class AuditService {
  log(user: string, action: string, entity: string, entityId: string, delta: Record<string, unknown>) {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      user,
      action,
      entity,
      entityId,
      deltaJson: JSON.stringify(delta)
    };
    db.table('auditLog').push(entry);
  }

  list() {
    return db.table('auditLog');
  }
}

export const auditService = new AuditService();
