import { beforeEach, describe, expect, it } from 'vitest';
import {
  cashboxService,
  db,
  inventoryService,
  invoiceService,
  patientService,
  reportService,
  sessionService
} from '..';

describe('E2E flows', () => {
  beforeEach(() => {
    db.reset();
  });

  it('completes the session → invoice → receipt flow and updates ledger', () => {
    const patient = patientService.create({
      fullNameAr: 'مريض E2E',
      fullNameEn: 'Patient E2E',
      gender: 'female',
      dob: new Date(1992, 4, 20).toISOString(),
      phone: '777444000',
      address: 'صنعاء',
      notesMedical: '',
      doctorId: 'doc-1'
    });
    const session = sessionService.create({
      patientId: patient.id,
      doctorId: 'doc-1',
      date: new Date().toISOString(),
      proceduresJson: JSON.stringify([{ name: 'تنظيف شامل', teeth: ['11', '21'] }]),
      teethJson: JSON.stringify(['11', '21']),
      materialsJson: '[]',
      durationMin: 60,
      feeYer: 18000,
      attachments: []
    });
    const invoice = invoiceService.createFromSession(session);
    cashboxService.createReceipt({
      invoiceId: invoice.id,
      amountYer: invoice.totalYer,
      date: new Date().toISOString(),
      method: 'cash',
      createdBy: 'manager'
    });
    const ledger = db.table('ledger');
    const updatedInvoice = invoiceService.getByPatient(patient.id)[0];
    expect(updatedInvoice.status).toBe('paid');
    expect(ledger.some((entry) => entry.refId === invoice.id && entry.direction === 'in')).toBe(true);
  });

  it('flags expiring inventory after adding batches that near expiry', () => {
    const item = inventoryService.listItems()[0];
    inventoryService.addBatch({
      itemId: item.id,
      batchNo: 'E2E-BATCH',
      qtyIn: 5,
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      costYer: 15000
    });
    const summary = reportService.dashboardSummary();
    expect(summary.expiringBatches.some((batch) => batch.batchNo === 'E2E-BATCH')).toBe(true);
  });
});
