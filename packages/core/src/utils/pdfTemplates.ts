import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, LabOrder, Patient, PaymentVoucher, Receipt, Session } from '../models';
import { formatYer } from './currency';

export interface MonthlyIncomeRow {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export function generateReceiptPdf({
  receipt,
  patient,
  clinicName = 'مركز الأسنان'
}: {
  receipt: Receipt;
  patient?: Patient;
  clinicName?: string;
}) {
  const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
  doc.setFontSize(16);
  doc.text(clinicName, 105, 15, { align: 'center' });
  doc.text('سند قبض', 105, 25, { align: 'center' });
  autoTable(doc, {
    head: [['الحقل', 'القيمة']],
    body: [
      ['الرقم', receipt.id],
      ['التاريخ', new Date(receipt.date).toLocaleDateString('ar-EG')],
      ['المريض/الجهة', patient?.fullNameAr ?? receipt.ref ?? '---'],
      ['المبلغ', formatYer(receipt.amountYer)],
      ['طريقة الدفع', receipt.method],
      ['المستخدم', receipt.createdBy]
    ],
    styles: { halign: 'right' },
    margin: { top: 35 }
  });
  return doc;
}

export function generateInvoicePdf({
  invoice,
  patient,
  session
}: {
  invoice: Invoice;
  patient: Patient;
  session?: Session;
}) {
  const doc = new jsPDF({ format: 'a4' });
  doc.setFontSize(16);
  doc.text('فاتورة علاجية', 105, 15, { align: 'center' });
  autoTable(doc, {
    head: [['المريض', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي']],
    body: [
      [
        patient.fullNameAr,
        new Date(invoice.date).toLocaleDateString('ar-EG'),
        formatYer(invoice.totalYer),
        formatYer(invoice.paidYer),
        formatYer(invoice.totalYer - invoice.paidYer)
      ]
    ],
    styles: { halign: 'right' },
    margin: { top: 30 }
  });
  if (session) {
    autoTable(doc, {
      head: [['الإجراء', 'الأسنان', 'المدة (دقائق)', 'الأتعاب']],
      body: [
        [
          JSON.parse(session.proceduresJson)[0]?.name ?? '---',
          JSON.parse(session.teethJson).join(', '),
          `${session.durationMin}`,
          formatYer(session.feeYer)
        ]
      ],
      startY: 70,
      styles: { halign: 'right' }
    });
  }
  return doc;
}

export function generateMonthlyIncomePdf(rows: MonthlyIncomeRow[]) {
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape' });
  doc.text('تقرير الدخل الشهري', 148, 20, { align: 'center' });
  const formatValue = (amount: number) => {
    const formatted = new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 0 }).format(Math.abs(amount));
    return `${amount < 0 ? '-' : ''}${formatted} YER`;
  };
  autoTable(doc, {
    head: [['الشهر', 'الدخل', 'المصروف', 'الصافي']],
    body: rows.map((row) => [row.period, formatValue(row.income), formatValue(row.expense), formatValue(row.net)]),
    styles: { halign: 'right' },
    margin: { top: 30 }
  });
  return doc;
}

export function generateLabOrdersPdf(orders: LabOrder[]) {
  const doc = new jsPDF({ format: 'a4' });
  doc.text('أوامر المعمل', 105, 15, { align: 'center' });
  autoTable(doc, {
    head: [['المريض', 'نوع العمل', 'المعمل', 'الحالة', 'التكلفة']],
    body: orders.map((order) => [
      order.patientId,
      order.type,
      order.labName,
      order.status,
      formatYer(order.costYer)
    ]),
    styles: { halign: 'right' },
    margin: { top: 30 }
  });
  return doc;
}

export function generatePaymentVoucherPdf({
  voucher,
  clinicName = 'مركز الأسنان'
}: {
  voucher: PaymentVoucher;
  clinicName?: string;
}) {
  const doc = new jsPDF({ format: 'a4' });
  doc.setFontSize(16);
  doc.text(clinicName, 105, 15, { align: 'center' });
  doc.text('سند دفع', 105, 25, { align: 'center' });
  autoTable(doc, {
    head: [['الحقل', 'القيمة']],
    body: [
      ['الرقم', voucher.id],
      ['التاريخ', new Date(voucher.date).toLocaleDateString('ar-EG')],
      ['الجهة', voucher.payee],
      ['الغرض', voucher.reason],
      ['المبلغ', formatYer(voucher.amountYer)],
      ['المستخدم', voucher.createdBy]
    ],
    styles: { halign: 'right' },
    margin: { top: 35 }
  });
  return doc;
}

export function pdfToUint8(doc: jsPDF) {
  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}
