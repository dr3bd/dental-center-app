import { Account, AccountType, JournalEntry, JournalLine } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { ensureYer } from '../utils/currency';
import { auditService } from './auditService';

const systemAccounts = {
  cash: 'acc-1000',
  receivablePatients: 'acc-1100',
  inventory: 'acc-1200',
  labAdvance: 'acc-1300',
  payableSuppliers: 'acc-2000',
  payableDoctors: 'acc-2100',
  retainedEarnings: 'acc-3000',
  openingEquity: 'acc-3100',
  revenueDental: 'acc-4000',
  otherIncome: 'acc-4100',
  clinicalExpense: 'acc-5000',
  labExpense: 'acc-5100',
  doctorExpense: 'acc-5200',
  operatingExpense: 'acc-5900'
};

export class AccountingService {
  chartOfAccounts() {
    return db.table('accounts');
  }

  addAccount(account: Omit<Account, 'id'>) {
    const codeExists = db.table('accounts').some((acc) => acc.code === account.code);
    if (codeExists) throw new Error('رقم الحساب مستخدم مسبقًا');
    const newAccount: Account = { ...account, id: `acc-${Date.now()}` };
    db.table('accounts').push(newAccount);
    auditService.log('system', 'create', 'account', newAccount.id, newAccount);
    return newAccount;
  }

  updateAccount(id: string, patch: Partial<Account>) {
    const accounts = db.table('accounts');
    const account = accounts.find((acc) => acc.id === id);
    if (!account) throw new Error('الحساب غير موجود');
    const updated = { ...account, ...patch };
    db.upsert('accounts', updated, (acc) => acc.id === id);
    auditService.log('system', 'update', 'account', id, patch);
    return updated;
  }

  recordEntry(payload: {
    date: string;
    memo: string;
    source: string;
    refId?: string;
    postedBy: string;
    lines: Array<Pick<JournalLine, 'accountId' | 'debitYer' | 'creditYer' | 'memo'>>;
    closingTag?: 'month' | 'year';
  }) {
    if (!payload.lines.length) throw new Error('يجب إضافة سطور للقيد');
    const accounts = db.table('accounts');
    let debitTotal = 0;
    let creditTotal = 0;
    const lines: JournalLine[] = payload.lines.map((line, idx) => {
      ensureYer(line.debitYer || line.creditYer);
      debitTotal += line.debitYer || 0;
      creditTotal += line.creditYer || 0;
      if (!accounts.find((acc) => acc.id === line.accountId)) {
        throw new Error('حساب غير معروف في القيد');
      }
      return {
        id: `jl-${Date.now()}-${idx}`,
        accountId: line.accountId,
        debitYer: line.debitYer || 0,
        creditYer: line.creditYer || 0,
        memo: line.memo
      };
    });
    if (debitTotal !== creditTotal) {
      throw new Error('القيد غير متوازن (مدين لا يساوي دائن)');
    }
    const entry: JournalEntry = {
      id: `je-${Date.now()}`,
      date: payload.date,
      memo: payload.memo,
      source: payload.source,
      refId: payload.refId,
      postedBy: payload.postedBy,
      createdAt: new Date().toISOString(),
      period: payload.date.substring(0, 7),
      lines,
      closingTag: payload.closingTag
    };
    db.table('journalEntries').push(entry);
    this.reflectCashInLedger(entry);
    auditService.log(payload.postedBy, 'create', 'journalEntry', entry.id, entry);
    return entry;
  }

  private reflectCashInLedger(entry: JournalEntry) {
    entry.lines
      .filter((line) => line.accountId === systemAccounts.cash)
      .forEach((line) => {
        const direction = line.debitYer > 0 ? 'in' : 'out';
        const amount = line.debitYer > 0 ? line.debitYer : line.creditYer;
        db.table('ledger').push({
          id: `led-${entry.id}-${line.id}`,
          date: entry.date,
          type: entry.source,
          refId: entry.refId,
          direction,
          amountYer: amount,
          note: entry.memo
        });
      });
  }

  private accountNature(accountType: AccountType) {
    return accountType === 'asset' || accountType === 'expense' || accountType === 'contra-asset' ? 'debit' : 'credit';
  }

