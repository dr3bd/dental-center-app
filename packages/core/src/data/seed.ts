import {
  Account,
  Appointment,
  Doctor,
  InventoryBatch,
  InventoryItem,
  Invoice,
  JournalEntry,
  JournalLine,
  LabOrder,
  Patient,
  PaymentVoucher,
  Receipt,
  Session,
  ToothStatus,
  PatientTooth,
  Supplier
} from '../models';
import { LedgerEntry } from '../models';

const now = new Date();

export const doctors: Doctor[] = [
  { id: 'doc-1', name: 'د. سارة الحميري', phone: '777000111', specialty: 'تقويم', active: true, revenueSharePercent: 45 },
  { id: 'doc-2', name: 'د. مازن القدسي', phone: '777000222', specialty: 'جراحة فم', active: true, revenueSharePercent: 40 },
  { id: 'doc-3', name: 'د. جنى المفلحي', phone: '777000333', specialty: 'تركيبات', active: true, revenueSharePercent: 35 }
];

const genders: ('male' | 'female')[] = ['male', 'female'];

export const patients: Patient[] = Array.from({ length: 20 }).map((_, idx) => {
  const id = `pat-${idx + 1}`;
  return {
    id,
    code: `P${(idx + 1).toString().padStart(4, '0')}`,
    fullNameAr: `مريض ${idx + 1}`,
    fullNameEn: `Patient ${idx + 1}`,
    gender: genders[idx % 2],
    dob: new Date(1990, idx % 12, (idx % 28) + 1).toISOString(),
    phone: `7771234${(idx + 10).toString().padStart(2, '0')}`,
    address: 'صنعاء - حدة',
    notesMedical: idx % 4 === 0 ? 'ضغط' : '',
    doctorId: doctors[idx % doctors.length].id,
    createdAt: new Date(now.getTime() - idx * 86400000).toISOString()
  };
});

export const suppliers: Supplier[] = [
  { id: 'sup-1', name: 'مستلزمات اليمن الطبية', phone: '01444555', address: 'صنعاء - شارع تعز', active: true },
  { id: 'sup-2', name: 'دنتال برو', phone: '01444000', address: 'عدن - خور مكسر', active: true },
  { id: 'sup-3', name: 'لاب اليمن', phone: '01444888', address: 'صنعاء - حدة', active: false }
];

export const toothStatuses: ToothStatus[] = [
  { id: 'ts-healthy', code: 'healthy', labelAr: 'سليم', labelEn: 'Healthy', color: '#16a34a', isDefault: true },
  { id: 'ts-caries', code: 'caries', labelAr: 'نخر', labelEn: 'Caries', color: '#f97316', isDefault: false },
  { id: 'ts-missing', code: 'missing', labelAr: 'مفقود', labelEn: 'Missing', color: '#ef4444', isDefault: false }
];

export const patientTeeth: PatientTooth[] = patients.flatMap((patient) =>
  [11, 12, 21, 22].map((tooth) => ({
    id: `${patient.id}-tooth-${tooth}`,
    patientId: patient.id,
    toothNumber: tooth.toString(),
    statusId: toothStatuses[tooth % toothStatuses.length].id,
    notes: tooth % 2 === 0 ? 'حشوة قديمة' : undefined
  }))
);

export const appointments: Appointment[] = Array.from({ length: 5 }).map((_, idx) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9 + idx);
  const end = new Date(start.getTime() + 45 * 60000);
  return {
    id: `app-${idx + 1}`,
    patientId: patients[idx].id,
    doctorId: doctors[idx % doctors.length].id,
    start: start.toISOString(),
    end: end.toISOString(),
    room: idx % 2 === 0 ? 'A' : 'B',
    status: 'scheduled',
    note: idx % 2 === 0 ? 'تنظيف' : 'مراجعة'
  };
});

export const sessions: Session[] = Array.from({ length: 8 }).map((_, idx) => {
  const patient = patients[idx];
  return {
    id: `ses-${idx + 1}`,
    patientId: patient.id,
    doctorId: patient.doctorId,
    date: new Date(now.getTime() - idx * 43200000).toISOString(),
    proceduresJson: JSON.stringify([{ name: 'حشوة ضوئية', teeth: ['11'] }]),
    teethJson: JSON.stringify(['11']),
    materialsJson: JSON.stringify([{ itemId: `item-${(idx % 10) + 1}`, qty: 1 }]),
    durationMin: 45,
    feeYer: 30000 + idx * 2000,
    attachments: []
  };
});

