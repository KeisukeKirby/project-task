'use client';

import React, { useState } from 'react';
import { useI18n, getMultiLangText } from '@/i18n';
import { useProjectStore, useTaskStore, useUserStore, useUIStore, useEventStore } from '@/stores';
import { getAvatarColor } from '@/lib/utils';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock, FolderOpen, ArrowRight, Zap, GripVertical, Calendar as CalendarIcon, History } from 'lucide-react';
import { TaskActivityTimeline } from './TaskActivityTimeline';

export function OverviewDashboard() {
  const { lang, t, formatDate } = useI18n();
  const projects = useProjectStore((s) => s.projects);
  const reorderProjects = useProjectStore((s) => s.reorderProjects);
  const tasks = useTaskStore((s) => s.tasks);
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);
  const { setViewMode, setSelectedProjectId, openTaskModal } = useUIStore();
  const events = useEventStore((s) => s.events);

  const [draggedProjectIdx, setDraggedProjectIdx] = useState<number | null>(null);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done');
  const activeTasks = tasks.filter(t => t.status === 'in_progress');
  const overdueTasks = tasks.filter(t => {
    if (!t.planned_end_date || t.status === 'done') return false;
    return new Date(t.planned_end_date) < new Date(new Date().toISOString().split('T')[0]);
  });
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  // Lead time analysis
  const tasksWithActual = tasks.filter(t => t.actual_lead_days !== null && t.estimated_lead_days > 0);
  const avgDeviation = tasksWithActual.length > 0
    ? tasksWithActual.reduce((sum, t) => sum + ((t.actual_lead_days! - t.estimated_lead_days) / t.estimated_lead_days * 100), 0) / tasksWithActual.length
    : 0;

  // Bottleneck
  const stepDelays: Record<string, { count: number; name: string }> = {};
  overdueTasks.forEach(t => {
    const name = getMultiLangText(t.name, lang);
    const key = t.template_step_id || name;
    if (!stepDelays[key]) stepDelays[key] = { count: 0, name };
    stepDelays[key].count++;
  });
  const topBottlenecks = Object.values(stepDelays).sort((a, b) => b.count - a.count).slice(0, 3);

  // New Bulletin Board Data
  const delayedProjects = projects.filter(p => overdueTasks.some(t => t.project_id === p.id));
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date(new Date().toISOString().split('T')[0])).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedProjectIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before styling the source
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedProjectIdx !== null && draggedProjectIdx !== targetIndex) {
      reorderProjects(draggedProjectIdx, targetIndex);
    }
    setDraggedProjectIdx(null);
    const el = document.querySelectorAll('.draggable-project');
    el.forEach((node) => ((node as HTMLElement).style.opacity = '1'));
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedProjectIdx(null);
    const el = e.target as HTMLElement;
    el.style.opacity = '1';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 掲示板 (Bulletin Board) Section */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">
            {t('dashboard.welcomeBack', { name: currentUser?.name || '' })}
          </h2>
          <p className="text-surface-500 text-sm mt-1">{formatDate(new Date().toISOString())} - 直近の注意事項</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 遅延しているプロジェクト */}
        <div className="card border-l-4 border-l-rose-500 overflow-hidden shadow-lg">
          <div className="bg-rose-50 p-4 border-b border-rose-100 flex items-center justify-between">
            <h3 className="font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              🚨 遅延しているプロジェクト
            </h3>
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-full">
              {delayedProjects.length}件
            </span>
          </div>
          
          <div className="p-4">
            {delayedProjects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project, index) => {
                  if (!delayedProjects.includes(project)) return null;
                  const projOverdue = overdueTasks.filter(t => t.project_id === project.id).length;
                  return (
                    <div 
                      key={project.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className="draggable-project flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-rose-300 bg-white transition-all cursor-move group"
                    >
                      <div className="cursor-grab active:cursor-grabbing text-surface-300 group-hover:text-surface-500 p-1">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${project.color}15` }}>
                        {project.icon}
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => { setSelectedProjectId(project.id); setViewMode('kanban'); }}>
                        <h4 className="font-semibold text-surface-900 text-sm truncate group-hover:text-primary-600 cursor-pointer">
                          {getMultiLangText(project.name, lang)}
                        </h4>
                        <div className="text-xs text-rose-600 font-medium mt-0.5">
                          {projOverdue}件のタスクが遅延中
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-surface-300" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-surface-500 font-medium">遅延しているプロジェクトはありません 🎉</p>
              </div>
            )}
          </div>
        </div>

        {/* ガントチャートで登録したイベント */}
        <div className="card border-l-4 border-l-primary-500 overflow-hidden shadow-lg">
          <div className="bg-primary-50 p-4 border-b border-primary-100 flex items-center justify-between">
            <h3 className="font-bold text-primary-700 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              🗓 近日中のイベントスケジュール
            </h3>
            <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded-full">
              {upcomingEvents.length}件
            </span>
          </div>
          
          <div className="p-4">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((ev) => {
                  const targetProject = projects.find(p => p.id === ev.project_id);
                  return (
                    <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl border border-surface-100 bg-surface-50/50 hover:bg-white hover:border-primary-200 transition-colors">
                      <div className="flex flex-col items-center justify-center min-w-[3rem] px-2 py-1 bg-white rounded-lg border border-surface-200 shadow-sm">
                        <span className="text-[10px] text-surface-500 font-medium uppercase">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-surface-900 leading-none my-0.5">{new Date(ev.date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-surface-900 text-sm truncate">
                          {ev.title}
                        </h4>
                        {targetProject && (
                          <div className="text-xs text-surface-500 flex items-center gap-1 mt-1 truncate">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targetProject.color }}></span>
                            {getMultiLangText(targetProject.name, lang)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                <p className="text-sm text-surface-500">直近のイベントはありません</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Task Activity History (Admins Only) */}
      {(currentUser?.role === 'admin' || currentUser?.email === 'hoshino@example.com' || currentUser?.email === 'shimada@example.com' || currentUser?.email === 'mktbarefootincth@gmail.com') && (
        <div className="mt-8">
           <TaskActivityTimeline />
        </div>
      )}

      {/* 既存の全体ダッシュボード (非表示) */}
      <div style={{ display: 'none' }}>
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card bg-gradient-to-br from-primary-500 to-primary-700">
            <div className="flex items-center justify-between mb-3">
              <FolderOpen className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-70">{t('dashboard.totalProjects')}</span>
            </div>
            <div className="text-3xl font-bold">{projects.length}</div>
            <div className="text-xs opacity-70 mt-1">{projects.filter(p => p.status === 'active').length} {t('projectStatus.active')}</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-blue-500 to-cyan-600">
            <div className="flex items-center justify-between mb-3">
              <Zap className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-70">{t('dashboard.activeTasks')}</span>
            </div>
            <div className="text-3xl font-bold">{activeTasks.length}</div>
            <div className="text-xs opacity-70 mt-1">{totalTasks} {t('common.all')}</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-70">{t('dashboard.completionRate')}</span>
            </div>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <div className="progress-bar mt-2 bg-white/20">
              <div className="progress-bar-fill bg-white/80" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div className="stat-card bg-gradient-to-br from-rose-500 to-pink-600">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-5 h-5 opacity-80" />
              <span className="text-xs opacity-70">{t('dashboard.overdueTasks')}</span>
            </div>
            <div className="text-3xl font-bold">{overdueTasks.length}</div>
            <div className="text-xs opacity-70 mt-1">
              {avgDeviation > 0 ? `+${avgDeviation.toFixed(0)}%` : `${avgDeviation.toFixed(0)}%`} {t('project.estimateDeviation')}
            </div>
          </div>
        </div>

        {/* Project Progress Cards */}
        <div>
          <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            {t('dashboard.projectProgress')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, idx) => {
              const projTasks = tasks.filter(t => t.project_id === project.id);
              const projDone = projTasks.filter(t => t.status === 'done').length;
              const projProgress = projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0;
              const projOverdue = projTasks.filter(t => {
                if (!t.planned_end_date || t.status === 'done') return false;
                return new Date(t.planned_end_date) < new Date(new Date().toISOString().split('T')[0]);
              }).length;

              const statusCounts = {
                todo: projTasks.filter(t => t.status === 'todo').length,
                in_progress: projTasks.filter(t => t.status === 'in_progress').length,
                review: projTasks.filter(t => t.status === 'review').length,
                done: projDone,
              };

              return (
                <div
                  key={project.id}
                  className="card p-5 cursor-pointer hover:border-primary-300 group"
                  onClick={() => { setSelectedProjectId(project.id); setViewMode('kanban'); }}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${project.color}15`, }}>
                        {project.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-surface-900 text-sm group-hover:text-primary-600 transition-colors">
                          {getMultiLangText(project.name, lang)}
                        </h4>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-1`}
                          style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                          <span className="status-dot" style={{ backgroundColor: project.color, width: '6px', height: '6px' }} />
                          {t(`projectStatus.${project.status}`)}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-surface-500">{t('project.progress')}</span>
                      <span className="font-semibold" style={{ color: project.color }}>{projProgress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${projProgress}%`, backgroundColor: project.color }} />
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="flex items-center gap-3 text-xs text-surface-500">
                    <span className="flex items-center gap-1"><span className="status-dot todo" /> {statusCounts.todo}</span>
                    <span className="flex items-center gap-1"><span className="status-dot in_progress" /> {statusCounts.in_progress}</span>
                    <span className="flex items-center gap-1"><span className="status-dot review" /> {statusCounts.review}</span>
                    <span className="flex items-center gap-1"><span className="status-dot done" /> {statusCounts.done}</span>
                    {projOverdue > 0 && (
                      <span className="flex items-center gap-1 text-danger font-medium ml-auto">
                        <AlertTriangle className="w-3 h-3" /> {projOverdue}
                      </span>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100 text-xs">
                    <span className="text-surface-400">{t('project.deadline')}</span>
                    <span className={`font-medium ${
                      new Date(project.deadline_date) < new Date() && project.status !== 'completed'
                        ? 'text-danger' : 'text-surface-600'
                    }`}>
                      {formatDate(project.deadline_date)}
                    </span>
                  </div>

                  {/* Members */}
                  <div className="flex items-center gap-1 mt-3">
                    {project.members.slice(0, 4).map((m) => {
                      const user = users.find(u => u.id === m.user_id);
                      return (
                        <div
                          key={m.id}
                          className="avatar avatar-sm -ml-1 first:ml-0 ring-2 ring-white"
                          style={{ backgroundColor: getAvatarColor(m.user_id) }}
                          title={user?.name}
                        >
                          {user?.name.charAt(0).toUpperCase() || '?'}
                        </div>
                      );
                    })}
                    {project.members.length > 4 && (
                      <span className="text-[10px] text-surface-400 ml-1">+{project.members.length - 4}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Time Comparison + Bottleneck */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Time Chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              {t('dashboard.leadTimeComparison')}
            </h3>
            <div className="space-y-3">
              {tasksWithActual.slice(0, 6).map((task) => {
                const deviation = task.actual_lead_days! - task.estimated_lead_days;
                const deviationPercent = (deviation / task.estimated_lead_days * 100);
                return (
                  <div key={task.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-surface-700 truncate">{getMultiLangText(task.name, lang)}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5 flex-1">
                          <div className="h-2 rounded-full bg-primary-200 flex-1 relative overflow-hidden">
                            <div className="h-full rounded-full bg-primary-500 absolute left-0" style={{ width: `${Math.min((task.estimated_lead_days / Math.max(task.estimated_lead_days, task.actual_lead_days!)) * 100, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-primary-600 font-medium w-8 text-right">{task.estimated_lead_days}d</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-1">
                          <div className="h-2 rounded-full bg-emerald-200 flex-1 relative overflow-hidden">
                            <div className={`h-full rounded-full absolute left-0 ${deviation > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((task.actual_lead_days! / Math.max(task.estimated_lead_days, task.actual_lead_days!)) * 100, 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-medium w-8 text-right ${deviation > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{task.actual_lead_days}d</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${deviation > 0 ? 'text-rose-600' : deviation < 0 ? 'text-emerald-600' : 'text-surface-400'}`}>
                      {deviation > 0 ? '+' : ''}{deviation}d
                    </span>
                  </div>
                );
              })}
              {tasksWithActual.length === 0 && (
                <div className="text-center text-sm text-surface-400 py-8">{t('common.noData')}</div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-100 text-[10px] text-surface-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500" /> {t('task.estimatedDays')}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {t('task.actualDays')}</span>
            </div>
          </div>

          {/* Bottleneck Analysis */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              {t('dashboard.bottleneck')}
            </h3>
            {topBottlenecks.length > 0 ? (
              <div className="space-y-3">
                {topBottlenecks.map((bn, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-rose-100 text-rose-600' :
                      i === 1 ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-700 truncate">{bn.name}</div>
                      <div className="text-xs text-surface-400">{bn.count} {t('task.overdue')}</div>
                    </div>
                    <div className="w-16">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-rose-500" style={{ width: `${Math.min((bn.count / Math.max(...topBottlenecks.map(b => b.count))) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-surface-500">ボトルネックはありません 🎉</p>
              </div>
            )}

            {/* Per-user workload */}
            <div className="mt-6 pt-4 border-t border-surface-100">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">{t('task.assignees')}</h4>
              <div className="space-y-2">
                {users.map((user) => {
                  const userTasks = tasks.filter(t => t.assignees.includes(user.id) && t.status !== 'done');
                  const userOverdue = userTasks.filter(t => {
                    if (!t.planned_end_date) return false;
                    return new Date(t.planned_end_date) < new Date(new Date().toISOString().split('T')[0]);
                  }).length;
                  return (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="avatar avatar-sm ring-2 ring-white" style={{ backgroundColor: getAvatarColor(user.id) }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-surface-700 truncate">{user.name}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-surface-500">{userTasks.length} {t('task.tasks')}</span>
                        {userOverdue > 0 && (
                          <span className="text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded">
                            {userOverdue} {t('task.overdue')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
