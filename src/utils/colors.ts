/**
 * 일정 색상 팔레트 (부드러운 색상)
 */

export const EVENT_COLORS = [
  '#6bcf7f', // 부드러운 초록색
  '#b794f6', // 부드러운 보라색
  '#fbd38d', // 부드러운 노란색
  '#fc8181', // 부드러운 주황색
  '#63b3ed', // 부드러운 파란색
  '#f56565', // 부드러운 빨간색
  '#4fd1c7', // 부드러운 청록색
  '#a0aec0', // 부드러운 회색
  '#90cdf4', // 부드러운 청회색
  '#f687b3', // 부드러운 분홍색
] as const;

/**
 * 테마 색상
 */
export const THEME = {
  primary: '#6366f1', // 인디고 블루
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  secondary: '#ec4899', // 핑크
  background: '#f8fafc',
  backgroundWhite: '#ffffff',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  shadow: 'rgba(0, 0, 0, 0.1)',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
} as const;

/**
 * 일정에 색상을 자동 할당 (제목 기반 해시)
 */
export const getColorForEvent = (title: string): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % EVENT_COLORS.length;
  return EVENT_COLORS[index];
};

/**
 * 색상이 없으면 기본 색상 반환
 */
export const getEventColor = (event: { color?: string; title?: string; slots?: Array<{ slotTitle?: string }> }): string => {
  if (event.color) {
    return event.color;
  }
  // title이 있으면 사용, 없으면 slots[0]?.slotTitle 사용
  const title = event.title || event.slots?.[0]?.slotTitle || '';
  return getColorForEvent(title);
};
