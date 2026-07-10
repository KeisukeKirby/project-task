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

export const THAI_HOLIDAYS = new Set([
  // 2026
  '2026-01-01', '2026-03-03', '2026-04-06', '2026-04-13', '2026-04-14', '2026-04-15',
  '2026-05-01', '2026-05-04', '2026-05-31', '2026-06-03', '2026-07-28', '2026-07-29',
  '2026-08-12', '2026-10-13', '2026-10-23', '2026-12-05', '2026-12-10', '2026-12-31',
  // 2027
  '2027-01-01', '2027-02-22', '2027-04-06', '2027-04-13', '2027-04-14', '2027-04-15',
  '2027-05-03', '2027-05-04', '2027-05-20', '2027-06-03', '2027-07-19', '2027-07-28',
  '2027-08-12', '2027-10-13', '2027-10-23', '2027-12-06', '2027-12-10', '2027-12-31',
]);

export function isHoliday(dateStr: string): boolean {
  return THAI_HOLIDAYS.has(dateStr);
}
