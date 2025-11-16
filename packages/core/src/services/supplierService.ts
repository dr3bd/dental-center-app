import { Supplier } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { auditService } from './auditService';

export class SupplierService {
  list(activeOnly = false) {
    const records = db.table('suppliers');
    return activeOnly ? records.filter((supplier) => supplier.active) : records;
  }

  add(supplier: Omit<Supplier, 'id'>) {
    const newSupplier: Supplier = { ...supplier, id: `sup-${Date.now()}` };
    db.table('suppliers').push(newSupplier);
    auditService.log('system', 'create', 'supplier', newSupplier.id, newSupplier);
    return newSupplier;
  }

  toggleActive(id: string, active: boolean) {
    const supplier = db.table('suppliers').find((s) => s.id === id);
    if (!supplier) throw new Error('المورّد غير موجود');
    supplier.active = active;
    auditService.log('system', 'update', 'supplier', id, { active });
    return supplier;
  }
}

export const supplierService = new SupplierService();
