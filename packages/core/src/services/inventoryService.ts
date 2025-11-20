import { InventoryBatch, InventoryItem } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';
import { accountingService } from './accountingService';

export class InventoryService {
  addItem(item: Omit<InventoryItem, 'id'>) {
    const newItem: InventoryItem = { ...item, id: `item-${Date.now()}` };
    db.table('inventoryItems').push(newItem);
    auditService.log('system', 'create', 'inventoryItem', newItem.id, newItem);
    return newItem;
  }

  addBatch(batch: Omit<InventoryBatch, 'id' | 'qtyOut' | 'createdAt'>) {
    ensureYer(batch.costYer);
    const newBatch: InventoryBatch = {
      ...batch,
      id: `batch-${Date.now()}`,
      qtyOut: 0,
      createdAt: new Date().toISOString()
    };
    db.table('inventoryBatches').push(newBatch);
    accountingService.postInventoryPurchase(newBatch.costYer);
    auditService.log('system', 'create', 'inventoryBatch', newBatch.id, newBatch);
    return newBatch;
  }

  consume(itemId: string, qty: number) {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('كمية الاستهلاك يجب أن تكون عددًا صحيحًا موجبًا');
    }
    const batches = db.table('inventoryBatches').filter((b) => b.itemId === itemId);
    if (batches.length === 0) throw new Error('لا توجد دفعات للمادة');
    let remaining = qty;
    let costUsed = 0;
    for (const batch of batches) {
      const available = batch.qtyIn - batch.qtyOut;
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      batch.qtyOut += take;
      const unitCost = batch.costYer / batch.qtyIn;
      costUsed += Math.round(unitCost * take);
      remaining -= take;
      if (remaining === 0) break;
    }
    if (remaining > 0) {
      throw new Error('المخزون غير كافٍ');
    }
    auditService.log('system', 'update', 'inventoryBatch', itemId, { consumed: qty });
    return costUsed;
  }

  listItems() {
    return db.table('inventoryItems').map((item) => {
      const total = db
        .table('inventoryBatches')
        .filter((batch) => batch.itemId === item.id)
        .reduce((sum, batch) => sum + (batch.qtyIn - batch.qtyOut), 0);
      return { ...item, availableQty: total };
    });
  }

  listBatches(itemId?: string) {
    const batches = db.table('inventoryBatches');
    return itemId ? batches.filter((batch) => batch.itemId === itemId) : batches;
  }

  soonToExpire(months = 6) {
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() + months);
    return db
      .table('inventoryBatches')
      .filter((batch) => new Date(batch.expiryDate) <= threshold && batch.qtyIn - batch.qtyOut > 0)
      .map((batch) => ({
        ...batch,
        remaining: batch.qtyIn - batch.qtyOut
      }));
  }
}

export const inventoryService = new InventoryService();
