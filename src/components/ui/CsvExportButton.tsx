'use client';

import React from 'react';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { useTaskStore, useProjectStore, useUserStore } from '@/stores';
import { useI18n, getMultiLangText } from '@/i18n';

export function CsvExportButton() {
  const { lang, t } = useI18n();
  const tasks = useTaskStore((s) => s.tasks);
  const projects = useProjectStore((s) => s.projects);
  const users = useUserStore((s) => s.users);

  const handleExport = () => {
    // Transform tasks to CSV format
    const rows = tasks.map(task => {
      const project = projects.find(p => p.id === task.project_id);
      const assigneeNames = task.assignees
        .map(id => users.find(u => u.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      return {
        Project: project ? getMultiLangText(project.name, lang) : '',
        Task: typeof task.name === 'string' ? task.name : getMultiLangText(task.name, lang),
        Assignee: assigneeNames || '未割当',
        Status: task.status,
        Priority: task.priority,
        StartDate: task.planned_start_date || '',
        Deadline: task.planned_end_date || '',
        LeadDays: task.estimated_lead_days || 1,
      };
    });

    const csvStr = Papa.unparse(rows);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      title={t('common.download') || 'Export Backup'}
      className="flex items-center gap-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-sm font-medium transition-colors border border-surface-200 shadow-sm"
    >
      <Download className="w-4 h-4" />
      CSV Export
    </button>
  );
}
