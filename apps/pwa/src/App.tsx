import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppShell,
  Badge,
  ChartPanel,
  DataTable,
  EmptyState,
  KPIWidget,
  MoneyInputYER,
  PDFButton,
  SmartForm,
  Stepper,
  Tag,
  Toast,
  ToothFDI
} from '@dental-center/ui';
import {
  appointmentService,
  accountingService,
  auditService,
  backupService,
  cashboxService,
  db,
  generateInvoicePdf,
  generateLabOrdersPdf,
  generateMonthlyIncomePdf,
  generatePaymentVoucherPdf,
  generateReceiptPdf,
  inventoryService,
  invoiceService,
  labService,
  patientService,
  reportService,
  sessionService,
  settingsService,
  supplierService
} from '@dental-center/core';

const menu: { key: View; label: string }[] = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'patients', label: 'المرضى' },
  { key: 'appointments', label: 'المواعيد' },
  { key: 'sessions', label: 'الجلسات' },
  { key: 'billing', label: 'الفوترة والسندات' },
  { key: 'inventory', label: 'المخزون' },
  { key: 'lab', label: 'المعامل' },
  { key: 'suppliers', label: 'المورّدون' },
  { key: 'accounting', label: 'الحسابات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'settings', label: 'الإعدادات' },
  { key: 'audit', label: 'سجل التدقيق' }
];

type View = (typeof menu)[number]['key'];

type ViewProps = { version: number; refresh: () => void; onToast: (message: string) => void };

type SimpleProps = Pick<ViewProps, 'version'>;

