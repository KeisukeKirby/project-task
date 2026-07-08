'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useTaskStore, useProjectStore, useUserStore } from '@/stores';
import { useI18n, getMultiLangText } from '@/i18n';
import type { Language } from '@/types';
import { translateText } from '@/lib/translate';

export function CsvImportButton() {
  const { lang } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          for (const row of data) {
            const projectName = (row.Project || '').trim();
            const taskName = (row.Task || '').trim();
            const assigneeStr = (row.Assignee || '').trim();
            const deadlineStr = (row.Deadline || '').trim();

            if (!projectName || !taskName) continue;

            // 1. Find or create project
            let project = projects.find(p => getMultiLangText(p.name, lang).toLowerCase() === projectName.toLowerCase());
            
            if (!project) {
              // Create new project
              const translatedName = await translateText(projectName, lang as Language);
              
              const nameField = {
                original: projectName,
                original_lang: lang as Language,
                ja: translatedName?.ja || projectName,
                en: translatedName?.en || projectName,
                th: translatedName?.th || projectName,
                ja_confirmed: true,
                en_confirmed: true,
                th_confirmed: true,
              };

              project = addProject({
                name: nameField,
                description: nameField,
                deadline_date: new Date().toISOString().split('T')[0],
                status: 'active',
                color: '#6366f1',
                icon: '📁',
                template_id: null,
                created_by: currentUser?.id || '',
                members: [],
                metadata: {}
              });
            }

            // 2. Parse Assignees
            const assignees: string[] = [];
            if (assigneeStr && assigneeStr.toLowerCase() !== '@team') {
              const nameWithoutAt = assigneeStr.replace('@', '').trim();
              const user = users.find(u => u.name.toLowerCase() === nameWithoutAt.toLowerCase());
              if (user) {
                assignees.push(user.id);
              }
            }

            // 3. Parse Deadline
            let plannedEndDate = new Date().toISOString().split('T')[0];
            if (deadlineStr && deadlineStr.toLowerCase() !== 'wait for present') {
              // e.g. "10 july" -> "2026-07-10"
              const parsedDate = new Date(`${deadlineStr} 2026`);
              if (!isNaN(parsedDate.getTime())) {
                plannedEndDate = parsedDate.toISOString().split('T')[0];
              }
            }

            // 4. Create Task
            const translatedTaskName = await translateText(taskName, lang as Language);
            const taskNameField = {
              original: taskName,
              original_lang: lang as Language,
              ja: translatedTaskName?.ja || taskName,
              en: translatedTaskName?.en || taskName,
              th: translatedTaskName?.th || taskName,
              ja_confirmed: true,
              en_confirmed: true,
              th_confirmed: true,
            };

            addTask({
              project_id: project.id,
              template_step_id: null,
              name: taskNameField,
              description: taskNameField,
              status: 'todo',
              priority: 'medium',
              sort_order: 99,
              estimated_lead_days: 1,
              actual_lead_days: null,
              planned_start_date: new Date().toISOString().split('T')[0],
              planned_end_date: plannedEndDate,
              actual_start_at: null,
              actual_end_at: null,
              assignees,
              dependencies: [],
              checklist: [],
              delay_tags: [],
              editing_user_id: null,
              editing_started_at: null,
              created_by: currentUser?.id || '',
            });
          }

          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('Failed to import CSV:', error);
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        console.error('CSV Parsing error:', error);
        setIsImporting(false);
      }
    });
  };

  return (
    <>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="flex items-center gap-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-sm font-medium transition-colors border border-surface-200 shadow-sm"
      >
        {isImporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        CSV
      </button>
    </>
  );
}
