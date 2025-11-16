import { Appointment, AuditLogEntry, BackupPayload, Doctor, InventoryBatch, InventoryItem, Invoice, LabOrder, LedgerEntry, Patient, PatientTooth, PaymentVoucher, Receipt, Session, Supplier, ToothStatus } from '../models';
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
  auditLog: AuditLogEntry[];
};

export class InMemoryDatabase {
  private data: EntityMap;

  constructor(initialData?: Partial<EntityMap>) {
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
      auditLog: [],
      ...initialData
    } as EntityMap;
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
  }

  remove<K extends keyof EntityMap>(key: K, matcher: (item: EntityMap[K][number]) => boolean) {
    this.data[key] = this.data[key].filter((item) => !matcher(item)) as EntityMap[K];
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
  }
}

export const db = new InMemoryDatabase();
