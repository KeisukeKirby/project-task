'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '@/stores';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { Shield, ShieldAlert, Key, UserPlus, CheckCircle2, User as UserIcon, Edit2, Check, X } from 'lucide-react';
import { getAvatarColor, isAdminUser } from '@/lib/utils';
import type { UserRole } from '@/types';

export function AccountsDashboard() {
  const { t } = useI18n();
  const users = useUserStore((s) => s.users);
  const currentUser = useUserStore((s) => s.currentUser);
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [editNameValue, setEditNameValue] = useState('');
  const [editRoleValue, setEditRoleValue] = useState<UserRole>('member');

  // Check admin rights
  if (!isAdminUser(currentUser)) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-surface-900">アクセス権限がありません</h2>
        <p className="text-surface-500 mt-2">このページは管理者のみ表示できます。</p>
      </div>
    );
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email || !name || !password) {
      setError('すべてのフィールドを入力してください。');
      return;
    }

    setIsCreating(true);
    
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Add to public.users table (if not automatically created by triggers)
      if (authData.user) {
        const { error: dbError } = await supabase.from('users').insert([{
          id: authData.user.id,
          email,
          name,
          role,
          preferred_language: 'ja'
        }]);

        if (dbError) throw dbError;

        setMessage('アカウントが正常に作成されました。');
        setEmail('');
        setName('');
        setPassword('');
        
        // Refresh users store (normally handled by realtime sync)
      }
    } catch (err: any) {
      setError(err.message || 'アカウント作成中にエラーが発生しました。');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (!confirm('権限を変更してよろしいですか？')) return;
    
    try {
      const { error: dbError } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (dbError) throw dbError;
      
      useUserStore.setState(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, role: newRole } : u)
      }));
      alert('権限を変更しました。');
    } catch (err: any) {
      alert(err.message || '権限の変更に失敗しました。');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;
    
    try {
      // NOTE: This will only delete the user from public.users
      // They may still exist in auth.users unless there's a trigger
      const { error: dbError } = await supabase.from('users').delete().eq('id', userId);
      if (dbError) throw dbError;
      
      useUserStore.setState(state => ({
        users: state.users.filter(u => u.id !== userId)
      }));
      alert('ユーザーを削除しました。');
    } catch (err: any) {
      alert(err.message || '削除に失敗しました。');
    }
  };

  const startEditingUser = (userId: string, currentEmail: string, currentName: string, currentRole: UserRole) => {
    setEditingUserId(userId);
    setEditEmailValue(currentEmail);
    setEditNameValue(currentName);
    setEditRoleValue(currentRole);
  };

  const cancelEditingUser = () => {
    setEditingUserId(null);
    setEditEmailValue('');
    setEditNameValue('');
  };

  const handleUpdateUser = async (userId: string) => {
    if (!editEmailValue.trim() || !editNameValue.trim()) return;
    if (!confirm('ユーザー情報を変更してよろしいですか？')) {
      cancelEditingUser();
      return;
    }
    
    try {
      const { data, error: dbError } = await supabase.from('users').update({ email: editEmailValue, name: editNameValue, role: editRoleValue }).eq('id', userId).select();
      if (dbError) throw dbError;
      if (!data || data.length === 0) {
        throw new Error('変更が反映されませんでした。Supabaseの権限設定(RLS)を確認してください。');
      }
      
      useUserStore.setState(state => ({
        users: state.users.map(u => u.id === userId ? { ...u, email: editEmailValue, name: editNameValue, role: editRoleValue } : u)
      }));
      alert('ユーザー情報を変更しました。');
    } catch (err: any) {
      alert(err.message || 'ユーザー情報の変更に失敗しました。');
    } finally {
      cancelEditingUser();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            アカウント管理
          </h2>
          <p className="text-surface-500 text-sm mt-1">システムのアクセス権限とパスワード管理</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Account Form */}
        <div className="card p-5 lg:col-span-1 border-t-4 border-t-primary-500">
          <h3 className="font-bold text-surface-900 flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5" />
            新規アカウント作成
          </h3>
          
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">メールアドレス</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">名前</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                placeholder="田中 太郎"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">初期パスワード</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  placeholder="6文字以上"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">権限 (Role)</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="owner">オーナー (Owner)</option>
                <option value="admin">管理者 (Admin)</option>
                <option value="member">一般メンバー (Member)</option>
                <option value="viewer">閲覧者 (Viewer)</option>
              </select>
            </div>

            {error && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{error}</div>}
            {message && <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {message}</div>}

            <button 
              type="submit" 
              disabled={isCreating}
              className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? '作成中...' : 'アカウントを作成'}
            </button>
          </form>
        </div>

        {/* Existing Users List */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-surface-900 flex items-center gap-2 mb-4">
            <UserIcon className="w-5 h-5" />
            登録済みアカウント一覧
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="pb-3 text-xs font-semibold text-surface-500">ユーザー</th>
                  <th className="pb-3 text-xs font-semibold text-surface-500">メールアドレス</th>
                  <th className="pb-3 text-xs font-semibold text-surface-500">権限</th>
                  <th className="pb-3 text-xs font-semibold text-surface-500">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3 group">
                        <div className="avatar avatar-sm ring-2 ring-white" style={{ backgroundColor: getAvatarColor(user.id) }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        {editingUserId === user.id ? (
                          <input 
                            type="text" 
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="px-2 py-1 bg-surface-0 border border-surface-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none w-[120px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateUser(user.id);
                              if (e.key === 'Escape') cancelEditingUser();
                            }}
                          />
                        ) : (
                          <>
                            <span className="font-medium text-surface-900 text-sm">{user.name}</span>
                            <button 
                              onClick={() => startEditingUser(user.id, user.email, user.name, user.role)}
                              className="p-1 text-surface-400 opacity-0 group-hover:opacity-100 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                              title="編集"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-sm text-surface-600">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="email" 
                            value={editEmailValue}
                            onChange={(e) => setEditEmailValue(e.target.value)}
                            className="px-2 py-1 bg-surface-0 border border-surface-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none w-full max-w-[200px]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateUser(user.id);
                              if (e.key === 'Escape') cancelEditingUser();
                            }}
                          />
                        </div>
                      ) : (
                        <span>{user.email}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select 
                            value={editRoleValue}
                            onChange={(e) => setEditRoleValue(e.target.value as UserRole)}
                            className="text-xs bg-surface-0 border border-surface-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateUser(user.id);
                              if (e.key === 'Escape') cancelEditingUser();
                            }}
                          >
                            <option value="owner">オーナー</option>
                            <option value="admin">管理者</option>
                            <option value="member">一般メンバー</option>
                            <option value="viewer">閲覧者</option>
                          </select>
                          <button onClick={() => handleUpdateUser(user.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="保存">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEditingUser} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="キャンセル">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            user.role === 'admin' || user.role === 'owner' ? 'bg-primary-100 text-primary-700' : 
                            user.role === 'member' ? 'bg-emerald-100 text-emerald-700' : 
                            'bg-surface-100 text-surface-700'
                          }`}>
                            {user.role}
                          </span>
                          <span className="text-surface-300 mx-2">|</span>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
