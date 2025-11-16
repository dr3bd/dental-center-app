import { Doctor, ToothStatus } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { auditService } from './auditService';

export class SettingsService {
  listDoctors() {
    return db.table('doctors');
  }

  addDoctor(doctor: Omit<Doctor, 'id'>) {
    const newDoctor: Doctor = { ...doctor, id: `doc-${Date.now()}` };
    db.table('doctors').push(newDoctor);
    auditService.log('system', 'create', 'doctor', newDoctor.id, newDoctor);
    return newDoctor;
  }

  updateDoctor(id: string, patch: Partial<Doctor>) {
    const doctor = db.table('doctors').find((doc) => doc.id === id);
    if (!doctor) throw new Error('الطبيب غير موجود');
    Object.assign(doctor, patch);
    auditService.log('system', 'update', 'doctor', id, patch);
    return doctor;
  }

  listToothStatuses() {
    return db.table('toothStatuses');
  }

  updateToothStatus(id: string, patch: Partial<ToothStatus>) {
    const status = db.table('toothStatuses').find((s) => s.id === id);
    if (!status) throw new Error('الحالة غير موجودة');
    Object.assign(status, patch);
    auditService.log('system', 'update', 'toothStatus', id, patch);
    return status;
  }
}

export const settingsService = new SettingsService();
