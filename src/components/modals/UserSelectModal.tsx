'use client';

import React from 'react';
import { useI18n } from '@/i18n';
import { useUserStore } from '@/stores';
import { getAvatarColor } from '@/components/layout/DashboardShell';
import { BarChart3, Crown, Users, Eye } from 'lucide-react';

export function UserSelectModal({ onSelect }: { onSelect: (userId: string) => void }) {
  const { lang, t, setLang } = useI18n();
  const users = useUserStore((s) => s.users);

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Crown className="w-3.5 h-3.5 text-amber-500" />,
    owner: <Users className="w-3.5 h-3.5 text-primary-500" />,
    member: <Users className="w-3.5 h-3.5 text-surface-400" />,
    viewer: <Eye className="w-3.5 h-3.5 text-surface-400" />,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/30">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ProjectHub</h1>
          <p className="text-primary-200 text-sm mt-1">
            {lang === 'ja' ? 'プロジェクト進捗管理ダッシュボード' :
             lang === 'th' ? 'ระบบจัดการความคืบหน้าโปรเจกต์' :
             'Project Progress Management Dashboard'}
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center justify-center gap-1 mb-6 bg-white/10 rounded-lg p-1 mx-auto w-fit">
          {(['ja', 'en', 'th'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                lang === l ? 'bg-white text-surface-900 shadow-md' : 'text-white/60 hover:text-white/90'
              }`}
            >
              {l === 'ja' ? '日本語' : l === 'en' ? 'English' : 'ภาษาไทย'}
            </button>
          ))}
        </div>

        {/* User Cards */}
        <div className="space-y-2">
          <p className="text-white/50 text-xs text-center mb-3 uppercase tracking-wider">
            {t('auth.selectUser')}
          </p>
          {users.map((user, idx) => (
            <button
              key={user.id}
              onClick={() => onSelect(user.id)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div
                className="avatar avatar-lg ring-2 ring-white/20 group-hover:ring-white/40 transition-all"
                style={{ backgroundColor: getAvatarColor(user.id) }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-semibold group-hover:text-primary-300 transition-colors">{user.name}</div>
                <div className="text-white/40 text-xs flex items-center gap-2 mt-0.5">
                  {roleIcons[user.role]}
                  <span>{user.team}</span>
                  <span>•</span>
                  <span>{user.role === 'admin' ? 'Admin' : user.role === 'owner' ? 'Owner' : 'Member'}</span>
                </div>
              </div>
              <div className="text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all text-lg">→</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-[10px] mt-8">
          MVP Prototype — Data stored locally in browser
        </p>
      </div>
    </div>
  );
}
