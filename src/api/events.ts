/**
 * 일정 관련 API 함수
 */
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';
import { getUser } from '@/utils/storage';
import {
  mockGetEvents,
  mockCreateEvent,
  mockUpdateEvent,
  mockDeleteEvent,
} from './mock';

export type Calendar = {
  id: string; // UUID
  timezone: string;
  chatSessionId: string; // UUID
  createdAt: string; // ISO 8601 형식
  updatedAt: string; // ISO 8601 형식
};

export type CalendarDetail = {
  id: string; // UUID
  timezone: string;
  createdAt: string; // ISO 8601 형식
  updatedAt: string; // ISO 8601 형식
  events: Array<{
    id: string; // UUID
    status?: string;
    startAt: string; // ISO 8601 형식
    endAt: string; // ISO 8601 형식
    color?: string;
    createdAt: string; // ISO 8601 형식
    updatedAt: string; // ISO 8601 형식
    slots: Array<{
      id: string; // UUID
      slotStartAt: string; // ISO 8601 형식
      slotEndAt: string; // ISO 8601 형식
      slotIndex: number;
      slotTitle: string;
      isDone: boolean;
      done: boolean;
    }>;
  }>;
};

export type Slot = {
  id: string;
  slotStartAt: string; // ISO 8601 형식
  slotEndAt: string; // ISO 8601 형식
  slotIndex: number;
  slotTitle: string;
  isDone: boolean;
  done: boolean;
};

export type Event = {
  id: string;
  status?: string; // 일정 상태
  startAt: string; // ISO 8601 형식 (YYYY-MM-DDTHH:mm:ss.sssZ)
  endAt: string; // ISO 8601 형식 (YYYY-MM-DDTHH:mm:ss.sssZ)
  color?: string; // 색상 코드 (예: '#4caf50', '#9c27b0' 등)
  createdAt: string; // ISO 8601 형식
  updatedAt: string; // ISO 8601 형식
  slots: Slot[]; // 슬롯 배열
  // 호환성을 위한 필드들 (기존 코드와의 호환)
  calendar_id?: string;
  created_by?: string;
  title?: string; // slots[0]?.slotTitle 또는 별도 필드
  date?: string; // startAt에서 추출 가능
  start_at?: string; // startAt과 동일
  end_at?: string; // endAt과 동일
  description?: string;
  deleted_at?: string;
};

export type CreateEventRequest = {
  status?: string; // 일정 상태
  startAt: string; // ISO 8601 형식 시작 일시 (필수)
  endAt: string; // ISO 8601 형식 종료 일시 (필수)
  color?: string; // 색상 코드
  slots: Slot[]; // 슬롯 배열 (필수)
  user_id?: string; // 사용자 ID (필수)
  // 호환성을 위한 필드들
  calendar_id?: string;
  title?: string;
  date?: string;
  start_at?: string;
  end_at?: string;
  description?: string;
};

export type UpdateEventRequest = {
  status?: string;
  startAt?: string;
  endAt?: string;
  color?: string;
  slots?: Slot[];
  user_id?: string; // 사용자 ID
  // 호환성 필드
  calendar_id?: string;
  title?: string;
  date?: string;
  start_at?: string;
  end_at?: string;
  description?: string;
};

/**
 * 내 캘린더 목록 조회 (GET /api/calendar)
 * 로그인한 사용자가 소유한 모든 캘린더 목록을 반환합니다
 * 응답: Calendar[]
 */
