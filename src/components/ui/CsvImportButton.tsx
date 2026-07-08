'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useTaskStore, useProjectStore, useUserStore } from '@/stores';
import { useI18n, getMultiLangText } from '@/i18n';
import type { Language } from '@/types';
import { translateText } from '@/lib/translate';
import { CsvPreviewModal, ParsedCsvRow } from '@/components/modals/CsvPreviewModal';
import { generateId } from '@/lib/mock-data';

export function CsvImportButton() {
  const { lang } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[] | null>(null);

  const addTask = useTaskStore((s) => s.addTask);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;
      if (!text) {
        setIsParsing(false);
        return;
      }

      // Remove BOM if present
      text = text.replace(/^\uFEFF/, '');

      // Try to extract content from markdown code block if present
      const match = text.match(/```(?:csv)?\s*([\s\S]*?)```/i);
      if (match && match[1]) {
        text = match[1];
      }

      text = text.trim();

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          const data = results.data as any[];
          const rows: ParsedCsvRow[] = [];
          
          for (const row of data) {
            // Find keys case-insensitively just in case
            const getVal = (key: string) => {
              const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
              return foundKey ? (row[foundKey] || '').toString().trim() : '';
            };

            const projectName = getVal('project');
            const taskName = getVal('task');
            const assigneeStr = getVal('assignee');
            const deadlineStr = getVal('deadline');

            if (!projectName || !taskName) continue;
            
            rows.push({
              id: generateId(),
              Project: projectName,
              Task: taskName,
              Assignee: assigneeStr,
              Deadline: deadlineStr
            });
          }
          
          setParsedRows(rows);
          setIsParsing(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        error: (error: Error) => {
          console.error('CSV Parsing error:', error);
          setIsParsing(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      });
    };
    
    reader.onerror = () => {
      console.error('Failed to read file');
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async (finalRows: ParsedCsvRow[]) => {
    for (const row of finalRows) {
      const projectName = row.Project.trim();
      const taskName = row.Task.trim();
      const assigneeStr = row.Assignee.trim();
      const deadlineStr = row.Deadline.trim();

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
    
    setParsedRows(null);
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
        disabled={isParsing}
        className="flex items-center gap-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-sm font-medium transition-colors border border-surface-200 shadow-sm"
      >
        {isParsing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        CSV
      </button>

      {parsedRows && (
        <CsvPreviewModal 
          rows={parsedRows} 
          onConfirm={handleConfirmImport} 
          onClose={() => setParsedRows(null)} 
        />
      )}
    </>
  );
}
