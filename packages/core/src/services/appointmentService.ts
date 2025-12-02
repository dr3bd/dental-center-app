import { Appointment, AppointmentStatus } from '../models';
import { db } from '../repositories/inMemoryDatabase';
import { auditService } from './auditService';

export class AppointmentService {
  list(range?: { start: string; end: string }) {
    let records = [...db.table('appointments')];
    if (range) {
      const startTs = new Date(range.start).getTime();
      const endTs = new Date(range.end).getTime();
      records = records.filter((appointment) => {
        const ts = new Date(appointment.start).getTime();
        return ts >= startTs && ts <= endTs;
      });
    }
    return records.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  today() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return this.list({ start: start.toISOString(), end: end.toISOString() });
  }

  create(payload: Omit<Appointment, 'id'> & { id?: string }) {
    const appointment: Appointment = {
      ...payload,
      id: payload.id ?? `app-${Date.now()}`,
      status: payload.status ?? 'scheduled'
    };
    db.table('appointments').push(appointment);
    auditService.log('system', 'create', 'appointment', appointment.id, appointment);
    return appointment;
  }

  reschedule(id: string, start: string, end: string) {
    const appointment = db.table('appointments').find((app) => app.id === id);
    if (!appointment) {
      throw new Error('الموعد غير موجود');
    }
    appointment.start = start;
    appointment.end = end;
    auditService.log('system', 'update', 'appointment', id, { start, end });
    return appointment;
  }

  updateStatus(id: string, status: AppointmentStatus) {
    const appointment = db.table('appointments').find((app) => app.id === id);
    if (!appointment) {
      throw new Error('الموعد غير موجود');
    }
    appointment.status = status;
    auditService.log('system', 'update', 'appointment', id, { status });
    return appointment;
  }
}

export const appointmentService = new AppointmentService();