function DashboardView({ version }: SimpleProps) {
  const summary = useMemo(() => reportService.dashboardSummary(), [version]);
  const incomeTrend = useMemo(() => reportService.incomeTrend(7), [version]);
  const expense = useMemo(() => reportService.expenseByCategory(), [version]);
  const netByDoctor = useMemo(() => reportService.netByDoctor(), [version]);
  const netCosts = useMemo(() => reportService.netAfterLabAndMaterials(), [version]);
  const aging = summary.invoiceAging;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KPIWidget label="دخل اليوم" value={`${summary.incomeToday} YER`} />
        <KPIWidget label="دخل الأسبوع" value={`${summary.incomeThisWeek} YER`} />
        <KPIWidget label="مرضى جدد هذا الأسبوع" value={summary.newPatients.toString()} />
        <KPIWidget label="رصيد الخزنة" value={`${summary.cashBalance} YER`} />
      </div>
      <ChartPanel
        title="دخل الأسبوع"
        labels={incomeTrend.map((point) => point.label)}
        datasets={[{ label: 'الدخل', data: incomeTrend.map((point) => point.total), backgroundColor: '#5eead4', borderColor: '#0f766e' }]}
      />
      <ChartPanel
        title="مصروف حسب الفئة"
        type="bar"
        labels={expense.map((item) => item.category)}
        datasets={[{ label: 'مصروف', data: expense.map((item) => item.total), backgroundColor: '#fca5a5' }]}
      />
      <ChartPanel
        title="دخل الأطباء"
        type="bar"
        labels={netByDoctor.map((row) => row.doctor)}
        datasets={[{ label: 'الصافي', data: netByDoctor.map((row) => row.net), backgroundColor: '#bfdbfe' }]}
      />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <ChartPanel title="تنبيهات اليوم">
          {summary.expiringBatches.length === 0 ? (
            <EmptyState title="لا مواد على وشك الانتهاء" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {summary.expiringBatches.map((batch) => (
                <li key={batch.id} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {batch.batchNo} – ينتهي {new Date(batch.expiryDate).toLocaleDateString('ar-EG')}
                  </span>
                  <Badge tone="danger">المتبقي {batch.remaining}</Badge>
                </li>
              ))}
            </ul>
          )}
        </ChartPanel>
        <ChartPanel title="مواعيد اليوم">
          {summary.appointmentsToday.length === 0 ? (
            <EmptyState title="لا يوجد مواعيد" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {summary.appointmentsToday.map((appointment) => (
                <li key={appointment.id} style={{ marginBottom: 8 }}>
                  <strong>{appointment.room}</strong> · {new Date(appointment.start).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </li>
              ))}
            </ul>
          )}
        </ChartPanel>
      </section>
      <div style={{ ...cardStyle, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>صافي الدخل بعد تكاليف المواد والمعمل</h3>
        <p>الدخل: {netCosts.income} YER</p>
        <p>تكلفة المعمل: {netCosts.labCost} YER</p>
        <p>تكلفة المواد: {netCosts.materialCost} YER</p>
        <Tag>الصافي: {netCosts.net} YER</Tag>
      </div>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <ChartPanel
          title="أعمار الفواتير"
          type="pie"
          labels={['جارية', 'مهلة سماح', 'متأخرة']}
          datasets={[
            {
              label: 'عدد الفواتير',
              data: [aging.current, aging.grace, aging.overdue],
              backgroundColor: ['#4ade80', '#f59e0b', '#f43f5e']
            }
          ]}
          footer={<Tag>غير محصّل: {aging.unpaidTotal} YER</Tag>}
        />
        <div style={{ ...cardStyle, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>أكثر المرضى نشاطًا</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.momentum.map((row) => (
              <li
                key={row.patient.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}
              >
                <span>{row.patient.fullNameAr}</span>
                <Badge tone="success">{row.sessions} جلسة</Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function PatientsView({ version, refresh, onToast }: ViewProps) {
  const patients = useMemo(() => patientService.list(), [version]);
  const doctors = useMemo(() => settingsService.listDoctors(), [version]);
  const [form, setForm] = useState({ fullNameAr: '', phone: '', gender: 'male', dob: '', doctorId: doctors[0]?.id ?? '', address: '', notesMedical: '' });
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    patientService.create({
      fullNameAr: form.fullNameAr,
      fullNameEn: form.fullNameAr,
      gender: form.gender as 'male' | 'female',
      dob: form.dob || new Date(1990, 0, 1).toISOString(),
      phone: form.phone,
      address: form.address,
      notesMedical: form.notesMedical,
      doctorId: form.doctorId || doctors[0]?.id || 'doc-1'
    });
    setForm({ ...form, fullNameAr: '', phone: '', notesMedical: '' });
    refresh();
    onToast('تمت إضافة المريض');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SmartForm onSubmit={handleSubmit}>
        <label>
          الاسم الكامل
          <input value={form.fullNameAr} onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })} required />
        </label>
        <label>
          الجوال
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </label>
        <label>
          تاريخ الميلاد
          <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
        </label>
        <label>
          الطبيب المعالج
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          العنوان
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <label>
          محاذير طبية
          <input value={form.notesMedical} onChange={(e) => setForm({ ...form, notesMedical: e.target.value })} />
        </label>
        <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '12px 18px' }}>حفظ</button>
      </SmartForm>
      <DataTable
        data={patients}
        columns={[
          { key: 'code', label: 'الكود' },
          { key: 'fullNameAr', label: 'الاسم' },
          { key: 'phone', label: 'الجوال' },
          {
            key: 'doctorId',
            label: 'الطبيب',
            render: (row) => doctors.find((doctor) => doctor.id === row.doctorId)?.name ?? '—'
          }
        ]}
        fileName="patients"
      />
    </div>
  );
}

function AppointmentsView({ version, refresh, onToast }: ViewProps) {
  const appointments = useMemo(() => appointmentService.list(), [version]);
  const patients = useMemo(() => patientService.list(), [version]);
  const doctors = useMemo(() => settingsService.listDoctors(), [version]);
  const [form, setForm] = useState({ patientId: patients[0]?.id ?? '', doctorId: doctors[0]?.id ?? '', start: '', end: '', room: 'A' });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    appointmentService.create({
      patientId: form.patientId || patients[0]?.id || 'pat-1',
      doctorId: form.doctorId || doctors[0]?.id || 'doc-1',
      start: form.start || new Date().toISOString(),
      end: form.end || new Date(Date.now() + 30 * 60000).toISOString(),
      room: form.room,
      status: 'scheduled'
    });
    refresh();
    onToast('تم حفظ الموعد');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SmartForm onSubmit={submit}>
        <label>
          المريض
          <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullNameAr}
              </option>
            ))}
          </select>
        </label>
        <label>
          الطبيب
          <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          بداية الموعد
          <input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        </label>
        <label>
          نهاية الموعد
          <input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
        </label>
        <label>
          الغرفة
          <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
        </label>
        <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '12px 18px' }}>حجز الموعد</button>
      </SmartForm>
      <DataTable
        data={appointments}
        columns={[
          { key: 'room', label: 'الغرفة' },
          { key: 'start', label: 'البداية', render: (row) => new Date(row.start).toLocaleString('ar-EG') },
          { key: 'status', label: 'الحالة' }
        ]}
        fileName="appointments"
      />
    </div>
  );
}

