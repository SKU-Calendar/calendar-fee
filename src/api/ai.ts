/**
 * AI 챗봇 API 클라이언트
 * 백엔드 서버를 통해 OpenAI API를 호출합니다
 */

import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';

export type ChatMessage = {
  id?: string; // 메시지 ID (API 응답에서 받음)
  chatId?: string; // 채팅 ID
  role: 'user' | 'assistant' | 'system' | 'USER' | 'ASSISTANT' | 'SYSTEM'; // API는 대문자로 올 수 있음
  content: string;
  createdAt?: string; // ISO 8601 형식
};

export type ParsedEvent = {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
};

export type ChatResponse = {
  success: boolean;
  message?: string;
  events?: ParsedEvent[];
  error?: string;
};

export type ChatRequest = {
  message: string; // 사용자 메시지 (자연어 입력)
  calendarId: string; // 캘린더 ID (필수)
  // 호환성을 위한 필드
  conversationHistory?: ChatMessage[]; // 대화 히스토리 (선택사항, API 스펙에는 없지만 기존 코드 호환성)
};

/**
 * 채팅 메시지 전송 및 일정 생성 (POST /api/chats/{chatId})
 * 사용자의 자연어 입력을 받아 OpenAI API를 호출하여 일정(Event)과 슬롯(Slot)을 생성
 * 요청 본문: { message, calendarId }
 */
export const sendChat = async (
  chatId: string,
  request: ChatRequest
): Promise<ChatResponse> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    const { mockChatWithAI } = await import('./mock');
    return await mockChatWithAI(request);
  }

  // 실제 API 호출 - API 스펙에 맞게 calendarId 포함
  const endpoint = API_ENDPOINTS.CHAT.SEND.replace(':chat_id', chatId);
  // API 스펙에 맞게 message와 calendarId만 전송 (conversationHistory는 제외)
  const apiRequest = {
    message: request.message,
    calendarId: request.calendarId,
  };
  return await api.post<ChatResponse>(endpoint, apiRequest, true);
};

/**
 * 채팅 메시지 목록 조회 (GET /api/chats/{chatId})
 * 특정 chatId에 해당하는 모든 채팅 메시지 목록을 생성 시간 순으로 조회
 * 응답: { id, chatId, role, content, createdAt }[]
 */
export const getChat = async (chatId: string): Promise<{
  success: boolean;
  data?: ChatMessage[];
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    const { mockChatWithAI } = await import('./mock');
    const mockResponse = await mockChatWithAI({ message: '' });
    // 모킹 응답을 메시지 배열 형식으로 변환
    return {
      success: mockResponse.success,
      data: mockResponse.message ? [{
        role: 'assistant',
        content: mockResponse.message,
      }] : [],
      error: mockResponse.error,
    };
  }

  // 실제 API 호출
  const endpoint = API_ENDPOINTS.CHAT.GET.replace(':chat_id', chatId);
  const response = await api.get<ChatMessage[]>(endpoint, true);
  
  if (response.success && response.data) {
    // API 응답의 role을 소문자로 정규화 (호환성)
    const normalizedMessages = response.data.map(msg => ({
      ...msg,
      role: (msg.role.toLowerCase() as 'user' | 'assistant' | 'system') || msg.role,
    }));
    return {
      success: true,
      data: normalizedMessages,
    };
  }

  return {
    success: false,
    error: response.error || '채팅 메시지를 불러오는데 실패했습니다.',
  };
};

/**
 * 백엔드 API를 통한 챗봇 응답 생성 (기존 호환성을 위한 함수)
 * @deprecated sendChat 사용 권장
 */
export const chatWithAI = async (
  request: ChatRequest
): Promise<ChatResponse> => {
  // 기본 chat_id 사용 (실제로는 사용자별 또는 세션별 ID 사용)
  const chatId = 'default';
  return await sendChat(chatId, request);
};

