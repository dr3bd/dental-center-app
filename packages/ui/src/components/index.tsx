import './app-shell.css';
import '../styles/tokens.css';
import type { CSSProperties, FormEventHandler, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { utils as xlsxUtils, writeFileXLSX } from 'xlsx';
import { AppShell } from './AppShell';

export { AppShell };

const cardStyle: CSSProperties = {
  borderRadius: '20px',
  boxShadow: 'var(--shadow-card)',
  background: 'var(--card-surface)',
  border: '1px solid rgba(15, 118, 110, 0.07)'
};

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  data: T[];
  searchableKeys?: (keyof T)[];
  initialSortKey?: keyof T;
  fileName?: string;
}

export function DataTable<T extends { id: string }>({ columns, data, searchableKeys, initialSortKey, fileName }: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: keyof T | null; dir: 'asc' | 'desc' }>({
    key: initialSortKey ?? null,
    dir: 'asc'
  });

  const computedSearchKeys = searchableKeys ?? (columns.map((col) => col.key) as (keyof T)[]);

  const filtered = useMemo(() => {
    if (!search) return data;
    const value = search.toLowerCase();
    return data.filter((row) =>
      computedSearchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(value))
    );
  }, [data, search, computedSearchKeys]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    return [...filtered].sort((a, b) => {
      const aComparable = String(a[sort.key] ?? '');
      const bComparable = String(b[sort.key] ?? '');
      if (aComparable === bComparable) return 0;
      return sort.dir === 'asc' ? (aComparable > bComparable ? 1 : -1) : (aComparable < bComparable ? 1 : -1);
    });
  }, [filtered, sort]);

  const exportCsv = () => {
    const header = columns.map((col) => col.label);
    const rows = sorted.map((row) => columns.map((col) => String(row[col.key] ?? '')));
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName ?? 'table'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    const rows = sorted.map((row) => {
      const entry: Record<string, string> = {};
      columns.forEach((col) => {
        entry[col.label] = String(row[col.key] ?? '');
      });
      return entry;
    });
    const worksheet = xlsxUtils.json_to_sheet(rows);
    const workbook = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(workbook, worksheet, 'Data');
    writeFileXLSX(workbook, `${fileName ?? 'table'}.xlsx`);
  };

  const toggleSort = (key: keyof T) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  return (
    <div style={{ ...cardStyle, padding: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث..."
          style={{ borderRadius: 12, border: '1px solid #e2e8f0', padding: '8px 14px', flex: '1 1 200px' }}
        />
        <button type="button" onClick={exportCsv} style={{ borderRadius: 999, border: 'none', background: '#cbd5f5', padding: '8px 14px' }}>
          CSV
        </button>
        <button type="button" onClick={exportXlsx} style={{ borderRadius: 999, border: 'none', background: '#a5b4fc', padding: '8px 14px' }}>
          Excel
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ textAlign: 'right', padding: '12px', background: '#f3f4f6', cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  onClick={() => (col.sortable === false ? undefined : toggleSort(col.key))}
                >
                  {col.label}
                  {sort.key === col.key && <span> {sort.dir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {columns.map((col) => (
                  <td key={String(col.key)} style={{ padding: '12px' }}>
                    {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ToothFDI({ selected, onSelect }: { selected: string[]; onSelect: (next: string[]) => void }) {
  const teeth = Array.from({ length: 32 }).map((_, idx) => (idx + 11).toString());
  const toggle = (tooth: string) => {
    if (selected.includes(tooth)) {
      onSelect(selected.filter((t) => t !== tooth));
    } else {
      onSelect([...selected, tooth]);
    }
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 8 }}>
      {teeth.map((tooth) => (
        <button
          type="button"
          key={tooth}
          style={{
            borderRadius: 10,
            border: '1px solid',
            borderColor: selected.includes(tooth) ? '#059669' : '#e5e7eb',
            background: selected.includes(tooth) ? '#bbf7d0' : '#fff',
            padding: '6px',
            fontSize: '0.75rem'
          }}
          onClick={() => toggle(tooth)}
        >
          {tooth}
        </button>
      ))}
    </div>
  );
}

export function MoneyInputYER({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      dir="ltr"
      inputMode="numeric"
      type="number"
      step="1"
      min="0"
      value={value}
      onChange={(event) => onChange(parseInt(event.target.value || '0', 10))}
      style={{ borderRadius: 12, border: '1px solid #e2e8f0', padding: '10px 14px', width: '100%' }}
      placeholder="0 YER"
    />
  );
}

export function SmartForm({ children, onSubmit }: { children: ReactNode; onSubmit?: FormEventHandler<HTMLFormElement> }) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
      }}
    >
      {children}
    </form>
  );
}

export function KPIWidget({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{label}</span>
      <strong style={{ fontSize: '1.8rem' }}>{value}</strong>
      {trend && <span style={{ fontSize: '0.75rem', color: '#059669' }}>{trend}</span>}
    </div>
  );
}

export interface PDFButtonProps {
  label: string;
  onGenerate?: () => Promise<void> | void;
  title?: string;
  head?: string[];
  body?: (string | number)[][];
}

export function PDFButton({ label, onGenerate, title, head, body }: PDFButtonProps) {
  const [busy, setBusy] = useState(false);
  const handleClick = async () => {
    try {
      setBusy(true);
      if (onGenerate) {
        await onGenerate();
        return;
      }
      if (!head || !body) {
        window.alert('يجب توفير بيانات الجدول أو دالة توليد PDF');
        return;
      }
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ format: 'a4' });
      doc.text(title ?? 'تقرير', 105, 15, { align: 'center' });
      autoTable(doc, {
        head: [head],
        body,
        styles: { halign: 'right' },
        margin: { top: 30 }
      });
      doc.save(`${title ?? 'report'}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      style={{ padding: '4px 12px', borderRadius: 999, background: '#0f766e', color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}
    >
      {busy ? 'جارٍ التوليد...' : label}
    </button>
  );
}

interface ChartDatasetShape {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export interface ChartPanelProps {
  title: string;
  type?: 'line' | 'bar' | 'pie';
  labels?: string[];
  datasets?: ChartDatasetShape[];
  children?: ReactNode;
  footer?: ReactNode;
  pdf?: PDFButtonProps;
}

export function ChartPanel({ title, type = 'line', labels, datasets, children, footer, pdf }: ChartPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const labelsSignature = labels?.join('|') ?? '';
  const datasetSignature = datasets ? JSON.stringify(datasets) : '';
  const derivedPdf = useMemo(() => {
    if (pdf) return pdf;
    if (!labels || !datasets || datasets.length === 0) return undefined;
    const primary = datasets[0];
    return {
      label: 'PDF',
      title,
      head: ['البند', primary.label],
      body: labels.map((label, index) => [label, primary.data[index] ?? 0])
    } satisfies PDFButtonProps;
  }, [pdf, labels, datasets, title]);

  useEffect(() => {
    if (!labels || !datasets || labels.length === 0 || datasets.length === 0) return;
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type,
      data: {
        labels,
        datasets: datasets.map((dataset) => ({
          ...dataset,
          fill: type === 'line',
          tension: 0.3
        }))
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    });
    return () => chartRef.current?.destroy();
  }, [type, labelsSignature, datasetSignature]);

  return (
    <section style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {derivedPdf && <PDFButton {...derivedPdf} />}
      </div>
      {labels && datasets && labels.length > 0 ? <canvas ref={canvasRef} dir="ltr" /> : children}
      {footer}
    </section>
  );
}

export function ConfirmDialog({ title, message, onConfirm }: { title: string; message: string; onConfirm: () => void }) {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <h4>{title}</h4>
      <p style={{ fontSize: '0.9rem' }}>{message}</p>
      <button style={{ padding: '10px 18px', borderRadius: 12, background: '#dc2626', color: '#fff', border: 'none' }} onClick={onConfirm}>
        تأكيد
      </button>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        background: '#111827',
        color: '#fff',
        padding: '10px 16px',
        borderRadius: 12
      }}
    >
      {message}
    </div>
  );
}

export const Tag = ({ children }: { children: ReactNode }) => (
  <span style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: 999, background: '#f1f5f9' }}>{children}</span>
);

export const Badge = ({ tone = 'brand', children }: { tone?: 'brand' | 'danger'; children: ReactNode }) => (
  <span
    style={{
      padding: '4px 12px',
      fontSize: '0.75rem',
      borderRadius: 999,
      color: tone === 'brand' ? '#065f46' : '#b91c1c',
      background: tone === 'brand' ? '#d1fae5' : '#fee2e2'
    }}
  >
    {children}
  </span>
);

export const Stepper = ({ steps, active }: { steps: string[]; active: number }) => (
  <ol style={{ display: 'flex', gap: 8, fontSize: '0.75rem', listStyle: 'none', padding: 0 }}>
    {steps.map((step, idx) => (
      <li
        key={step}
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          background: idx === active ? '#0f766e' : '#e2e8f0',
          color: idx === active ? '#fff' : '#0f172a'
        }}
      >
        {step}
      </li>
    ))}
  </ol>
);

export const EmptyState = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div
    style={{
      ...cardStyle,
      border: '2px dashed #e5e7eb',
      textAlign: 'center',
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}
  >
    <p style={{ color: '#94a3b8' }}>{title}</p>
    {action}
  </div>
);
