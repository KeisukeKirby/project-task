'use client';

import React, { useState } from 'react';
import { useI18n } from '@/i18n';
import { BarChart3, Loader2, UserPlus, Check, ChevronLeft } from 'lucide-react';
import { useUserStore } from '@/stores';
import { getAvatarColor } from '@/lib/utils';

/**
 * 「あなたは誰ですか？」画面。
 * ログイン（メール・パスワード）は無く、自分の名前をタップするだけで使い始められる。
 * 選んだ名前はブラウザに記憶され、次回からはこの画面は出ない。
 */
export function UserSelectModal({ onClose }: { onClose?: () => void }) {
  const { lang, t, setLang } = useI18n();
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);
  const setCurrentUser = useUserStore((s) => s.setCurrentUser);
  const addManualUser = useUserStore((s) => s.addManualUser);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedUsers = users.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  const choose = (userId: string) => {
    setCurrentUser(userId);
    onClose?.();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    const created = await addManualUser(name);
    setSaving(false);
    if (created) {
      choose(created.id);
    } else {
      setError(t('auth.addFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 p-4">
      <div className="w-full max-w-lg animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/30">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ProjectHub</h1>
          <p className="text-primary-200 text-sm mt-1">{t('app.subtitle')}</p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center justify-center gap-1 mb-6 bg-white/10 rounded-lg p-1 mx-auto w-fit">
          {(['ja', 'en', 'th'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                lang === l ? 'bg-white text-surface-900 shadow-md' : 'text-white/60 hover:text-white/90'
              }`}
            >
              {l === 'ja' ? '日本語' : l === 'en' ? 'English' : 'ภาษาไทย'}
            </button>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-semibold text-white text-center">{t('auth.whoAreYou')}</h2>
          <p className="text-primary-200/90 text-sm text-center mt-1 mb-5">{t('auth.whoAreYouHint')}</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-100 text-sm">
              {error}
            </div>
          )}

          {!adding ? (
            <>
              {users.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-white/70 text-sm py-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {sortedUsers.map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => choose(u.id)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border
                          ${isCurrent
                            ? 'bg-white text-surface-900 border-white shadow-lg'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/15 hover:border-white/30 active:scale-[0.98]'
                          }`}
                      >
                        <div className="avatar avatar-lg flex-shrink-0" style={{ backgroundColor: getAvatarColor(u.id) }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className={`text-[11px] truncate ${isCurrent ? 'text-surface-500' : 'text-white/50'}`}>
                            {t(`role.${u.role}`)}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => { setAdding(true); setError(null); }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/30 text-white/80 hover:bg-white/10 hover:text-white transition-all text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {t('auth.addMyName')}
              </button>

              {currentUser && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full text-center text-sm text-primary-200 hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </button>
              )}
            </>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">{t('auth.yourName')}</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={40}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white text-base placeholder-white/30 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-all"
                  placeholder={t('auth.yourNamePlaceholder')}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewName(''); setError(null); }}
                  className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg text-white/80 hover:bg-white/10 transition-all text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('auth.backToList')}
                </button>
                <button
                  type="submit"
                  disabled={saving || !newName.trim()}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('auth.startUsing')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
