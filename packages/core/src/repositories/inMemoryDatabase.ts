import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  Account,
  Appointment,
  AuditLogEntry,
  BackupPayload,
  Doctor,
  InventoryBatch,
  InventoryItem,
  Invoice,
  JournalEntry,
  LabOrder,
  LedgerEntry,
  Patient,
  PatientTooth,
  PaymentVoucher,
  Receipt,
  Session,
  Supplier,
  ToothStatus
} from '../models';
import * as seed from '../data/seed';

export interface DatabaseSnapshot extends BackupPayload {}

type EntityMap = {
  doctors: Doctor[];
  patients: Patient[];
  toothStatuses: ToothStatus[];
  patientTeeth: PatientTooth[];
  appointments: Appointment[];
  sessions: Session[];
  invoices: Invoice[];
  receipts: Receipt[];
  paymentVouchers: PaymentVoucher[];
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  inventoryBatches: InventoryBatch[];
  labOrders: LabOrder[];
  ledger: LedgerEntry[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  auditLog: AuditLogEntry[];
};

export class InMemoryDatabase {
  private data: EntityMap;
  private storagePath: string | null;

  constructor(initialData?: Partial<EntityMap>) {
    this.storagePath = this.resolveStoragePath();
    const snapshot = this.loadSnapshotFromStorage();
    this.data = {
      doctors: seed.doctors,
      patients: seed.patients,
      toothStatuses: seed.toothStatuses,
      patientTeeth: seed.patientTeeth,
      appointments: seed.appointments,
      sessions: seed.sessions,
      invoices: seed.invoices,
      receipts: seed.receipts,
      paymentVouchers: seed.paymentVouchers,
      suppliers: seed.suppliers,
      inventoryItems: seed.inventoryItems,
      inventoryBatches: seed.inventoryBatches,
      labOrders: seed.labOrders,
      ledger: seed.ledger,
      accounts: seed.accounts,
      journalEntries: seed.journalEntries,
      auditLog: [],
      ...initialData,
      ...snapshot
    } as EntityMap;
    this.persist();
  }

  table<K extends keyof EntityMap>(key: K): EntityMap[K] {
    return this.data[key];
  }

  upsert<K extends keyof EntityMap>(key: K, entity: EntityMap[K][number], matcher: (item: EntityMap[K][number]) => boolean) {
    const list = this.data[key];
    const index = list.findIndex((item) => matcher(item));
    if (index >= 0) {
      list[index] = entity as any;
    } else {
      list.push(entity as any);
    }
    this.persist();
  }

  remove<K extends keyof EntityMap>(key: K, matcher: (item: EntityMap[K][number]) => boolean) {
    this.data[key] = this.data[key].filter((item) => !matcher(item)) as EntityMap[K];
    this.persist();
  }

  snapshot(): DatabaseSnapshot {
    return JSON.parse(JSON.stringify(this.data));
  }

  reset(snapshot?: DatabaseSnapshot) {
    if (snapshot) {
      this.data = JSON.parse(JSON.stringify(snapshot));
    } else {
      this.data = new InMemoryDatabase().snapshot();
    }
    this.persist();
  }

  private resolveStoragePath(): string | null {
    if (typeof window !== 'undefined') {
      return null; // the PWA uses browser storage; skip FS writes here
    }
    const base = process.env.DATA_DIR || join(process.cwd(), 'data');
    const path = join(base, 'clinic-db.json');
    mkdirSync(base, { recursive: true });
    return path;
  }

  private loadSnapshotFromStorage(): Partial<EntityMap> {
    if (!this.storagePath) return {};
    if (!existsSync(this.storagePath)) return {};
    try {
      const raw = readFileSync(this.storagePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed as Partial<EntityMap>;
    } catch (err) {
      console.warn('Failed to load persisted database, using seed instead', err);
      return {};
    }
  }

  private persist() {
    if (this.storagePath) {
      const snapshot = JSON.stringify(this.data, null, 2);
      writeFileSync(this.storagePath, snapshot, 'utf-8');
    }
    if (typeof window !== 'undefined' && window?.localStorage) {
      const snapshot = JSON.stringify(this.data);
      window.localStorage.setItem('clinic-db', snapshot);
    }
  }
}

export const db = new InMemoryDatabase();