export const invoices: Invoice[] = Array.from({ length: 5 }).map((_, idx) => {
  const session = sessions[idx];
  const partial = idx % 3 === 0;
  return {
    id: `inv-${idx + 1}`,
    patientId: session.patientId,
    date: session.date,
    totalYer: session.feeYer,
    paidYer: partial ? session.feeYer - 5000 : session.feeYer,
    status: partial ? 'partial' : 'paid',
    linkedSessionId: session.id,
    notes: partial ? 'متبقي 5000' : 'مدفوعة بالكامل'
  };
});

export const receipts: Receipt[] = [
  { id: 'rec-1', invoiceId: 'inv-1', date: now.toISOString(), amountYer: 25000, method: 'cash', createdBy: 'manager', voided: false },
  { id: 'rec-2', invoiceId: 'inv-2', date: now.toISOString(), amountYer: 22000, method: 'cash', createdBy: 'manager', voided: false },
  { id: 'rec-3', invoiceId: 'inv-3', date: now.toISOString(), amountYer: 15000, method: 'card', createdBy: 'secretary', voided: false },
  { id: 'rec-4', invoiceId: 'inv-4', date: now.toISOString(), amountYer: 18000, method: 'cash', createdBy: 'secretary', voided: false },
  { id: 'rec-5', invoiceId: 'inv-5', date: now.toISOString(), amountYer: 12000, method: 'cash', createdBy: 'manager', voided: false },
  { id: 'rec-6', invoiceId: undefined, date: now.toISOString(), amountYer: 8000, method: 'cash', ref: 'advance', createdBy: 'manager', voided: false }
];

export const paymentVouchers: PaymentVoucher[] = [
  { id: 'pay-1', date: now.toISOString(), amountYer: 7000, payee: 'معمل ابتسامة', reason: 'قوالب زركون', createdBy: 'manager', voided: false },
  { id: 'pay-2', date: now.toISOString(), amountYer: 9000, payee: 'مشتريات مواد', reason: 'كمبوزت', createdBy: 'manager', voided: false },
  { id: 'pay-3', date: now.toISOString(), amountYer: 4000, payee: 'صيانة', reason: 'تعقيم', createdBy: 'secretary', voided: false }
];

export const inventoryItems: InventoryItem[] = Array.from({ length: 10 }).map((_, idx) => ({
  id: `item-${idx + 1}`,
  name: `مادة ${idx + 1}`,
  unit: 'علبة',
  sku: `SKU-${idx + 1}`,
  minLevel: 5,
  notes: idx % 2 === 0 ? 'تُحفظ مبردة' : undefined
}));

const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
export const inventoryBatches: InventoryBatch[] = inventoryItems.flatMap((item, idx) => [
  {
    id: `${item.id}-b1`,
    itemId: item.id,
    batchNo: `B-${idx + 1}-1`,
    expiryDate: new Date(now.getTime() + sixMonthsMs - idx * 86400000).toISOString(),
    qtyIn: 10,
    qtyOut: 2,
    costYer: 12000 + idx * 500,
    createdAt: now.toISOString()
  },
  {
    id: `${item.id}-b2`,
    itemId: item.id,
    batchNo: `B-${idx + 1}-2`,
    expiryDate: new Date(now.getTime() + sixMonthsMs * 2).toISOString(),
    qtyIn: 6,
    qtyOut: 1,
    costYer: 9000 + idx * 300,
    createdAt: now.toISOString()
  }
]);

export const labOrders: LabOrder[] = [
  { id: 'lab-1', patientId: patients[0].id, doctorId: doctors[0].id, type: 'تركيبة أمامية', sentDate: now.toISOString(), dueDate: new Date(now.getTime() + 7 * 86400000).toISOString(), labName: 'معمل ابتسامة', costYer: 40000, status: 'pending', notes: 'لون A2' },
  { id: 'lab-2', patientId: patients[1].id, doctorId: doctors[1].id, type: 'طقم كامل', sentDate: now.toISOString(), dueDate: new Date(now.getTime() + 10 * 86400000).toISOString(), labName: 'لاب فيوجن', costYer: 65000, status: 'sent', notes: '' }
];

export const ledger: LedgerEntry[] = [
  { id: 'led-1', date: now.toISOString(), type: 'receipt', refId: 'rec-1', direction: 'in', amountYer: 25000, note: 'سند قبض 1' },
  { id: 'led-2', date: now.toISOString(), type: 'payment', refId: 'pay-1', direction: 'out', amountYer: 7000, note: 'سند دفع 1' }
];

