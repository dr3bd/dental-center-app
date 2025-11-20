import { Patient, PatientTooth } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { auditService } from './auditService';

export class PatientService {
  create(patient: Omit<Patient, 'id' | 'code' | 'createdAt'>) {
    const newPatient: Patient = {
      ...patient,
      id: `pat-${Date.now()}`,
      code: `P${(db.table('patients').length + 1).toString().padStart(4, '0')}`,
      createdAt: new Date().toISOString()
    };
    db.table('patients').push(newPatient);
    auditService.log('system', 'create', 'patient', newPatient.id, newPatient);
    return newPatient;
  }

  update(id: string, patch: Partial<Patient>) {
    const patients = db.table('patients');
    const existing = patients.find((p) => p.id === id);
    if (!existing) throw new Error('المريض غير موجود');
    const updated = { ...existing, ...patch };
    db.upsert('patients', updated, (p) => p.id === id);
    auditService.log('system', 'update', 'patient', id, patch);
    return updated;
  }

  list() {
    return db.table('patients');
  }

  search(term: string) {
    const lc = term.toLowerCase();
    return db.table('patients').filter((p) => p.fullNameAr.toLowerCase().includes(lc) || p.phone.includes(term));
  }

  attachFiles(id: string, files: string[]) {
    return { id, files };
  }

  getToothMap(patientId: string) {
    return db.table('patientTeeth').filter((t) => t.patientId === patientId);
  }

  setToothStatus(patientId: string, toothNumber: string, statusId: string, notes?: string) {
    const record: PatientTooth = {
      id: `${patientId}-${toothNumber}`,
      patientId,
      toothNumber,
      statusId,
      notes
    };
    db.upsert('patientTeeth', record, (t) => t.patientId === patientId && t.toothNumber === toothNumber);
    auditService.log('system', 'update', 'patientTooth', record.id, record);
    return record;
  }
}

export const patientService = new PatientService();
