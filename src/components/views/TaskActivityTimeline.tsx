'use client';

import React from 'react';
import { useTaskStore, useUserStore } from '@/stores';
import { useI18n, getMultiLangText } from '@/i18n';
import { getAvatarColor } from '@/lib/utils';
import { History, Clock, FileEdit, CheckCircle2 } from 'lucide-react';

export function TaskActivityTimeline() {
  const { lang, t, formatDate } = useI18n();
  const taskActivities = useTaskStore((s) => s.taskActivities);
  const tasks = useTaskStore((s) => s.tasks);
  const users = useUserStore((s) => s.users);

  // Sort activities by most recent
  const sortedActivities = [...taskActivities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Show only top 50 recent activities for performance
  const displayActivities = sortedActivities.slice(0, 50);

  return (
    <div className="card shadow-lg overflow-hidden">
      <div className="bg-surface-50 p-4 border-b border-surface-100 flex items-center justify-between">
        <h3 className="font-bold text-surface-900 flex items-center gap-2">
          <History className="w-5 h-5 text-primary-500" />
          管理者専用: タスク更新履歴
        </h3>
        <span className="bg-surface-200 text-surface-700 text-xs font-bold px-2 py-1 rounded-full">
          直近50件
        </span>
      </div>
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {displayActivities.length > 0 ? (
          <div className="relative border-l border-surface-200 ml-3 space-y-6 pb-4">
            {displayActivities.map((activity, idx) => {
              const user = users.find(u => u.id === activity.user_id);
              const task = tasks.find(t => t.id === activity.task_id);
              
              let actionText = '';
              let Icon = FileEdit;
              let iconColor = 'text-blue-500';
              let bgColor = 'bg-blue-50';

              if (activity.field_name === 'status') {
                if (activity.new_value === 'done') {
                  actionText = 'タスクを完了にしました';
                  Icon = CheckCircle2;
                  iconColor = 'text-emerald-500';
                  bgColor = 'bg-emerald-50';
                } else {
                  actionText = `ステータスを「${activity.new_value}」に変更しました`;
                }
              } else if (activity.field_name === 'name') {
                actionText = 'タスク名を変更しました';
              } else if (activity.field_name === 'assignees') {
                actionText = '担当者を変更しました';
              } else if (activity.field_name === 'created') {
                actionText = 'タスクを作成しました';
                Icon = Clock;
              } else {
                actionText = `${activity.field_name} を更新しました`;
              }

              return (
                <div key={activity.id} className="relative pl-6">
                  <div className={`absolute -left-3.5 top-0.5 w-7 h-7 rounded-full flex items-center justify-center ${bgColor} border-2 border-white shadow-sm`}>
                    <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                  </div>
                  <div className="bg-surface-0 p-3 rounded-xl border border-surface-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {user ? (
                          <div className="avatar avatar-sm ring-1 ring-surface-200" style={{ backgroundColor: getAvatarColor(user.id), width: '20px', height: '20px', fontSize: '10px' }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="avatar avatar-sm bg-surface-200 ring-1 ring-surface-200" style={{ width: '20px', height: '20px', fontSize: '10px' }}>?</div>
                        )}
                        <span className="text-sm font-semibold text-surface-900">{user?.name || '不明なユーザー'}</span>
                        <span className="text-xs text-surface-500">が{actionText}</span>
                      </div>
                      <span className="text-[10px] text-surface-400 font-medium">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                    {task && (
                      <div className="mt-2 text-sm text-surface-700 bg-surface-50 p-2 rounded-lg border border-surface-100">
                        <span className="font-medium text-surface-900">{getMultiLangText(task.name, lang)}</span>
                        {(activity.field_name !== 'status' && activity.field_name !== 'created') && (
                          <div className="text-xs text-surface-500 mt-1">
                            変更前: {JSON.stringify(activity.old_value)} ➔ 変更後: {JSON.stringify(activity.new_value)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-sm text-surface-500">履歴がまだありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