function SessionsView({ version, refresh, onToast }: ViewProps) {
  const patients = useMemo(() => patientService.list(), [version]);
  const doctors = useMemo(() => settingsService.listDoctors(), [version]);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? 'pat-1');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? 'doc-1');
  const [teeth, setTeeth] = useState<string[]>(['11']);
  const [fee, setFee] = useState(20000);
  const save = () => {
    const session = sessionService.create({
      patientId,
      doctorId,
      date: new Date().toISOString(),
      proceduresJson: JSON.stringify([{ name: 'إجراء مخصص', teeth }]),
      teethJson: JSON.stringify(teeth),
      materialsJson: '[]',
      durationMin: 30,
      feeYer: fee,
      attachments: []
    });
    sessionService.linkMaterials(session.id, JSON.stringify([{ itemId: 'item-1', qty: 1 }]));
    const invoice = invoiceService.createFromSession(session);
    onToast('تم حفظ الجلسة وإنشاء فاتورة');
    refresh();
    return invoice;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <label>
          المريض
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullNameAr}
              </option>
            ))}
          </select>
        </label>
        <label>
          الطبيب
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          أتعاب الجلسة
          <MoneyInputYER value={fee} onChange={setFee} />
        </label>
      </div>
      <Stepper steps={['اختيار الأسنان', 'المواد', 'الفوترة']} active={0} />
      <ToothFDI selected={teeth} onSelect={setTeeth} />
      <button style={{ padding: '14px 18px', borderRadius: 14, border: 'none', background: '#0f766e', color: '#fff', width: 220 }} onClick={save}>
        حفظ الجلسة
      </button>
    </div>
  );
}

function BillingView({ version, refresh, onToast }: ViewProps) {
  const invoices = useMemo(() => db.table('invoices'), [version]);
  const receipts = useMemo(() => db.table('receipts'), [version]);
  const paymentVouchers = useMemo(() => db.table('paymentVouchers'), [version]);
  const patients = useMemo(() => patientService.list(), [version]);
  const [receiptForm, setReceiptForm] = useState({ invoiceId: '', amountYer: 0, method: 'cash' });
  const [voucherForm, setVoucherForm] = useState({ payee: '', reason: '', amountYer: 0 });
  useEffect(() => {
    if (invoices.length === 0) return;
    setReceiptForm((prev) => (prev.invoiceId ? prev : { ...prev, invoiceId: invoices[0].id }));
  }, [invoices]);
  const settle = (invoiceId: string, remaining: number) => {
    cashboxService.createReceipt({
      invoiceId,
      date: new Date().toISOString(),
      amountYer: remaining,
      method: 'cash',
      createdBy: 'manager'
    });
    refresh();
    onToast('تم تحصيل الفاتورة');
  };
  const submitReceipt = (event: FormEvent) => {
    event.preventDefault();
    if (receiptForm.amountYer <= 0) return;
    cashboxService.createReceipt({
      invoiceId: receiptForm.invoiceId || undefined,
      date: new Date().toISOString(),
      amountYer: receiptForm.amountYer,
      method: receiptForm.method,
      createdBy: 'secretary'
    });
    setReceiptForm({ invoiceId: receiptForm.invoiceId, amountYer: 0, method: receiptForm.method });
    refresh();
    onToast('تم إنشاء سند قبض');
  };
  const submitVoucher = (event: FormEvent) => {
    event.preventDefault();
    if (voucherForm.amountYer <= 0) return;
    cashboxService.createPaymentVoucher({
      payee: voucherForm.payee || 'مورد',
      reason: voucherForm.reason || 'مصروف تشغيلي',
      amountYer: voucherForm.amountYer,
      date: new Date().toISOString(),
      createdBy: 'secretary'
    });
    setVoucherForm({ payee: '', reason: '', amountYer: 0 });
    refresh();
    onToast('تم تسجيل سند دفع');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <SmartForm onSubmit={submitReceipt}>
          <strong>سند قبض سريع</strong>
          <label>
            الفاتورة
            <select value={receiptForm.invoiceId} onChange={(e) => setReceiptForm({ ...receiptForm, invoiceId: e.target.value })}>
              <option value="">بدون فاتورة</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            المبلغ (YER)
            <MoneyInputYER value={receiptForm.amountYer} onChange={(value) => setReceiptForm({ ...receiptForm, amountYer: value })} />
          </label>
          <label>
            الطريقة
            <select value={receiptForm.method} onChange={(e) => setReceiptForm({ ...receiptForm, method: e.target.value })}>
              <option value="cash">نقدًا</option>
              <option value="card">بطاقة</option>
            </select>
          </label>
          <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '10px 14px' }}>
            حفظ السند
          </button>
        </SmartForm>
        <SmartForm onSubmit={submitVoucher}>
          <strong>سند دفع</strong>
          <label>
            الجهة
            <input value={voucherForm.payee} onChange={(e) => setVoucherForm({ ...voucherForm, payee: e.target.value })} required />
          </label>
          <label>
            الغرض
            <input value={voucherForm.reason} onChange={(e) => setVoucherForm({ ...voucherForm, reason: e.target.value })} required />
          </label>
          <label>
            المبلغ (YER)
            <MoneyInputYER value={voucherForm.amountYer} onChange={(value) => setVoucherForm({ ...voucherForm, amountYer: value })} />
          </label>
          <button style={{ borderRadius: 12, border: 'none', background: '#f97316', color: '#fff', padding: '10px 14px' }}>
            تسجيل مصروف
          </button>
        </SmartForm>
      </section>
      <DataTable
        data={invoices}
        columns={[
          { key: 'id', label: 'رقم الفاتورة' },
          { key: 'patientId', label: 'المريض', render: (row) => patients.find((patient) => patient.id === row.patientId)?.fullNameAr ?? '—' },
          { key: 'totalYer', label: 'الإجمالي' },
          { key: 'paidYer', label: 'مدفوع' },
          {
            key: 'status',
            label: 'الحالة',
            render: (row) => (
              <Badge tone={row.status === 'paid' ? 'brand' : 'danger'}>{row.status}</Badge>
            )
          },
          {
            key: 'notes',
            label: 'إجراء',
            render: (row) =>
              row.totalYer > row.paidYer ? (
                <button onClick={() => settle(row.id, row.totalYer - row.paidYer)} style={{ borderRadius: 12, border: 'none', background: '#0ea5e9', color: '#fff', padding: '8px 12px' }}>
                  تحصيل المتبقي
                </button>
              ) : (
                <PDFButton
                  label="PDF"
                  onGenerate={() => {
                    const patient = patients.find((p) => p.id === row.patientId);
                    if (!patient) return;
                    const session = db.table('sessions').find((session) => session.id === row.linkedSessionId);
                    const doc = generateInvoicePdf({ invoice: row, patient, session });
                    doc.save(`${row.id}.pdf`);
                  }}
                />
              )
          }
        ]}
        fileName="invoices"
      />
      <DataTable
        data={receipts}
        columns={[
          { key: 'id', label: 'السند' },
          { key: 'amountYer', label: 'المبلغ' },
          { key: 'method', label: 'الطريقة' },
          { key: 'createdBy', label: 'المستخدم' },
          {
            key: 'date',
            label: 'PDF',
            sortable: false,
            render: (row) => (
              <PDFButton
                label="PDF"
                onGenerate={() => {
                  const patient = row.invoiceId ? patients.find((p) => p.id === invoices.find((inv) => inv.id === row.invoiceId)?.patientId) : undefined;
                  const doc = generateReceiptPdf({ receipt: row, patient });
                  doc.save(`${row.id}.pdf`);
                }}
              />
            )
          }
        ]}
        fileName="receipts"
      />
      <DataTable
        data={paymentVouchers}
        columns={[
          { key: 'id', label: 'الرقم' },
          { key: 'payee', label: 'الجهة' },
          { key: 'reason', label: 'الغرض' },
          { key: 'amountYer', label: 'المبلغ' },
          {
            key: 'date',
            label: 'PDF',
            sortable: false,
            render: (row) => (
              <PDFButton
                label="PDF"
                onGenerate={() => {
                  const doc = generatePaymentVoucherPdf({ voucher: row });
                  doc.save(`${row.id}.pdf`);
                }}
              />
            )
          }
        ]}
        fileName="payment-vouchers"
      />
    </div>
  );
}

