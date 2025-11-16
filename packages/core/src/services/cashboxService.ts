import { LedgerEntry, PaymentVoucher, Receipt } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';
import { invoiceService } from './invoiceService';

export class CashboxService {
  createReceipt(payload: Omit<Receipt, 'id' | 'voided'>) {
    ensureYer(payload.amountYer);
    const receipt: Receipt = { ...payload, id: `rec-${Date.now()}`, voided: false };
    db.table('receipts').push(receipt);
    if (receipt.invoiceId) {
      invoiceService.applyReceipt(receipt.invoiceId, receipt.amountYer);
    }
    this.addLedger({
      id: `led-${Date.now()}`,
      date: receipt.date,
      type: 'receipt',
      refId: receipt.id,
      direction: 'in',
      amountYer: receipt.amountYer,
      note: receipt.ref
    });
    auditService.log(receipt.createdBy, 'create', 'receipt', receipt.id, receipt);
    return receipt;
  }

  voidReceipt(id: string) {
    const receipt = db.table('receipts').find((r) => r.id === id);
    if (!receipt) throw new Error('السند غير موجود');
    receipt.voided = true;
    this.addLedger({
      id: `led-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'receipt-void',
      refId: id,
      direction: 'out',
      amountYer: receipt.amountYer,
      note: 'إلغاء سند قبض'
    });
    auditService.log('system', 'update', 'receipt', id, { voided: true });
    return receipt;
  }

  createPaymentVoucher(payload: Omit<PaymentVoucher, 'id' | 'voided'>) {
    ensureYer(payload.amountYer);
    const voucher: PaymentVoucher = { ...payload, id: `pay-${Date.now()}`, voided: false };
    db.table('paymentVouchers').push(voucher);
    this.addLedger({
      id: `led-${Date.now()}`,
      date: voucher.date,
      type: 'payment',
      refId: voucher.id,
      direction: 'out',
      amountYer: voucher.amountYer,
      note: voucher.reason
    });
    auditService.log(voucher.createdBy, 'create', 'paymentVoucher', voucher.id, voucher);
    return voucher;
  }

  voidPayment(id: string) {
    const voucher = db.table('paymentVouchers').find((v) => v.id === id);
    if (!voucher) throw new Error('السند غير موجود');
    voucher.voided = true;
    auditService.log('system', 'update', 'paymentVoucher', id, { voided: true });
    return voucher;
  }

  private addLedger(entry: LedgerEntry) {
    db.table('ledger').push(entry);
  }
}

export const cashboxService = new CashboxService();
