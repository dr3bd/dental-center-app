import { db } from '../repositories/inMemoryDatabase';
import { accountingService } from './accountingService';
import { appointmentService } from './appointmentService';
import { inventoryService } from './inventoryService';

export class ReportService {
  incomeByPeriod(start: string, end: string) {
    const entries = db
      .table('journalEntries')
      .filter((entry) => entry.date >= start && entry.date <= end);
    const accounts = db.table('accounts');
    return entries.reduce((sum, entry) => {
      const revenueLines = entry.lines.filter((line) => accounts.find((a) => a.id === line.accountId)?.type === 'revenue');
      const entryRevenue = revenueLines.reduce((acc, line) => acc + (line.creditYer - line.debitYer), 0);
      return sum + entryRevenue;
    }, 0);
  }

  expenseByCategory() {
    const map = new Map<string, number>();
    const accounts = db.table('accounts').filter((a) => a.type === 'expense');
    const balances = accountingService.balances();
    accounts.forEach((acc) => {
      const total = balances.get(acc.id) || 0;
      if (total > 0) map.set(acc.name, total);
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
    const balances = accountingService.balances();
    return balances.get('acc-1000') || 0;
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
    const balances = accountingService.balances();
    const income = accountingService.incomeStatement();
    const labCost = balances.get('acc-5100') || 0;
    const materialCost = balances.get('acc-5000') || 0;
    return { income: income.revenue, labCost, materialCost, net: income.net };
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
