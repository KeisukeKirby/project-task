'use client';

import { I18nProvider } from '@/i18n';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function HomePage() {
  return (
    <I18nProvider>
      <DashboardShell />
    </I18nProvider>
  );
}
