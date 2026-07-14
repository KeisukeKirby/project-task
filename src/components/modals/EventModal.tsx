'use client';

import React, { useState } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useUIStore, useEventStore, useProjectStore } from '@/stores';
import { X, Calendar as CalendarIcon, Type, Folder, Palette, Trash2 } from 'lucide-react';

const COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', 
  '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', 
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', 
  '#f97316', '#ef4444', '#71717a'
];

export function EventModal() {
  const { lang, t } = useI18n();
  const { eventModalDate, eventModalEventId, closeEventModal, selectedProjectId } = useUIStore();
  const { events, addEvent, updateEvent, deleteEvent } = useEventStore();
  const projects = useProjectStore((s) => s.projects);

  const editingEvent = eventModalEventId ? events.find(e => e.id === eventModalEventId) : null;

  const [title, setTitle] = useState(editingEvent ? editingEvent.title : '');
  const [projectId, setProjectId] = useState<string>(editingEvent ? (editingEvent.project_id || '') : (selectedProjectId || ''));
  const [color, setColor] = useState<string>(editingEvent ? editingEvent.color : COLORS[0]);

  // Reset state when modal opens for a new date/event
  React.useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setProjectId(editingEvent.project_id || '');
      setColor(editingEvent.color);
    } else {
      setTitle('');
      setProjectId(selectedProjectId || '');
      setColor(COLORS[0]);
    }
  }, [eventModalDate, eventModalEventId, editingEvent, selectedProjectId]);

  if (!eventModalDate) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    if (editingEvent) {
      updateEvent(editingEvent.id, {
        title: title.trim(),
        project_id: projectId || null,
        color,
      });
    } else {
      addEvent({
        title: title.trim(),
        date: eventModalDate,
        project_id: projectId || null,
        color,
      });
    }
    
    closeEventModal();
  };

  const handleDelete = () => {
    if (editingEvent && window.confirm(t('common.confirmDelete') || 'Are you sure you want to delete this event?')) {
      deleteEvent(editingEvent.id);
      closeEventModal();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">{editingEvent ? 'Edit Event' : 'New Event'}</h2>
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
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20" 
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> Target Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-surface-0 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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

        <div className="flex justify-between items-center p-4 border-t border-surface-200 bg-surface-50 rounded-b-2xl">
          {editingEvent ? (
            <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              {t('common.delete') || 'Delete'}
            </button>
          ) : <div />}
          <div className="flex gap-2">
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
    </div>
  );
}
