import { LabOrder } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';

export class LabService {
  createOrder(order: Omit<LabOrder, 'id' | 'status'> & { status?: LabOrder['status'] }) {
    ensureYer(order.costYer);
    const newOrder: LabOrder = { ...order, id: `lab-${Date.now()}`, status: order.status ?? 'pending' };
    db.table('labOrders').push(newOrder);
    auditService.log('system', 'create', 'labOrder', newOrder.id, newOrder);
    return newOrder;
  }

  updateStatus(id: string, status: LabOrder['status']) {
    const order = db.table('labOrders').find((l) => l.id === id);
    if (!order) throw new Error('طلب المعمل غير موجود');
    order.status = status;
    auditService.log('system', 'update', 'labOrder', id, { status });
    return order;
  }

  listByPatient(patientId: string) {
    return db.table('labOrders').filter((l) => l.patientId === patientId);
  }

  list() {
    return db.table('labOrders');
  }
}

export const labService = new LabService();