function InventoryView({ version, refresh, onToast }: ViewProps) {
  const items = useMemo(() => inventoryService.listItems(), [version]);
  const expiring = useMemo(() => inventoryService.soonToExpire(), [version]);
  const [batch, setBatch] = useState({ itemId: items[0]?.id ?? '', batchNo: '', qtyIn: 1, expiryDate: '', costYer: 0 });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    inventoryService.addBatch({
      itemId: batch.itemId || items[0]?.id || 'item-1',
      batchNo: batch.batchNo || `B-${Date.now()}`,
      qtyIn: batch.qtyIn,
      expiryDate: batch.expiryDate || new Date(Date.now() + 86400000).toISOString(),
      costYer: batch.costYer
    });
    refresh();
    onToast('تمت إضافة الدفعة');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SmartForm onSubmit={submit}>
        <label>
          المادة
          <select value={batch.itemId} onChange={(e) => setBatch({ ...batch, itemId: e.target.value })}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          رقم الدفعة
          <input value={batch.batchNo} onChange={(e) => setBatch({ ...batch, batchNo: e.target.value })} />
        </label>
        <label>
          الكمية
          <input
            type="number"
            value={batch.qtyIn}
            min={1}
            onChange={(e) => setBatch({ ...batch, qtyIn: Math.max(1, parseInt(e.target.value || '1', 10)) })}
          />
        </label>
        <label>
          تاريخ الانتهاء
          <input type="date" value={batch.expiryDate} onChange={(e) => setBatch({ ...batch, expiryDate: e.target.value })} />
        </label>
        <label>
          التكلفة
          <MoneyInputYER value={batch.costYer} onChange={(value) => setBatch({ ...batch, costYer: value })} />
        </label>
        <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '12px 18px' }}>إضافة دفعة</button>
      </SmartForm>
      <DataTable
        data={items}
        columns={[
          { key: 'name', label: 'المادة' },
          { key: 'availableQty', label: 'الرصيد' },
          { key: 'sku', label: 'الكود' }
        ]}
        fileName="inventory"
      />
      <ChartPanel title="مواد على وشك الانتهاء">
        {expiring.length === 0 ? (
          <EmptyState title="لا يوجد تنبيهات" />
        ) : (
          <ul>
            {expiring.map((batchItem) => (
              <li key={batchItem.id}>{batchItem.batchNo} – {batchItem.remaining} وحدات</li>
            ))}
          </ul>
        )}
      </ChartPanel>
    </div>
  );
}