export const getCalendar = async (): Promise<{
  success: boolean;
  data?: Calendar[];
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    // 모킹 구현은 필요시 추가
    return {
      success: false,
      error: '모킹 모드: 캘린더 목록 조회 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출
  try {
    const response = await api.get<Calendar[]>(API_ENDPOINTS.CALENDAR.LIST);
    if (!response.success) {
      return { success: false, error: response.error || '캘린더 목록을 불러올 수 없습니다.' };
    }
    return response;
  } catch (error: any) {
    return { success: false, error: error?.message || '캘린더 목록을 불러올 수 없습니다.' };
  }
};

/**
 * 캘린더 생성 (POST /api/calendar)
 * 로그인한 사용자를 owner로 하여 새로운 캘린더를 생성합니다
 * 요청 본문: { timezone: string }
 */
export const createCalendar = async (timezone: string): Promise<{
  success: boolean;
  data?: Calendar;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return {
      success: true,
      data: {
        id: `mock-calendar-${Date.now()}`,
        timezone: timezone,
        chatSessionId: `mock-chat-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // 실제 API 호출
  try {
    const response = await api.post<Calendar>(API_ENDPOINTS.CALENDAR.LIST, { timezone });
    if (!response.success) {
      return { success: false, error: response.error || '캘린더 생성에 실패했습니다.' };
    }
    return response;
  } catch (error: any) {
    return { success: false, error: error?.message || '캘린더 생성에 실패했습니다.' };
  }
};

/**
 * 캘린더 상세 조회 (GET /api/calendar/{calendarId})
 * 지정한 캘린더의 기본 정보와 포함된 이벤트/슬롯 정보를 조회합니다
 * @param calendarId 캘린더 ID (UUID, 필수)
 * 응답: { id, timezone, createdAt, updatedAt, events[] }
 */
export const getCalendarById = async (calendarId: string): Promise<{
  success: boolean;
  data?: CalendarDetail;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    // 모킹 구현은 필요시 추가
    return {
      success: false,
      error: '모킹 모드: 캘린더 상세 조회 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출
  const endpoint = API_ENDPOINTS.CALENDAR.BY_ID.replace(':calendar_id', calendarId);
  return await api.get<CalendarDetail>(endpoint);
};

/**
 * 특정 날짜 슬롯 조회 (GET /api/calendar/{calendarId}/day/{date})
 * 캘린더 ID와 날짜를 기준으로 해당 날짜의 슬롯(event_slots) 목록을 조회합니다
 * @param calendarId 캘린더 ID (UUID, 필수)
 * @param date 날짜 (YYYY-MM-DD 형식, 필수)
 * 응답: EventSlot[] (각 슬롯은 id, eventId, slotStartAt, slotEndAt, slotIndex, slotTitle, isDone 포함)
 */
export const getCalendarByDate = async (
  calendarId: string,
  date: string
): Promise<{
  success: boolean;
  data?: import('./eventSlots').EventSlot[];
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    // 모킹 구현은 필요시 추가
    return {
      success: false,
      error: '모킹 모드: 특정 날짜 슬롯 조회 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출
  const endpoint = API_ENDPOINTS.CALENDAR.BY_DATE
    .replace(':calendar_id', calendarId)
    .replace(':date', date);
  return await api.get<import('./eventSlots').EventSlot[]>(endpoint);
};

/**
 * 일정 목록 조회 (GET /api/calendar/{userId}/{calendarId})
 * @param calendarId 캘린더 ID (필수)
 * @param startDate 시작 날짜 (선택, YYYY-MM-DD) - 모킹 모드용
 * @param endDate 종료 날짜 (선택, YYYY-MM-DD) - 모킹 모드용
 */
export const getEvents = async (
  calendarId?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  data?: Event[];
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return await mockGetEvents(startDate, endDate);
  }

  // 실제 API 호출 - GET /api/calendar/{userId}/{calendarId}
  const user = await getUser();
  
  if (!user || !user.id) {
    return {
      success: false,
      error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
    };
  }

  const id = calendarId || 'default'; // 기본 캘린더 ID
  const endpoint = API_ENDPOINTS.CALENDAR.EVENT_GET
    .replace(':user_id', user.id)
    .replace(':calendar_id', id);

  try {
    const response = await api.get<Event[]>(endpoint);
    if (!response.success) {
      return { success: false, error: response.error || '일정을 불러올 수 없습니다.' };
    }
    return response;
  } catch (error: any) {
    return { success: false, error: error?.message || '일정을 불러올 수 없습니다.' };
  }
};

/**
 * 캘린더 일별 조회 (GET /api/calendar/day/{date})
 * 스펙: 캘린더 상세 조회 - 날짜 기준
 */
export const getCalendarByDay = async (date: string): Promise<{
  success: boolean;
  data?: Event[];
  error?: string;
}> => {
  if (USE_MOCK_API) {
    return await mockGetEvents(date, date);
  }
  try {
    const endpoint = API_ENDPOINTS.CALENDAR.BY_DAY.replace(':date', date);
    const res = await api.get<Event[]>(endpoint, true);
    if (!res.success) return { success: false, error: res.error };
    return res;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * 특정 날짜의 일정 조회 (TIMESTAMP 기반, ERD 참고)
 * events 테이블에서 start_at이 해당 날짜 범위에 있는 일정 조회
 */
export const getEventsByDate = async (date: string): Promise<{
  success: boolean;
  data?: Event[];
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return await mockGetEvents(date, date);
  }

  // 실제 API 호출 - 캘린더 날짜별 조회 사용 (calendar_id 필요 시 getCalendarByDate 사용)
  const endpoint = API_ENDPOINTS.CALENDAR.BY_DATE.replace(':date', date);
  return await api.get<Event[]>(endpoint);
};

/**
 * 일정 생성 (POST /api/calendar/{user_id}/{calendar_id})
 */
export const createEvent = async (
  eventData: CreateEventRequest
): Promise<{
  success: boolean;
  data?: Event;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return await mockCreateEvent(eventData);
  }

  // 실제 API 호출
  const user = await getUser();
  
  if (!user || !user.id) {
    return {
      success: false,
      error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
    };
  }

  // calendar_id는 이벤트 ID 또는 날짜 기반으로 생성 (실제 백엔드에 따라 다를 수 있음)
  const calendarId = eventData.calendar_id || eventData.date.replace(/-/g, ''); // YYYYMMDD 형식

  const endpoint = API_ENDPOINTS.CALENDAR.EVENT_CREATE
    .replace(':user_id', user.id)
    .replace(':calendar_id', calendarId);

  // 요청 본문에 user_id만 포함 (사용자 정보 전체가 아닌)
  const requestBody = {
    ...eventData,
    user_id: user.id,
  };

  try {
    const response = await api.post<Event>(endpoint, requestBody);
    if (!response.success) {
      return { success: false, error: response.error || '일정 생성에 실패했습니다.' };
    }
    return response;
  } catch (error: any) {
    return { success: false, error: error?.message || '일정 생성에 실패했습니다.' };
  }
};

/**
 * 일정 수정 (PATCH /api/calendar/{user_id}/{calendar_id})
 * 응답: { eventId, status, startAt, endAt, color, slots[] }
 * 캘린더 소유자 또는 일정 생성자만 수정 가능
 */
export const updateEvent = async (
  id: string,
  eventData: UpdateEventRequest
): Promise<{
  success: boolean;
  data?: Event;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return await mockUpdateEvent(id, eventData);
  }

  // 실제 API 호출
  const user = await getUser();
  
  if (!user || !user.id) {
    return {
      success: false,
      error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
    };
  }

  // calendar_id는 이벤트 ID 사용
  const endpoint = API_ENDPOINTS.CALENDAR.EVENT_UPDATE
    .replace(':user_id', user.id)
    .replace(':calendar_id', id);

  // 요청 본문에 user_id만 포함 (사용자 정보 전체가 아닌)
  const requestBody = {
    ...eventData,
    user_id: user.id,
  };

  try {
    const response = await api.patch<Event & { eventId?: string }>(endpoint, requestBody);
    if (!response.success) {
      return { success: false, error: response.error || '일정 수정에 실패했습니다.' };
    }
    if (response.data) {
      const d = response.data as any;
      if (d.eventId && !d.id) d.id = d.eventId;
    }
    return response;
  } catch (error: any) {
    return { success: false, error: error?.message || '일정 수정에 실패했습니다.' };
  }
};

/**
 * 일정 삭제 (DELETE /api/calendar/{user_id}/{calendar_id})
 * 응답: { eventId: string }
 */
export const deleteEvent = async (id: string): Promise<{
  success: boolean;
  data?: { eventId: string };
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return await mockDeleteEvent(id);
  }

  // 실제 API 호출
  const user = await getUser();
  
  if (!user || !user.id) {
    return {
      success: false,
      error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
    };
  }

  // calendar_id는 이벤트 ID 사용
  const endpoint = API_ENDPOINTS.CALENDAR.EVENT_DELETE
    .replace(':user_id', user.id)
    .replace(':calendar_id', id);

  try {
    const response = await api.delete<{ eventId: string }>(endpoint);
    if (!response.success) {
      return { success: false, error: response.error || '일정 삭제에 실패했습니다.' };
    }
    return response.success && response.data
      ? { success: true, data: response.data }
      : response;
  } catch (error: any) {
    return { success: false, error: error?.message || '일정 삭제에 실패했습니다.' };
  }
};
