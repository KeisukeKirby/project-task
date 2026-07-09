'use client';

import React, { useState } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useUIStore, useEventStore, useProjectStore } from '@/stores';
import { X, Calendar as CalendarIcon, Type, Folder, Palette } from 'lucide-react';

const COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', 
  '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', 
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', 
  '#f97316', '#ef4444', '#71717a'
];

export function EventModal() {
  const { lang, t } = useI18n();
  const { eventModalDate, closeEventModal, selectedProjectId } = useUIStore();
  const { addEvent } = useEventStore();
  const projects = useProjectStore((s) => s.projects);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(selectedProjectId || '');
  const [color, setColor] = useState<string>(COLORS[0]);

  if (!eventModalDate) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    addEvent({
      title: title.trim(),
      date: eventModalDate,
      project_id: projectId || null,
      color,
    });
    
    closeEventModal();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">New Event</h2>
          <button onClick={closeEventModal} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Date
            </label>
            <div className="px-3 py-2 bg-surface-50 text-surface-700 font-medium rounded-lg border border-surface-200">
              {eventModalDate}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Type className="w-3.5 h-3.5" /> Title
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event Title..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20" 
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> Target Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">(All Projects) Global Event</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{getMultiLangText(p.name, lang)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.slice(0, 10).map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-surface-200 bg-surface-50 gap-2 rounded-b-2xl">
          <button onClick={closeEventModal} className="px-4 py-2 text-sm font-semibold text-surface-600 hover:bg-surface-200 rounded-lg transition-colors">
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSave} 
            disabled={!title.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-primary-500/20 transition-all"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
