/**
 * 이벤트 슬롯 관련 API 함수
 */
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';

export type EventSlot = {
  id: string; // UUID
  eventId: string; // UUID (이벤트 ID)
  slotStartAt: string; // ISO 8601 형식
  slotEndAt: string; // ISO 8601 형식
  slotIndex: number;
  slotTitle: string;
  isDone: boolean;
  // 호환성을 위한 필드들
  slotNote?: string; // 슬롯 메모
  event_id?: string;
  start_at?: string;
  end_at?: string;
  done?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEventSlotRequest = {
  calendarId: string; // 캘린더 ID (필수) - 이벤트를 자동 생성하기 위해 필요
  slotStartAt: string; // ISO 8601 형식 (필수)
  slotEndAt: string; // ISO 8601 형식 (필수)
  slotIndex: number; // 슬롯 인덱스 (필수)
  slotTitle: string; // 슬롯 제목 (필수)
};

export type UpdateEventSlotRequest = {
  slotStartAt?: string; // ISO 8601 형식
  slotEndAt?: string; // ISO 8601 형식
  slotTitle?: string;
  slotNote?: string; // 슬롯 메모
  isDone?: boolean;
};

/**
 * 이벤트 없이 슬롯 생성 (POST /api/event-slots)
 * 캘린더 ID를 받아 자동으로 Event를 생성한 후 슬롯을 생성
 * 요청 본문: { calendarId, slotStartAt, slotEndAt, slotIndex, slotTitle }
 */
export const createEventSlot = async (
  slotData: CreateEventSlotRequest
): Promise<{
  success: boolean;
  data?: EventSlot;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    // 모킹 구현은 필요시 추가
    return {
      success: false,
      error: '모킹 모드: 이벤트 슬롯 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출
  return await api.post<EventSlot>(API_ENDPOINTS.EVENT_SLOTS.CREATE, slotData);
};

/**
 * 슬롯 삭제 (DELETE /api/event-slots/{slotId})
 * 특정 슬롯을 완전히 삭제합니다 (hard delete)
 * @param slotId 슬롯 ID (UUID)
 */
export const deleteEventSlot = async (slotId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return {
      success: false,
      error: '모킹 모드: 이벤트 슬롯 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출
  const endpoint = API_ENDPOINTS.EVENT_SLOTS.DELETE.replace(':slot_id', slotId);
  return await api.delete(endpoint);
};

/**
 * 슬롯 수정 (PATCH /api/event-slots/{slotId})
 * 특정 슬롯의 정보를 수정합니다
 * 수정 가능한 필드: slotStartAt, slotEndAt, slotTitle, slotNote, isDone
 * @param slotId 슬롯 ID (UUID)
 * @param slotData 수정할 슬롯 데이터
 */
export const updateEventSlot = async (
  slotId: string,
  slotData: UpdateEventSlotRequest
): Promise<{
  success: boolean;
  data?: EventSlot;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return {
      success: false,
      error: '모킹 모드: 이벤트 슬롯 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출
  const endpoint = API_ENDPOINTS.EVENT_SLOTS.UPDATE.replace(':slot_id', slotId);
  return await api.patch<EventSlot>(endpoint, slotData);
};

/**
 * 슬롯 완료 여부 변경 (PATCH /api/event-slots/{slotId}/done)
 * 슬롯의 완료 여부(isDone)만 변경합니다
 * @param slotId 슬롯 ID (UUID)
 * @param isDone 완료 여부
 */
export const updateEventSlotDone = async (
  slotId: string,
  isDone: boolean
): Promise<{
  success: boolean;
  data?: EventSlot;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    return {
      success: false,
      error: '모킹 모드: 이벤트 슬롯 기능은 아직 구현되지 않았습니다.',
    };
  }

  // 실제 API 호출 - API 스펙에 맞게 isDone 사용
  const endpoint = API_ENDPOINTS.EVENT_SLOTS.UPDATE_DONE.replace(':slot_id', slotId);
  return await api.patch<EventSlot>(endpoint, { isDone });
};
