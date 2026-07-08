'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n';

export interface ParsedCsvRow {
  id: string;
  Project: string;
  Task: string;
  Assignee: string;
  Deadline: string;
}

interface CsvPreviewModalProps {
  rows: ParsedCsvRow[];
  onConfirm: (rows: ParsedCsvRow[]) => Promise<void>;
  onClose: () => void;
}

export function CsvPreviewModal({ rows: initialRows, onConfirm, onClose }: CsvPreviewModalProps) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ParsedCsvRow[]>(initialRows);
  const [isImporting, setIsImporting] = useState(false);

  const handleRowChange = (id: string, field: keyof ParsedCsvRow, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleConfirm = async () => {
    setIsImporting(true);
    try {
      await onConfirm(rows);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="modal-overlay z-[100]" onClick={(e) => { if (e.target === e.currentTarget && !isImporting) onClose(); }}>
      <div className="modal-content w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">Preview CSV Import</h2>
          <button 
            onClick={onClose} 
            disabled={isImporting}
            className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Table) */}
        <div className="flex-1 overflow-auto p-4 bg-surface-50">
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-50 text-surface-500 border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium w-48">Assignee</th>
                  <th className="px-4 py-3 font-medium w-48">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-50 transition-colors group">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.Project} 
                        onChange={(e) => handleRowChange(row.id, 'Project', e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-surface-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded transition-all"
                        placeholder="Project Name"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.Task} 
                        onChange={(e) => handleRowChange(row.id, 'Task', e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-surface-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded transition-all"
                        placeholder="Task Name"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.Assignee} 
                        onChange={(e) => handleRowChange(row.id, 'Assignee', e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-surface-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded transition-all"
                        placeholder="@Assignee"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={row.Deadline} 
                        onChange={(e) => handleRowChange(row.id, 'Deadline', e.target.value)}
                        className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-surface-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded transition-all"
                        placeholder="e.g. 10 july"
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                      No data found in the CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-200 bg-white">
          <p className="text-sm text-surface-500">
            {rows.length} task(s) ready to import. You can edit the text directly before confirming.
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-surface-600 font-medium hover:bg-surface-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isImporting || rows.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-lg hover:from-primary-600 hover:to-primary-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Import
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
