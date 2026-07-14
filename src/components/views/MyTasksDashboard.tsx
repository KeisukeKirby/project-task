'use client';

import React, { useState, useEffect } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useTaskStore, useUserStore, useProjectStore, useUIStore } from '@/stores';
import { getAvatarColor, isAdminUser } from '@/lib/utils';
import { Play, CheckCircle2, Clock, AlertTriangle, Calendar, ArrowUpRight, RotateCcw, User as UserIcon } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types';

export function MyTasksDashboard() {
  const { lang, t, formatDate } = useI18n();
  const tasks = useTaskStore((s) => s.tasks);
  const startTask = useTaskStore((s) => s.startTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);
  const projects = useProjectStore((s) => s.projects).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const { openTaskModal } = useUIStore();

  const [targetUserId, setTargetUserId] = useState<string>(currentUser?.id || '');

  useEffect(() => {
    if (currentUser?.id) {
      setTargetUserId(currentUser.id);
    }
  }, [currentUser?.id]);

  if (!currentUser) return null;

  const myTasks = tasks.filter(t => t.assignees.includes(targetUserId)).sort((a, b) => a.sort_order - b.sort_order);
  const today = new Date().toISOString().split('T')[0];

  const todayTasks = myTasks.filter(t => t.planned_end_date === today && t.status !== 'done');
  const thisWeekTasks = myTasks.filter(t => {
    if (!t.planned_end_date || t.status === 'done') return false;
    const due = new Date(t.planned_end_date);
    const now = new Date(today);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return due >= now && due <= weekEnd;
  });

  const overdueTasks = myTasks.filter(t => {
    if (!t.planned_end_date || t.status === 'done') return false;
    return t.planned_end_date < today;
  });

  const doneTasks = myTasks.filter(t => t.status === 'done');
  const avgLeadTime = doneTasks.filter(t => t.actual_lead_days).length > 0
    ? (doneTasks.filter(t => t.actual_lead_days).reduce((sum, t) => sum + (t.actual_lead_days || 0), 0) / doneTasks.filter(t => t.actual_lead_days).length).toFixed(1)
    : '—';

  const TaskCard = ({ task }: { task: typeof tasks[0] }) => {
    const project = projects.find(p => p.id === task.project_id);
    const isOverdue = task.planned_end_date && task.planned_end_date < today && task.status !== 'done';
    const statusConf = STATUS_CONFIG[task.status];
    const priorityConf = PRIORITY_CONFIG[task.priority];

    return (
      <div
        className={`card p-4 group cursor-pointer hover:border-primary-300 transition-all ${isOverdue ? 'border-l-4 border-l-danger' : ''}`}
        onClick={() => openTaskModal(task.id)}
      >
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-sm"
            style={{ backgroundColor: `${statusConf.color}15`, color: statusConf.color }}
          >
            {statusConf.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-surface-900 truncate group-hover:text-primary-600 transition-colors">
                {getMultiLangText(task.name, lang)}
              </h4>
              {task.name[`${lang}_confirmed` as keyof typeof task.name] === false && task.name.original_lang !== lang && (
                <span className="translation-badge">🔄 {t('task.translated')}</span>
              )}
            </div>

            {/* Project & Priority */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {project && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                  {getMultiLangText(project.name, lang)}
                </span>
              )}
              <span className="priority-badge" style={{ backgroundColor: `${priorityConf.color}15`, color: priorityConf.color }}>
                {priorityConf.icon} {getMultiLangText(priorityConf.label, lang)}
              </span>
            </div>

            {/* Dates & Lead Time */}
            <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
              {task.planned_end_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger font-medium' : ''}`}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.planned_end_date)}
                  {isOverdue && <AlertTriangle className="w-3 h-3" />}
                </span>
              )}
              {task.estimated_lead_days > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.estimated_lead_days}{t('common.days')}
                  {task.actual_lead_days !== null && (
                    <span className={`font-medium ${task.actual_lead_days > task.estimated_lead_days ? 'text-danger' : 'text-success'}`}>
                      → {task.actual_lead_days}{t('common.days')}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Checklist progress */}
            {task.checklist.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill bg-primary-500" style={{
                      width: `${(task.checklist.filter(c => c.is_completed).length / task.checklist.length) * 100}%`
                    }} />
                  </div>
                  <span className="text-[10px] text-surface-400">
                    {task.checklist.filter(c => c.is_completed).length}/{task.checklist.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {task.status === 'todo' && (
              <button
                onClick={() => startTask(task.id)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-medium transition-all"
                title={t('task.startWork')}
              >
                <Play className="w-3 h-3" />
              </button>
            )}
            {(task.status === 'in_progress' || task.status === 'review') && (
              <button
                onClick={() => completeTask(task.id)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium transition-all"
                title={t('task.completeWork')}
              >
                <CheckCircle2 className="w-3 h-3" />
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={() => updateTask(task.id, { status: 'review' })}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-medium transition-all"
                title={t('status.review')}
              >
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Admin User Selector */}
      {isAdminUser(currentUser) && (
        <div className="flex items-center gap-3 bg-surface-50 p-3 rounded-xl border border-surface-200">
          <UserIcon className="w-5 h-5 text-surface-400" />
          <span className="text-sm font-medium text-surface-700">{lang === 'ja' ? '表示対象ユーザー:' : lang === 'th' ? 'ผู้ใช้เป้าหมาย:' : 'Target User:'}</span>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="flex-1 max-w-[240px] px-3 py-1.5 bg-surface-0 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} {u.id === currentUser.id ? (lang === 'ja' ? '(あなた)' : '(You)') : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* My Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">{myTasks.filter(t => t.status !== 'done').length}</div>
          <div className="text-xs text-surface-500 mt-1">{t('dashboard.activeTasks')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{doneTasks.length}</div>
          <div className="text-xs text-surface-500 mt-1">{t('dashboard.completedTasks')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-danger' : 'text-surface-400'}`}>{overdueTasks.length}</div>
          <div className="text-xs text-surface-500 mt-1">{t('dashboard.overdueTasks')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{avgLeadTime}</div>
          <div className="text-xs text-surface-500 mt-1">{t('dashboard.avgLeadTime')} ({t('common.days')})</div>
        </div>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-danger mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('task.overdue')} ({overdueTasks.length})
          </h3>
          <div className="space-y-2">
            {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-500" />
          {t('dashboard.todaysTasks')} ({todayTasks.length})
        </h3>
        {todayTasks.length > 0 ? (
          <div className="space-y-2">
            {todayTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        ) : (
          <div className="card p-6 text-center text-surface-400 text-sm">
            ✨ {lang === 'ja' ? '今日の締切タスクはありません' : lang === 'th' ? 'ไม่มีงานครบกำหนดวันนี้' : 'No tasks due today'}
          </div>
        )}
      </div>

      {/* This Week */}
      <div>
        <h3 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-500" />
          {t('dashboard.weeklyTasks')} ({thisWeekTasks.length})
        </h3>
        {thisWeekTasks.length > 0 ? (
          <div className="space-y-2">
            {thisWeekTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        ) : (
          <div className="card p-6 text-center text-surface-400 text-sm">{t('common.noData')}</div>
        )}
      </div>

      {/* All My Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-surface-900 mb-3">{t('common.all')} ({myTasks.filter(t => t.status !== 'done').length})</h3>
        <div className="space-y-2">
          {myTasks.filter(t => t.status !== 'done').map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      </div>
    </div>
  );
}