export const accounts: Account[] = [
  { id: 'acc-1000', code: '1000', name: 'الصندوق', type: 'asset', isActive: true },
  { id: 'acc-1100', code: '1100', name: 'ذمم المرضى', type: 'asset', isActive: true },
  { id: 'acc-1200', code: '1200', name: 'المخزون الطبي', type: 'asset', isActive: true },
  { id: 'acc-1300', code: '1300', name: 'دفعات المعامل', type: 'asset', isActive: true },
  { id: 'acc-2000', code: '2000', name: 'ذمم الموردين', type: 'liability', isActive: true },
  { id: 'acc-2100', code: '2100', name: 'مستحقات الأطباء', type: 'liability', isActive: true },
  { id: 'acc-3000', code: '3000', name: 'الأرباح المحتجزة', type: 'equity', isActive: true },
  { id: 'acc-3100', code: '3100', name: 'أرصدة افتتاحية', type: 'equity', isActive: true },
  { id: 'acc-4000', code: '4000', name: 'إيرادات علاجية', type: 'revenue', isActive: true },
  { id: 'acc-4100', code: '4100', name: 'إيرادات أخرى', type: 'revenue', isActive: true },
  { id: 'acc-5000', code: '5000', name: 'مصاريف عيادية', type: 'expense', isActive: true },
  { id: 'acc-5100', code: '5100', name: 'مصاريف مختبرات', type: 'expense', isActive: true },
  { id: 'acc-5200', code: '5200', name: 'مصاريف عمولات أطباء', type: 'expense', isActive: true },
  { id: 'acc-5900', code: '5900', name: 'مصاريف تشغيل أخرى', type: 'expense', isActive: true }
];

let journalCounter = 1;
let journalLineCounter = 1;
const jl = (accountId: string, debitYer: number, creditYer: number, memo?: string): JournalLine => ({
  id: `jl-${journalLineCounter++}`,
  accountId,
  debitYer,
  creditYer,
  memo
});

const makeEntry = (memo: string, source: string, lines: JournalLine[], refId?: string, date = now.toISOString()): JournalEntry => ({
  id: `je-${journalCounter++}`,
  date,
  memo,
  source,
  refId,
  period: date.substring(0, 7),
  postedBy: 'seed',
  createdAt: date,
  lines
});

const revenueEntries = invoices.map((invoice) => {
  const session = sessions.find((s) => s.id === invoice.linkedSessionId);
  const doctor = doctors.find((d) => d?.id === session?.doctorId);
  const commission = doctor ? Math.round(invoice.totalYer * (doctor.revenueSharePercent / 100)) : 0;
  return makeEntry(
    `قيد فاتورة ${invoice.id}`,
    'invoice',
    [
      jl('acc-1100', invoice.totalYer, 0, 'ذمم مرضى'),
      jl('acc-4000', 0, invoice.totalYer, 'إيراد علاجي'),
      jl('acc-5200', commission, 0, 'عمولة طبيب'),
      jl('acc-2100', 0, commission, 'التزام للطبيب')
    ],
    invoice.id,
    invoice.date
  );
});

const receiptEntries = receipts.map((receipt) => {
  const memo = receipt.invoiceId ? `تحصيل ${receipt.invoiceId}` : 'قبض نقدي مباشر';
  const creditAccount = receipt.invoiceId ? 'acc-1100' : 'acc-4100';
  return makeEntry(memo, 'receipt', [jl('acc-1000', receipt.amountYer, 0), jl(creditAccount, 0, receipt.amountYer)], receipt.invoiceId, receipt.date);
});

const paymentEntries = paymentVouchers.map((voucher) => {
  const accountMap: Record<string, string> = {
    'قوالب زركون': 'acc-5100',
    كمبوزت: 'acc-5000',
    تعقيم: 'acc-5900'
  };
  const expenseAccount = accountMap[voucher.reason] || 'acc-5900';
  return makeEntry(`سند دفع ${voucher.payee}`, 'payment', [jl(expenseAccount, voucher.amountYer, 0), jl('acc-1000', 0, voucher.amountYer)], voucher.id, voucher.date);
});

const openingEntry = makeEntry('أرصدة افتتاحية', 'opening', [jl('acc-1000', 150000, 0), jl('acc-1200', 80000, 0), jl('acc-3100', 0, 230000)]);

export const journalEntries: JournalEntry[] = [openingEntry, ...revenueEntries, ...receiptEntries, ...paymentEntries];
