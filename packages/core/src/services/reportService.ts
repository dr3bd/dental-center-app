import { db } from '../repositories/inMemoryDatabase';
import { appointmentService } from './appointmentService';
import { inventoryService } from './inventoryService';

export class ReportService {
  incomeByPeriod(start: string, end: string) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return db
      .table('ledger')
      .filter((entry) => entry.direction === 'in')
      .filter((entry) => {
        const ts = new Date(entry.date).getTime();
        return ts >= s && ts <= e;
      })
      .reduce((sum, entry) => sum + entry.amountYer, 0);
  }

  expenseByCategory() {
    const map = new Map<string, number>();
    db
      .table('paymentVouchers')
      .forEach((voucher) => {
        const key = voucher.reason || 'أخرى';
        map.set(key, (map.get(key) || 0) + voucher.amountYer);
      });
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
  }

  netByDoctor() {
    const invoices = db.table('invoices');
    const doctors = db.table('doctors');
    return doctors.map((doctor) => {
      const total = invoices
        .filter((inv) => inv.patientId && db.table('patients').find((p) => p.id === inv.patientId)?.doctorId === doctor.id)
        .reduce((sum, inv) => sum + inv.totalYer, 0);
      const share = Math.round(total * (doctor.revenueSharePercent / 100));
      return { doctor: doctor.name, total, share, net: total - share };
    });
  }

  cashBalance() {
    const ledger = db.table('ledger');
    return ledger.reduce((balance, entry) => {
      return balance + (entry.direction === 'in' ? entry.amountYer : -entry.amountYer);
    }, 0);
  }

  incomeTrend(days = 7) {
    const points = [] as { label: string; total: number }[];
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      points.push({
        label: start.toLocaleDateString('ar-YE', { weekday: 'short' }),
        total: this.incomeByPeriod(start.toISOString(), end.toISOString())
      });
    }
    return points;
  }

  netAfterLabAndMaterials() {
    const labCost = db.table('labOrders').reduce((sum, order) => sum + order.costYer, 0);
    const materialCost = db.table('inventoryBatches').reduce((sum, batch) => sum + batch.costYer, 0);
    const income = this.incomeByPeriod('1970-01-01', new Date().toISOString());
    return { income, labCost, materialCost, net: income - (labCost + materialCost) };
  }

  invoiceAging() {
    const invoices = db.table('invoices');
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const buckets = {
      current: 0,
      grace: 0,
      overdue: 0
    };
    let unpaidTotal = 0;

    invoices.forEach((invoice) => {
      if (invoice.status === 'paid' || invoice.status === 'void') return;
      const ageDays = Math.floor((now - new Date(invoice.date).getTime()) / dayMs);
      unpaidTotal += invoice.totalYer - invoice.paidYer;
      if (ageDays <= 14) buckets.current += 1;
      else if (ageDays <= 30) buckets.grace += 1;
      else buckets.overdue += 1;
    });

    return { ...buckets, unpaidTotal };
  }

  patientMomentum() {
    const sessions = db.table('sessions');
    const patients = db.table('patients');
    const map = new Map<string, number>();
    sessions.forEach((session) => {
      map.set(session.patientId, (map.get(session.patientId) || 0) + 1);
    });
    return patients
      .map((patient) => ({
        patient,
        sessions: map.get(patient.id) || 0
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }

  dashboardSummary() {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    const newPatients = db
      .table('patients')
      .filter((patient) => new Date(patient.createdAt) >= weekStart).length;
    return {
      incomeToday: this.incomeByPeriod(start.toISOString(), end.toISOString()),
      incomeThisWeek: this.incomeByPeriod(weekStart.toISOString(), end.toISOString()),
      cashBalance: this.cashBalance(),
      newPatients,
      appointmentsToday: appointmentService.today(),
      expiringBatches: inventoryService.soonToExpire(),
      invoiceAging: this.invoiceAging(),
      momentum: this.patientMomentum()
    };
  }
}

export const reportService = new ReportService();