function LabOrdersView({ version, refresh, onToast }: ViewProps) {
  const orders = useMemo(() => labService.list(), [version]);
  const patients = useMemo(() => patientService.list(), [version]);
  const update = (id: string) => {
    labService.updateStatus(id, 'delivered');
    refresh();
    onToast('تم تحديث حالة المعمل');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DataTable
        data={orders}
        columns={[
          { key: 'type', label: 'نوع العمل' },
          { key: 'labName', label: 'المعمل' },
          { key: 'status', label: 'الحالة' },
          {
            key: 'patientId',
            label: 'المريض',
            render: (row) => patients.find((patient) => patient.id === row.patientId)?.fullNameAr ?? '—'
          },
          {
            key: 'notes',
            label: 'تحديث',
            render: (row) => (
              <button onClick={() => update(row.id)} style={{ borderRadius: 12, border: 'none', background: '#f97316', color: '#fff', padding: '6px 12px' }}>
                استلام
              </button>
            )
          }
        ]}
        fileName="lab-orders"
      />
      <PDFButton
        label="PDF أوامر المعمل"
        onGenerate={() => {
          const doc = generateLabOrdersPdf(orders);
          doc.save('lab-orders.pdf');
        }}
      />
    </div>
  );
}

function SuppliersView({ version, refresh, onToast }: ViewProps) {
  const suppliers = useMemo(() => supplierService.list(), [version]);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    supplierService.add({ name: form.name, phone: form.phone, address: form.address, active: true });
    setForm({ name: '', phone: '', address: '' });
    refresh();
    onToast('تم حفظ المورّد');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SmartForm onSubmit={submit}>
        <label>
          الاسم
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          الهاتف
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          العنوان
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '12px 18px' }}>إضافة</button>
      </SmartForm>
      <DataTable
        data={suppliers}
        columns={[
          { key: 'name', label: 'الاسم' },
          { key: 'phone', label: 'الهاتف' },
          { key: 'address', label: 'العنوان' },
          {
            key: 'active',
            label: 'الحالة',
            render: (row) => (row.active ? <Badge>نشط</Badge> : <Badge tone="danger">موقوف</Badge>)
          }
        ]}
        fileName="suppliers"
      />
    </div>
  );
}