  private filteredEntries(period?: string) {
    const entries = db.table('journalEntries');
    if (!period) return entries;
    return entries.filter((entry) => entry.period === period || entry.date.startsWith(period));
  }

  balances(period?: string) {
    const accounts = db.table('accounts');
    const totals = new Map<string, number>();
    this.filteredEntries(period).forEach((entry) => {
      entry.lines.forEach((line) => {
        const acc = accounts.find((a) => a.id === line.accountId);
        if (!acc) return;
        const isDebit = this.accountNature(acc.type) === 'debit';
        const delta = isDebit ? line.debitYer - line.creditYer : line.creditYer - line.debitYer;
        totals.set(acc.id, (totals.get(acc.id) || 0) + delta);
      });
    });
    return totals;
  }

  trialBalance(period?: string) {
    const accounts = db.table('accounts');
    const balances = this.balances(period);
    const rows = accounts.map((account) => {
      const value = balances.get(account.id) || 0;
      const debit = value >= 0 ? value : 0;
      const credit = value < 0 ? -value : 0;
      return { id: account.id, account, debit, credit };
    });
    const totals = rows.reduce(
      (agg, row) => {
        agg.debit += row.debit;
        agg.credit += row.credit;
        return agg;
      },
      { debit: 0, credit: 0 }
    );
    return { rows, totals, balanced: totals.debit === totals.credit };
  }

  generalLedger(period?: string) {
    const accounts = db.table('accounts');
    const entries = this.filteredEntries(period);
    return accounts.map((account) => {
      const lines = entries
        .flatMap((entry) =>
          entry.lines
            .filter((line) => line.accountId === account.id)
            .map((line) => ({
              entryId: entry.id,
              date: entry.date,
              memo: entry.memo,
              debitYer: line.debitYer,
              creditYer: line.creditYer,
              refId: entry.refId,
              source: entry.source
            }))
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const running = lines.reduce((sum, line) => sum + line.debitYer - line.creditYer, 0);
      return { id: account.id, account, lines, balance: running };
    });
  }

  incomeStatement(period?: string) {
    const accounts = db.table('accounts');
    const balances = this.balances(period);
    const revenue = accounts
      .filter((a) => a.type === 'revenue')
      .reduce((sum, acc) => sum + (balances.get(acc.id) || 0), 0);
    const expenses = accounts
      .filter((a) => a.type === 'expense')
      .reduce((sum, acc) => sum + (balances.get(acc.id) || 0), 0);
    const net = revenue - expenses;
    return { revenue, expenses, net };
  }

  balanceSheet(period?: string) {
    const accounts = db.table('accounts');
    const balances = this.balances(period);
    const byType = (type: AccountType) =>
      accounts
        .filter((a) => a.type === type)
        .map((acc) => ({ account: acc, amount: balances.get(acc.id) || 0 }));
    const assets = byType('asset');
    const liabilities = byType('liability');
    const equity = byType('equity');
    const totals = {
      assets: assets.reduce((s, row) => s + row.amount, 0),
      liabilities: liabilities.reduce((s, row) => s + row.amount, 0),
      equity: equity.reduce((s, row) => s + row.amount, 0)
    };
    return { assets, liabilities, equity, totals };
  }

  cashFlow(period?: string) {
    const entries = this.filteredEntries(period).filter((entry) =>
      entry.lines.some((line) => line.accountId === systemAccounts.cash)
    );
    let inflow = 0;
    let outflow = 0;
    entries.forEach((entry) => {
      entry.lines
        .filter((line) => line.accountId === systemAccounts.cash)
        .forEach((line) => {
          inflow += line.debitYer;
          outflow += line.creditYer;
        });
    });
    return { inflow, outflow, net: inflow - outflow };
  }

  closePeriod(period: string, tag: 'month' | 'year', postedBy: string) {
    const balances = this.balances(period);
    const accounts = db.table('accounts');
    const revenueAccounts = accounts.filter((acc) => acc.type === 'revenue');
    const expenseAccounts = accounts.filter((acc) => acc.type === 'expense');
    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + (balances.get(acc.id) || 0), 0);
    const totalExpense = expenseAccounts.reduce((sum, acc) => sum + (balances.get(acc.id) || 0), 0);
    if (totalRevenue === 0 && totalExpense === 0) {
      throw new Error('لا توجد حركات لإقفالها في هذه الفترة');
    }
    const closingLines: JournalLine[] = [];
    revenueAccounts.forEach((acc) => {
      const bal = balances.get(acc.id) || 0;
      if (bal > 0) {
        closingLines.push({ id: `close-${acc.id}-${Date.now()}`, accountId: acc.id, debitYer: bal, creditYer: 0 });
      }
    });
    expenseAccounts.forEach((acc) => {
      const bal = balances.get(acc.id) || 0;
      if (bal > 0) {
        closingLines.push({ id: `close-${acc.id}-${Date.now()}`, accountId: acc.id, debitYer: 0, creditYer: bal });
      }
    });
    closingLines.push({
      id: `close-retained-${Date.now()}`,
      accountId: systemAccounts.retainedEarnings,
      debitYer: totalExpense,
      creditYer: totalRevenue,
      memo: 'ترحيل الأرباح المحتجزة'
    });
    return this.recordEntry({
      date: `${period}-28`,
      memo: `إقفال ${tag === 'month' ? 'شهري' : 'سنوي'} للفترة ${period}`,
      source: 'closing',
      postedBy,
      lines: closingLines,
      closingTag: tag
    });
  }

