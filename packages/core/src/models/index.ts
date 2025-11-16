export type Gender = 'male' | 'female';
export type AppointmentStatus = 'scheduled' | 'checked-in' | 'completed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'partial' | 'paid' | 'void';
export type LabOrderStatus = 'pending' | 'sent' | 'received' | 'delivered';
export type LedgerDirection = 'in' | 'out';

export interface Doctor {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  active: boolean;
  revenueSharePercent: number;
}

export interface Patient {
  id: string;
  code: string;
  fullNameAr: string;
  fullNameEn?: string;
  gender: Gender;
  dob: string;
  phone: string;
  address: string;
  notesMedical?: string;
  doctorId: string;
  createdAt: string;
}

export interface ToothStatus {
  id: string;
  code: string;
  labelAr: string;
  labelEn: string;
  color: string;
  isDefault: boolean;
}

export interface PatientTooth {
  id: string;
  patientId: string;
  toothNumber: string;
  statusId: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  start: string;
  end: string;
  room: string;
  status: AppointmentStatus;
  note?: string;
}

export interface Session {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  proceduresJson: string;
  teethJson: string;
  materialsJson: string;
  durationMin: number;
  feeYer: number;
  attachments: string[];
}

export interface Invoice {
  id: string;
  patientId: string;
  date: string;
  totalYer: number;
  paidYer: number;
  status: InvoiceStatus;
  linkedSessionId?: string;
  notes?: string;
}

export interface Receipt {
  id: string;
  invoiceId?: string;
  date: string;
  amountYer: number;
  method: string;
  ref?: string;
  createdBy: string;
  voided: boolean;
}

export interface PaymentVoucher {
  id: string;
  date: string;
  amountYer: number;
  payee: string;
  reason: string;
  createdBy: string;
  voided: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  sku: string;
  minLevel: number;
  notes?: string;
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  batchNo: string;
  expiryDate: string;
  qtyIn: number;
  qtyOut: number;
  costYer: number;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  patientId: string;
  doctorId: string;
  type: string;
  sentDate: string;
  dueDate: string;
  labName: string;
  costYer: number;
  status: LabOrderStatus;
  notes?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  refId?: string;
  direction: LedgerDirection;
  amountYer: number;
  note?: string;
}

export interface AuditLogEntry {
  id: string;
  ts: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  deltaJson: string;
}

export interface BackupPayload {
  doctors: Doctor[];
  patients: Patient[];
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
  toothStatuses: ToothStatus[];
  patientTeeth: PatientTooth[];
}