function AccountingView({ version, onToast }: ViewProps) {
  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'asset' as const });
  const coa = useMemo(() => accountingService.chartOfAccounts(), [version]);
  const trial = useMemo(() => accountingService.trialBalance(), [version]);
  const gl = useMemo(() => accountingService.generalLedger(), [version]);
  const income = useMemo(() => accountingService.incomeStatement(), [version]);
  const balance = useMemo(() => accountingService.balanceSheet(), [version]);
  const cashFlow = useMemo(() => accountingService.cashFlow(), [version]);
  const cashBalance = useMemo(() => accountingService.balances().get('acc-1000') || 0, [version]);
  const ledgerRows = useMemo(
    () =>
      gl.flatMap((row) =>
        row.lines.map((line, idx) => ({
          id: `${row.id}-${idx}`,
          account: row.account.name,
          date: line.date,
          memo: line.memo,
          debitYer: line.debitYer,
          creditYer: line.creditYer,
          refId: line.refId,
          source: line.source
        }))
      ),
    [gl]
  );

  const addAccount = (event: FormEvent) => {
    event.preventDefault();
    accountingService.addAccount({ ...accountForm, isActive: true });
    setAccountForm({ code: '', name: '', type: 'asset' });
    onToast('تمت إضافة حساب جديد');
  };

  const closePeriod = (tag: 'month' | 'year') => {
    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    accountingService.closePeriod(period, tag, 'manager');
    onToast(`تم إقفال الفترة ${period}`);
  };

  const exportJson = () => {
    const pack = accountingService.exportPack();
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'accounting-pack.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12 }}>
        <KPIWidget label="رصيد الخزنة" value={`${cashBalance} YER`} />
        <KPIWidget label="التدفق النقدي الصافي" value={`${cashFlow.net} YER`} />
        <KPIWidget label="صافي الدخل" value={`${income.net} YER`} />
        <KPIWidget
          label="ميزان المراجعة"
          value={trial.balanced ? 'متوازن' : 'غير متوازن'}
          badgeTone={trial.balanced ? 'success' : 'danger'}
        />
      </div>

      <SmartForm onSubmit={addAccount}>
        <label>
          رقم الحساب
          <input value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} required />
        </label>
        <label>
          اسم الحساب
          <input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required />
        </label>
        <label>
          النوع
          <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as any })}>
            <option value="asset">أصل</option>
            <option value="liability">التزام</option>
            <option value="equity">حقوق ملكية</option>
            <option value="revenue">إيراد</option>
            <option value="expense">مصروف</option>
          </select>
        </label>
        <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '10px 16px' }}>
          إضافة حساب
        </button>
      </SmartForm>

      <DataTable
        data={coa.map((acc) => ({ ...acc, id: acc.id }))}
        columns={[
          { key: 'code', label: 'الكود' },
          { key: 'name', label: 'اسم الحساب' },
          { key: 'type', label: 'النوع' },
          { key: 'isActive', label: 'الحالة', render: (row) => (row.isActive ? <Badge>نشط</Badge> : <Badge tone="danger">موقوف</Badge>) }
        ]}
        fileName="chart-of-accounts"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 12, boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ marginTop: 0 }}>القوائم المالية</h3>
          <p>الإيراد: {income.revenue} YER</p>
          <p>المصروف: {income.expenses} YER</p>
          <p>صافي الدخل: {income.net} YER</p>
          <p>التدفق النقدي: {cashFlow.net} YER</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 12, boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ marginTop: 0 }}>إقفال الفترات</h3>
          <button onClick={() => closePeriod('month')} style={{ marginInlineEnd: 8, padding: '8px 12px' }}>
            إقفال شهري
          </button>
          <button onClick={() => closePeriod('year')} style={{ padding: '8px 12px' }}>
            إقفال سنوي
          </button>
          <button onClick={exportJson} style={{ marginInlineStart: 8, padding: '8px 12px' }}>
            تصدير JSON/Excel
          </button>
        </div>
      </div>

      <DataTable
        data={trial.rows.map((row, idx) => ({
          id: `${row.id}-${idx}`,
          account: `${row.account.code} - ${row.account.name}`,
          debit: row.debit,
          credit: row.credit
        }))}
        columns={[
          { key: 'account', label: 'الحساب' },
          { key: 'debit', label: 'مدين' },
          { key: 'credit', label: 'دائن' }
        ]}
        fileName="trial-balance"
      />

      <DataTable
        data={ledgerRows}
        columns={[
          { key: 'date', label: 'التاريخ', render: (row) => new Date(row.date).toLocaleString('ar-EG') },
          { key: 'account', label: 'الحساب' },
          { key: 'memo', label: 'الوصف' },
          { key: 'debitYer', label: 'مدين' },
          { key: 'creditYer', label: 'دائن' }
        ]}
        fileName="general-ledger"
      />
    </div>
  );
}

function ReportsView({ version }: SimpleProps) {
  const netByDoctor = useMemo(() => reportService.netByDoctor(), [version]);
  const trial = useMemo(() => accountingService.trialBalance(), [version]);
  const income = useMemo(() => accountingService.incomeStatement(), [version]);
  const balance = useMemo(() => accountingService.balanceSheet(), [version]);
  const cash = useMemo(() => accountingService.cashFlow(), [version]);
  const exportPack = () => {
    const blob = new Blob([JSON.stringify(accountingService.exportPack(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'financials.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ChartPanel
        title="صافي الأطباء"
        type="bar"
        labels={netByDoctor.map((item) => item.doctor)}
        datasets={[{ label: 'الصافي', data: netByDoctor.map((item) => item.net), backgroundColor: '#fde68a' }]}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-card)' }}>
          <h4 style={{ margin: 0 }}>قائمة الدخل</h4>
          <p>الإيرادات: {income.revenue} YER</p>
          <p>المصروفات: {income.expenses} YER</p>
          <p>الصافي: {income.net} YER</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-card)' }}>
          <h4 style={{ margin: 0 }}>المركز المالي</h4>
          <p>الأصول: {balance.totals.assets} YER</p>
          <p>الخصوم: {balance.totals.liabilities} YER</p>
          <p>حقوق الملكية: {balance.totals.equity} YER</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-card)' }}>
          <h4 style={{ margin: 0 }}>التدفق النقدي</h4>
          <p>التدفقات الداخلة: {cash.inflow} YER</p>
          <p>التدفقات الخارجة: {cash.outflow} YER</p>
          <p>الصافي: {cash.net} YER</p>
        </div>
      </div>
      <DataTable
        data={trial.rows.map((row, idx) => ({
          id: `${row.id}-r-${idx}`,
          account: row.account.name,
          debit: row.debit,
          credit: row.credit
        }))}
        columns={[
          { key: 'account', label: 'الحساب' },
          { key: 'debit', label: 'مدين' },
          { key: 'credit', label: 'دائن' }
        ]}
        fileName="trial-balance"
      />
      <PDFButton
        label="PDF الدخل الشهري"
        onGenerate={() => {
          const rows = trial.rows.map((row) => ({ account: row.account.name, debit: row.debit, credit: row.credit }));
          const doc = generateMonthlyIncomePdf(rows as any);
          doc.save('financials.pdf');
        }}
      />
      <button onClick={exportPack} style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: '#2563eb', color: '#fff' }}>
        تصدير JSON للقوائم المالية
      </button>
    </div>
  );
}

