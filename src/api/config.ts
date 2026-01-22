/**
 * API 설정 파일
 * 백엔드 서버의 base URL을 여기에 설정합니다.
 */

// ========================================
// 🎯 모킹 모드 설정 (백엔드 없이 테스트)
// ========================================
// true: 백엔드 안 부름, 목업으로 동작 (403 없음) — API_SETUP.md "403이 계속 나올 때" 참고
// false: 실제 백엔드 사용 (POST에서 403 나면 백엔드 인증/라우트 점검 필요)
export const USE_MOCK_API = false;

// ========================================
// 백엔드 서버 URL 설정 (USE_MOCK_API가 false일 때 사용)
// ========================================
// 배포된 백엔드 서버 주소
export const API_BASE_URL = 'https://calendar-be-d0z4.onrender.com/api';

// 환경 변수로 설정하려면 아래처럼 사용할 수도 있습니다:
// export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    REFRESH: '/auth/refresh', // POST - 토큰 재발급
  },
  // 캘린더/일정
  CALENDAR: {
    LIST: '/calendar', // GET /api/calendar
    BY_ID: '/calendar/:calendar_id', // GET /api/calendar/{calendar_id}
    BY_DAY: '/calendar/day/:date', // GET /api/calendar/day/{date} - 캘린더 상세(일별)
    BY_DATE: '/calendar/:calendar_id/day/:date', // GET /api/calendar/{calendarId}/day/{date}
    EVENT_CREATE: '/calendar/:user_id/:calendar_id', // POST /api/calendar/{user_id}/{calendar_id}
    EVENT_GET: '/calendar/:user_id/:calendar_id', // GET /api/calendar/{user_id}/{calendar_id}
    EVENT_UPDATE: '/calendar/:user_id/:calendar_id', // PATCH /api/calendar/{user_id}/{calendar_id}
    EVENT_DELETE: '/calendar/:user_id/:calendar_id', // DELETE /api/calendar/{user_id}/{calendar_id}
  },
  // 이벤트 슬롯
  EVENT_SLOTS: {
    CREATE: '/event-slots', // POST /api/event-slots
    DELETE: '/event-slots/:slot_id', // DELETE /api/event-slots/{slot_id}
    UPDATE: '/event-slots/:slot_id', // PATCH /api/event-slots/{slot_id}
    UPDATE_DONE: '/event-slots/:slot_id/done', // PATCH /api/event-slots/{slot_id}/done
  },
  // 채팅 (API 문서에 따르면 /api/chats/{chat_id} 사용)
  CHAT: {
    SEND: '/chats/:chat_id', // POST
    GET: '/chats/:chat_id', // GET
  },
  // 타이머 (공부 시간 측정)
  TIMER: {
    START: '/timer/start', // POST /api/timer/start
    PAUSE: '/timer/pause', // POST /api/timer/pause
    RESUME: '/timer/resume', // POST /api/timer/resume
    STOP: '/timer/stop', // POST /api/timer/stop
    STATS: '/timer/stats', // GET /api/timer/stats
  },
  // 그룹 (그룹 초대 및 관리)
  GROUP: {
    LIST: '/group', // GET /api/group, POST /api/group
    PUBLIC: '/group/public', // GET /api/group/public - 공개 그룹 조회
    ME: '/group/me', // GET /api/group/me - 내 그룹 조회
    BY_ID: '/group/:group_id', // GET /api/group/{groupId}, PATCH, DELETE
    JOIN: '/group/:group_id/join', // POST /api/group/{groupId}/join - 공개 그룹 가입
    INVITE: '/group/:group_id/invite', // POST /api/group/{groupId}/invite - 그룹 코드 발급
    ACCEPT_BY_CODE: '/group/invite/accept', // POST /api/group/invite/accept - 코드로 가입
    MEMBERS: '/group/:group_id/member', // GET /api/group/{groupId}/member, DELETE (강퇴)
    LEAVE_ME: '/group/:group_id/me', // DELETE /api/group/{groupId}/me - 그룹 나가기
    INVITATIONS: '/group/:group_id/invitations', // GET - 초대 요청 목록 (비공개)
    ACCEPT_INVITATION: '/group/:group_id/invitations/:invitation_id/accept', // POST
    REJECT_INVITATION: '/group/:group_id/invitations/:invitation_id/reject', // POST
  },
  // 알림 (웹소켓/HTTP)
  NOTIFICATIONS: {
    LIST: '/notifications', // GET /api/notifications - 알림 목록
    READ: '/notifications/:notification_id/read', // PATCH - 알림 읽음 처리
  },
  // 소셜
  SOCIAL: {
    STATS: '/social/:user_id/stats', // GET /api/social/{userId}/stats - 친구 공부 통계
  },
} as const;
