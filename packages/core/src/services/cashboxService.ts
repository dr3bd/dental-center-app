import { PaymentVoucher, Receipt } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';
import { invoiceService } from './invoiceService';
import { accountingService } from './accountingService';

export class CashboxService {
  createReceipt(payload: Omit<Receipt, 'id' | 'voided'>) {
    ensureYer(payload.amountYer);
    const receipt: Receipt = { ...payload, id: `rec-${Date.now()}`, voided: false };
    db.table('receipts').push(receipt);
    if (receipt.invoiceId) {
      invoiceService.applyReceipt(receipt.invoiceId, receipt.amountYer);
    }
    accountingService.postReceipt(receipt.amountYer, receipt.invoiceId);
    auditService.log(receipt.createdBy, 'create', 'receipt', receipt.id, receipt);
    return receipt;
  }

  voidReceipt(id: string) {
    const receipt = db.table('receipts').find((r) => r.id === id);
    if (!receipt) throw new Error('السند غير موجود');
    receipt.voided = true;
    accountingService.postPayment(receipt.amountYer, undefined, id, 'عكس سند قبض');
    auditService.log('system', 'update', 'receipt', id, { voided: true });
    return receipt;
  }

  createPaymentVoucher(payload: Omit<PaymentVoucher, 'id' | 'voided'>) {
    ensureYer(payload.amountYer);
    const voucher: PaymentVoucher = { ...payload, id: `pay-${Date.now()}`, voided: false };
    db.table('paymentVouchers').push(voucher);
    const accountMap: Record<string, string | undefined> = {
      lab: 'acc-5100',
      materials: 'acc-5000',
      doctor: 'acc-5200'
    };
    const hint = voucher.reason.toLowerCase();
    const accountId = hint.includes('معمل') ? accountMap.lab : hint.includes('مادة') || hint.includes('مواد') ? accountMap.materials : undefined;
    accountingService.postPayment(voucher.amountYer, accountId, voucher.id, voucher.reason);
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
}

export const cashboxService = new CashboxService();
