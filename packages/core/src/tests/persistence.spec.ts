import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { InMemoryDatabase } from '../repositories/inMemoryDatabase';

describe('Persistent storage', () => {
  it('writes to disk and reloads the same snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'clinic-'));
    process.env.DATA_DIR = dir;
    const db = new InMemoryDatabase();
    const firstPatient = { ...db.table('patients')[0] };
    const updated = { ...firstPatient, full_name_ar: firstPatient.full_name_ar + ' - محدث' };
    db.upsert('patients', updated, (p) => p.id === updated.id);

    const file = readFileSync(join(dir, 'clinic-db.json'), 'utf-8');
    expect(file).toContain('clinic-db');

    const reloaded = new InMemoryDatabase();
    const patient = reloaded.table('patients').find((p) => p.id === updated.id);
    expect(patient?.full_name_ar).toBe(updated.full_name_ar);

    rmSync(dir, { recursive: true, force: true });
  });
});
