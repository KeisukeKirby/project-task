'use client';

import React, { useState } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useProjectStore, useTaskStore, useTemplateStore, useUserStore } from '@/stores';
import { getAvatarColor } from '@/components/layout/DashboardShell';
import { X, Calendar, FileText, Palette, Users } from 'lucide-react';
import type { Language, ProjectStatus } from '@/types';
import { PROJECT_STATUS_CONFIG } from '@/types';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
const ICONS = ['📁', '🎨', '📣', '🏪', '📚', '🎯', '🚀', '💎', '🔥', '📋', '🎪', '📸'];

export function ProjectModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n();
  const addProject = useProjectStore((s) => s.addProject);
  const addTasksFromTemplate = useTaskStore((s) => s.addTasksFromTemplate);
  const templates = useTemplateStore((s) => s.templates);
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);

  const [form, setForm] = useState({
    name: '',
    description: '',
    deadline_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    color: COLORS[0],
    icon: ICONS[0],
    template_id: templates[0]?.id || '',
    status: 'planning' as ProjectStatus,
    memberIds: currentUser ? [currentUser.id] : [],
  });

  const selectedTemplate = templates.find(t => t.id === form.template_id);

  const handleCreate = () => {
    if (!form.name.trim()) return;

    const project = addProject({
      name: {
        ja: lang === 'ja' ? form.name : form.name,
        en: lang === 'en' ? form.name : form.name,
        th: lang === 'th' ? form.name : form.name,
      },
      description: {
        ja: lang === 'ja' ? form.description : form.description,
        en: lang === 'en' ? form.description : form.description,
        th: lang === 'th' ? form.description : form.description,
      },
      deadline_date: form.deadline_date,
      status: form.status,
      color: form.color,
      icon: form.icon,
      template_id: form.template_id || null,
      created_by: currentUser?.id || '',
      members: form.memberIds.map((uid, i) => ({
        id: `pm-${Date.now()}-${i}`,
        project_id: '', // will be filled
        user_id: uid,
        role: uid === currentUser?.id ? 'owner' as const : 'member' as const,
        joined_at: new Date().toISOString(),
      })),
      metadata: {},
    });

    // Generate tasks from template
    if (selectedTemplate && project) {
      addTasksFromTemplate(selectedTemplate, project.id, form.deadline_date, currentUser?.id || '');
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">{t('project.new')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Icon & Color & Name */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${form.color}15` }}>
                {form.icon}
              </div>
              <div className="flex gap-1 flex-wrap max-w-[60px]">
                {ICONS.slice(0, 6).map(icon => (
                  <button key={icon} onClick={() => setForm({ ...form, icon })} className={`text-sm p-0.5 rounded ${form.icon === icon ? 'bg-surface-200' : 'hover:bg-surface-100'}`}>{icon}</button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('project.name')}
                className="w-full text-lg font-bold text-surface-900 border-0 border-b-2 border-transparent focus:border-primary-500 bg-transparent outline-none pb-2 transition-colors placeholder:text-surface-300" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('project.description')} rows={2}
                className="w-full mt-2 px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Palette className="w-3 h-3" /> Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-primary-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('project.deadline')}</label>
            <input type="date" value={form.deadline_date} onChange={(e) => setForm({ ...form, deadline_date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
          </div>

          {/* Template */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> {t('project.template')}</label>
            <select value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="">{t('common.none')}</option>
              {templates.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{getMultiLangText(tpl.name, lang)}</option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="mt-2 p-3 rounded-lg bg-surface-50 text-xs text-surface-600">
                <div className="font-medium mb-1.5">{getMultiLangText(selectedTemplate.description, lang)}</div>
                <div className="space-y-1">
                  {selectedTemplate.steps.map(step => (
                    <div key={step.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      <span className="flex-1">{getMultiLangText(step.name, lang)}</span>
                      <span className="text-surface-400">{step.estimated_days}{t('common.days')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-surface-200 text-surface-400">
                  {t('common.all')}: {selectedTemplate.steps.reduce((sum, s) => sum + s.estimated_days, 0)}{t('common.days')}
                </div>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> {t('project.members')}</label>
            <div className="flex flex-wrap gap-2">
              {users.map(user => {
                const isSelected = form.memberIds.includes(user.id);
                return (
                  <button key={user.id}
                    onClick={() => setForm({ ...form, memberIds: isSelected ? form.memberIds.filter(id => id !== user.id) : [...form.memberIds, user.id] })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSelected ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>
                    <div className="avatar avatar-sm" style={{ backgroundColor: getAvatarColor(user.id) }}>{user.name.charAt(0)}</div>
                    {user.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-surface-200 bg-surface-50/50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-surface-600 hover:bg-surface-100 transition-colors">{t('common.cancel')}</button>
          <button onClick={handleCreate}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md hover:shadow-lg transition-all active:scale-95">
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
