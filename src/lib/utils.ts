export const AVATAR_COLORS: Record<string, string> = {
  'user-shimada': '#6366f1',
  'user-hoshino': '#8b5cf6',
  'user-bew': '#ec4899',
  'user-aod': '#10b981',
  'user-beer': '#f59e0b',
};

export function getAvatarColor(userId: string): string {
  return AVATAR_COLORS[userId] || '#6366f1';
}