  postInvoice(invoiceId: string, amountYer: number, doctorShare: number) {
    return this.recordEntry({
      date: new Date().toISOString(),
      memo: `فاتورة ${invoiceId}`,
      source: 'invoice',
      refId: invoiceId,
      postedBy: 'system',
      lines: [
        { accountId: systemAccounts.receivablePatients, debitYer: amountYer, creditYer: 0 },
        { accountId: systemAccounts.revenueDental, debitYer: 0, creditYer: amountYer },
        { accountId: systemAccounts.doctorExpense, debitYer: doctorShare, creditYer: 0 },
        { accountId: systemAccounts.payableDoctors, debitYer: 0, creditYer: doctorShare }
      ]
    });
  }

  postReceipt(amountYer: number, invoiceId?: string) {
    const creditAccount = invoiceId ? systemAccounts.receivablePatients : systemAccounts.otherIncome;
    return this.recordEntry({
      date: new Date().toISOString(),
      memo: invoiceId ? `تحصيل ${invoiceId}` : 'قبض نقدي',
      source: 'receipt',
      refId: invoiceId,
      postedBy: 'system',
      lines: [
        { accountId: systemAccounts.cash, debitYer: amountYer, creditYer: 0 },
        { accountId: creditAccount, debitYer: 0, creditYer: amountYer }
      ]
    });
  }

  postPayment(amountYer: number, accountId?: string, refId?: string, memo = 'سند دفع') {
    return this.recordEntry({
      date: new Date().toISOString(),
      memo,
      source: 'payment',
      refId,
      postedBy: 'system',
      lines: [
        { accountId: accountId || systemAccounts.operatingExpense, debitYer: amountYer, creditYer: 0 },
        { accountId: systemAccounts.cash, debitYer: 0, creditYer: amountYer }
      ]
    });
  }

  postInventoryPurchase(costYer: number) {
    return this.recordEntry({
      date: new Date().toISOString(),
      memo: 'شراء مخزون',
      source: 'inventory',
      postedBy: 'system',
      lines: [
        { accountId: systemAccounts.inventory, debitYer: costYer, creditYer: 0 },
        { accountId: systemAccounts.payableSuppliers, debitYer: 0, creditYer: costYer }
      ]
    });
  }

  postInventoryConsumption(costYer: number, refId?: string) {
    if (!costYer) return null;
    return this.recordEntry({
      date: new Date().toISOString(),
      memo: 'استهلاك مخزون في جلسة',
      source: 'inventory-consume',
      refId,
      postedBy: 'system',
      lines: [
        { accountId: systemAccounts.clinicalExpense, debitYer: costYer, creditYer: 0 },
        { accountId: systemAccounts.inventory, debitYer: 0, creditYer: costYer }
      ]
    });
  }

  exportPack(period?: string) {
    const trial = this.trialBalance(period);
    const income = this.incomeStatement(period);
    const balance = this.balanceSheet(period);
    const cash = this.cashFlow(period);
    return { trial, income, balance, cash, journalEntries: this.filteredEntries(period) };
  }
}

export const accountingService = new AccountingService();
export { systemAccounts };
