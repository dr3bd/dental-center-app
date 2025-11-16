import { Invoice, Session } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';

export class InvoiceService {
  createFromSession(session: Session) {
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      patientId: session.patientId,
      date: new Date().toISOString(),
      totalYer: ensureYer(session.feeYer),
      paidYer: 0,
      status: 'draft',
      linkedSessionId: session.id,
      notes: 'تم إنشاؤها من الجلسة'
    };
    db.table('invoices').push(invoice);
    auditService.log('system', 'create', 'invoice', invoice.id, invoice);
    return invoice;
  }

  getByPatient(patientId: string) {
    return db.table('invoices').filter((inv) => inv.patientId === patientId);
  }

  applyReceipt(invoiceId: string, amountYer: number) {
    ensureYer(amountYer);
    const invoices = db.table('invoices');
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('الفاتورة غير موجودة');
    invoice.paidYer += amountYer;
    if (invoice.paidYer >= invoice.totalYer) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partial';
    }
    auditService.log('system', 'update', 'invoice', invoiceId, { paidYer: invoice.paidYer, status: invoice.status });
    return invoice;
  }

  cancel(invoiceId: string) {
    const invoice = db.table('invoices').find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('الفاتورة غير موجودة');
    invoice.status = 'void';
    auditService.log('system', 'update', 'invoice', invoiceId, { status: 'void' });
    return invoice;
  }
}

export const invoiceService = new InvoiceService();
