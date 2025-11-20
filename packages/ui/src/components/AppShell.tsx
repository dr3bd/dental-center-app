import './app-shell.css';
import type { ReactNode } from 'react';

export interface AppShellProps {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  dir?: 'rtl' | 'ltr';
}

export function AppShell({ sidebar, topbar, children, dir = 'rtl' }: AppShellProps) {
  return (
    <div className="app-shell" dir={dir}>
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <main className="app-shell__content">
        {topbar && <header className="app-shell__topbar">{topbar}</header>}
        <section className="app-shell__body">{children}</section>
      </main>
    </div>
  );
}