function SettingsView({ version, refresh, onToast }: ViewProps) {
  const doctors = useMemo(() => settingsService.listDoctors(), [version]);
  const toothStatuses = useMemo(() => settingsService.listToothStatuses(), [version]);
  const [doctorForm, setDoctorForm] = useState({ name: '', phone: '', specialty: '', revenueSharePercent: 40 });
  const [backupContent, setBackupContent] = useState('');
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const submitDoctor = (event: FormEvent) => {
    event.preventDefault();
    settingsService.addDoctor({ ...doctorForm, active: true });
    setDoctorForm({ name: '', phone: '', specialty: '', revenueSharePercent: 40 });
    refresh();
    onToast('تمت إضافة الطبيب');
  };
  const exportBackup = () => {
    const json = backupService.exportJSON(exportPassword || undefined);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'backup.json';
    link.click();
    URL.revokeObjectURL(link.href);
    onToast(exportPassword ? 'تم التصدير مع تشفير' : 'تم تصدير النسخة');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SmartForm onSubmit={submitDoctor}>
        <label>
          اسم الطبيب
          <input value={doctorForm.name} onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} />
        </label>
        <label>
          الهاتف
          <input value={doctorForm.phone} onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} />
        </label>
        <label>
          التخصص
          <input value={doctorForm.specialty} onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })} />
        </label>
        <label>
          نسبة المشاركة %
          <input type="number" value={doctorForm.revenueSharePercent} onChange={(e) => setDoctorForm({ ...doctorForm, revenueSharePercent: parseInt(e.target.value || '0', 10) })} />
        </label>
        <button style={{ borderRadius: 12, border: 'none', background: '#0f766e', color: '#fff', padding: '12px 18px' }}>إضافة طبيب</button>
      </SmartForm>
      <DataTable data={doctors} columns={[{ key: 'name', label: 'الاسم' }, { key: 'specialty', label: 'التخصص' }, { key: 'revenueSharePercent', label: 'النسبة %' }]} fileName="doctors" />
      <DataTable data={toothStatuses} columns={[{ key: 'labelAr', label: 'الحالة' }, { key: 'color', label: 'اللون' }]} fileName="tooth-statuses" />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 220px' }}>
          كلمة مرور التشفير (اختياري)
          <input type="password" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} />
        </label>
        <button onClick={exportBackup} style={{ borderRadius: 12, border: 'none', background: '#2563eb', color: '#fff', padding: '12px 18px' }}>
          تصدير نسخة احتياطية
        </button>
        <label style={{ flex: '1 1 220px' }}>
          كلمة مرور فك التشفير
          <input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)} />
        </label>
        <label style={{ width: '100%' }}>
          استعادة (JSON)
          <textarea value={backupContent} onChange={(e) => setBackupContent(e.target.value)} rows={4} style={{ width: '100%' }} />
          <button
            onClick={() => {
              if (!backupContent) return;
              try {
                backupService.importJSON(backupContent, importPassword || undefined);
                refresh();
                onToast(importPassword ? 'تمت الاستعادة بعد فك التشفير' : 'تمت الاستعادة');
              } catch (error) {
                onToast(error instanceof Error ? error.message : 'تعذر الاستعادة');
              }
            }}
            style={{ marginTop: 8, borderRadius: 12, border: 'none', background: '#f59e0b', color: '#fff', padding: '8px 14px' }}
          >
            استعادة
          </button>
        </label>
      </div>
    </div>
  );
}

function AuditView({ version }: SimpleProps) {
  const logs = useMemo(() => [...auditService.list()].reverse().slice(0, 50), [version]);
  return (
    <DataTable
      data={logs}
      columns={[
        { key: 'ts', label: 'الوقت' },
        { key: 'user', label: 'المستخدم' },
        { key: 'entity', label: 'الكيان' },
        { key: 'action', label: 'الإجراء' }
      ]}
      fileName="audit-log"
    />
  );
}

