import { beforeEach, describe, expect, it } from 'vitest';
import {
  accountingService,
  appointmentService,
  cashboxService,
  db,
  generateReceiptPdf,
  inventoryService,
  invoiceService,
  patientService,
  pdfToUint8,
  reportService,
  sessionService
} from '..';

describe('Dental Center Core Services', () => {
  beforeEach(() => {
    db.reset();
  });

  it('creates patient and assigns code', () => {
    const patient = patientService.create({
      fullNameAr: 'مريض جديد',
      fullNameEn: 'New Patient',
      gender: 'male',
      dob: new Date(1995, 5, 15).toISOString(),
      phone: '777555111',
      address: 'صنعاء',
      notesMedical: 'حساسية بنسلين',
      doctorId: 'doc-1'
    });
    expect(patient.code).toMatch(/^P/);
    expect(patientService.list().some((p) => p.id === patient.id)).toBe(true);
  });

  it('session → invoice → receipt flow updates status', () => {
    const session = sessionService.create({
      patientId: 'pat-1',
      doctorId: 'doc-1',
      date: new Date().toISOString(),
      proceduresJson: '[]',
      teethJson: '[]',
      materialsJson: '[]',
      durationMin: 30,
      feeYer: 25000,
      attachments: []
    });
    const invoice = invoiceService.createFromSession(session);
    expect(invoice.status).toBe('draft');
    cashboxService.createReceipt({
      invoiceId: invoice.id,
      date: new Date().toISOString(),
      amountYer: 25000,
      method: 'cash',
      createdBy: 'manager'
    });
    const updated = invoiceService.getByPatient(session.patientId).find((i) => i.id === invoice.id);
    expect(updated?.status).toBe('paid');
  });

  it('inventory expiry alert detects batches expiring soon', () => {
    const expiring = inventoryService.soonToExpire();
    expect(expiring.length).toBeGreaterThan(0);
  });

  it('reschedules appointments and reflects on dashboard summary', () => {
    const appointment = appointmentService.create({
      patientId: 'pat-1',
      doctorId: 'doc-1',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      room: 'A',
      status: 'scheduled'
    });
    const newStart = new Date(Date.now() + 7200000).toISOString();
    appointmentService.reschedule(appointment.id, newStart, new Date(Date.now() + 10800000).toISOString());
    const summary = reportService.dashboardSummary();
    expect(summary.appointmentsToday.some((app) => app.id === appointment.id)).toBe(true);
  });

  it('consumes inventory when linking materials', () => {
    const before = inventoryService.listItems().find((item) => item.id === 'item-1')?.availableQty ?? 0;
    const session = sessionService.create({
      patientId: 'pat-2',
      doctorId: 'doc-2',
      date: new Date().toISOString(),
      proceduresJson: '[]',
      teethJson: '[]',
      materialsJson: '[]',
      durationMin: 15,
      feeYer: 10000,
      attachments: []
    });
    sessionService.linkMaterials(session.id, JSON.stringify([{ itemId: 'item-1', qty: 1 }]));
    const after = inventoryService.listItems().find((item) => item.id === 'item-1')?.availableQty ?? 0;
    expect(after).toBe(before - 1);
  });

  it('generates Arabic PDF receipts with content', () => {
    const receipt = cashboxService.createReceipt({
      invoiceId: undefined,
      amountYer: 5000,
      date: new Date().toISOString(),
      method: 'cash',
      createdBy: 'manager'
    });
    const doc = generateReceiptPdf({ receipt, patient: patientService.list()[0] });
    const bytes = pdfToUint8(doc);
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it('builds invoice aging snapshot and momentum list', () => {
    const aging = reportService.invoiceAging();
    expect(aging.unpaidTotal).toBeGreaterThanOrEqual(0);
    const momentum = reportService.patientMomentum();
    expect(momentum.length).toBeGreaterThan(0);
    expect(momentum[0].sessions).toBeGreaterThanOrEqual(momentum[momentum.length - 1].sessions);
  });

  it('rejects unbalanced journal entries and exports accounting pack', () => {
    expect(() =>
      accountingService.recordEntry({
        date: new Date().toISOString(),
        memo: 'قيد غير متوازن',
        source: 'test',
        postedBy: 'tester',
        lines: [
          { accountId: 'acc-1000', debitYer: 1000, creditYer: 0 },
          { accountId: 'acc-3000', debitYer: 0, creditYer: 500 }
        ]
      })
    ).toThrowError();
    const pack = accountingService.exportPack();
    expect(pack.trial.balanced).toBe(true);
    expect(pack.income.net).toBeDefined();
    expect(pack.balance.totals.assets).toBeGreaterThan(0);
  });
});