const cardStyle = {
  borderRadius: '20px',
  boxShadow: '0 10px 30px rgba(15, 118, 110, 0.1)',
  background: 'var(--surface-light, #fff)',
  color: 'var(--text-strong, #0f172a)'
};

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState('');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const paletteRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        setTimeout(() => paletteRef.current?.focus(), 30);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    if (media.matches) setTheme('dark');
    const listener = (event: MediaQueryListEvent) => setTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const refresh = () => setVersion((prev) => prev + 1);
  const onToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };
  const globalResults = useMemo(() => (searchTerm ? patientService.search(searchTerm) : []), [searchTerm, version]);
  const paletteItems = useMemo(
    () => {
      const base = [
        ...menu.map((item) => ({
          id: `nav-${item.key}`,
          label: item.label,
          hint: 'انتقال',
          action: () => setView(item.key)
        })),
        ...patientService.list().map((patient) => ({
          id: patient.id,
          label: patient.fullNameAr,
          hint: patient.phone,
          action: () => {
            setView('patients');
            setSearchTerm(patient.fullNameAr);
          }
        })),
        ...appointmentService.today().map((appointment) => ({
          id: appointment.id,
          label: `موعد ${new Date(appointment.start).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`,
          hint: appointment.room,
          action: () => setView('appointments')
        })),
        {
          id: 'action-backup',
          label: 'توليد نسخة احتياطية مشفرة',
          hint: 'BackupService',
          action: () => {
            backupService.exportJSON();
            onToast('تم تجهيز ملف النسخ الاحتياطي');
          }
        }
      ];
      const query = paletteQuery.trim().toLowerCase();
      const filtered = query
        ? base.filter((item) => item.label.toLowerCase().includes(query) || item.hint.toLowerCase().includes(query))
        : base;
      return filtered.slice(0, 12);
    },
    [paletteQuery, version]
  );
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <strong>مركز ابتسامة</strong>
      {menu.map((item) => (
        <button
          key={item.key}
          onClick={() => setView(item.key)}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '10px 12px',
            textAlign: 'right',
            background: view === item.key ? '#0f766e' : 'transparent',
            color: view === item.key ? '#fff' : '#e2e8f0'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
  const topbar = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        ref={searchRef}
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="بحث Ctrl+K"
        style={{ borderRadius: 999, border: '1px solid #cbd5f5', padding: '8px 16px', flex: '1 1 220px' }}
      />
      <button
        onClick={() => {
          setPaletteOpen(true);
          setTimeout(() => paletteRef.current?.focus(), 30);
        }}
        style={{ borderRadius: 999, border: '1px solid #0f766e', background: '#ecfeff', color: '#0f766e', padding: '8px 16px' }}
      >
        ✨ لوحة الأوامر
      </button>
      <button
        onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        style={{ borderRadius: 999, border: 'none', background: '#0f172a', color: '#fff', padding: '8px 16px' }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <button onClick={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))} style={{ borderRadius: 999, border: 'none', background: '#1d4ed8', color: '#fff', padding: '8px 16px' }}>
        {lang === 'ar' ? 'EN' : 'AR'}
      </button>
      <span style={{ fontSize: '0.85rem', color: '#475569' }}>النظام يدعم الريال اليمني فقط</span>
    </div>
  );
  return (
    <AppShell dir={lang === 'ar' ? 'rtl' : 'ltr'} sidebar={sidebar} topbar={topbar}>
      {paletteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 24,
            zIndex: 50
          }}
          onClick={() => setPaletteOpen(false)}
        >
          <div
            style={{ width: 'min(720px, 100%)', ...cardStyle, padding: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={paletteRef}
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              placeholder="ابحث عن مريض، موعد، أو أمر سريع..."
              style={{ width: '100%', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 14px', marginBottom: 12 }}
            />
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto' }}>
              {paletteItems.map((item) => (
                <li key={item.id}>
                  <button
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      item.action();
                      setPaletteOpen(false);
                    }}
                  >
                    <span>{item.label}</span>
                    <Tag>{item.hint}</Tag>
                  </button>
                </li>
              ))}
              {paletteItems.length === 0 && <EmptyState title="لا نتائج" />}
            </ul>
          </div>
        </div>
      )}
      {globalResults.length > 0 && searchTerm && (
        <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
          <strong>نتائج البحث</strong>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {globalResults.map((patient) => (
              <li key={patient.id}>{patient.fullNameAr} – {patient.phone}</li>
            ))}
          </ul>
        </div>
      )}
      {view === 'dashboard' && <DashboardView version={version} />}
      {view === 'patients' && <PatientsView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'appointments' && <AppointmentsView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'sessions' && <SessionsView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'billing' && <BillingView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'inventory' && <InventoryView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'lab' && <LabOrdersView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'suppliers' && <SuppliersView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'accounting' && <AccountingView version={version} refresh={refresh} onToast={showToast} />}
      {view === 'reports' && <ReportsView version={version} />}
      {view === 'settings' && <SettingsView version={version} refresh={refresh} onToast={onToast} />}
      {view === 'audit' && <AuditView version={version} />}
      <Toast message={toast} />
    </AppShell>
  );
}
