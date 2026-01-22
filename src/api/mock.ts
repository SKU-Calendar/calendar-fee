/**
 * 로컬 스토리지 기반 API 모킹 시스템
 * 백엔드 서버 없이 프론트엔드만 테스트하기 위한 모킹
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = '@calendar_app:events';
const USERS_KEY = '@calendar_app:users';

import { USE_MOCK_API } from './config';

/**
 * 모킹된 사용자 데이터 관리
 */
const mockUsers = {
  // 기본 사용자 (테스트용)
  'test@example.com': {
    id: 'user-1',
    email: 'test@example.com',
    password: 'password123', // 실제로는 해시되어야 하지만 모킹용
    name: '테스트 사용자',
  },
};

/**
 * 이벤트 데이터 가져오기
 */
export const getMockEvents = async (): Promise<any[]> => {
  try {
    const eventsStr = await AsyncStorage.getItem(EVENTS_KEY);
    return eventsStr ? JSON.parse(eventsStr) : [];
  } catch (error) {
    console.error('이벤트 조회 오류:', error);
    return [];
  }
};

/**
 * 이벤트 데이터 저장
 */
export const saveMockEvents = async (events: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('이벤트 저장 오류:', error);
    throw error;
  }
};

/**
 * 모킹된 로그인
 */
export const mockLogin = async (email: string, password: string) => {
  // 간단한 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 500));

  const user = mockUsers[email as keyof typeof mockUsers];
  
  if (!user || user.password !== password) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 토큰 생성 (간단한 랜덤 문자열)
  const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken: token,
      refreshToken: `mock_refresh_${token}`,
    },
  };
};

/**
 * 모킹된 회원가입
 */
export const mockSignup = async (email: string, password: string, name?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (mockUsers[email as keyof typeof mockUsers]) {
    return {
      success: false,
      error: '이미 등록된 이메일입니다.',
    };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    email,
    password,
    name: name || email.split('@')[0], // name이 제공되면 사용, 없으면 이메일에서 추출
  };

  mockUsers[email as keyof typeof mockUsers] = newUser;

  const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      accessToken: token,
      refreshToken: `mock_refresh_${token}`,
    },
  };
};

/**
 * 모킹된 이벤트 조회
 */
export const mockGetEvents = async (startDate?: string, endDate?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const events = await getMockEvents();

  if (!startDate && !endDate) {
    return {
      success: true,
      data: events,
    };
  }

  // 날짜 필터링
  const filtered = events.filter((event) => {
    if (startDate && event.date < startDate) return false;
    if (endDate && event.date > endDate) return false;
    return true;
  });

  return {
    success: true,
    data: filtered,
  };
};

/**
 * 모킹된 이벤트 생성
 */
export const mockCreateEvent = async (eventData: {
  title?: string;
  date?: string;
  description?: string;
  color?: string;
  startAt?: string;
  endAt?: string;
  slots?: any[];
  [key: string]: any;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const events = await getMockEvents();

  const newEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: eventData.title || eventData.slots?.[0]?.slotTitle || '새 일정',
    date: eventData.date || new Date().toISOString().split('T')[0],
    startAt: eventData.startAt || new Date().toISOString(),
    endAt: eventData.endAt || new Date().toISOString(),
    ...eventData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  events.push(newEvent);
  await saveMockEvents(events);

  return {
    success: true,
    data: newEvent,
  };
};

/**
 * 모킹된 이벤트 수정
 */
export const mockUpdateEvent = async (
  id: string,
  eventData: { 
    title?: string; 
    date?: string; 
    description?: string; 
    color?: string;
    startAt?: string;
    endAt?: string;
    slots?: any[];
    [key: string]: any;
  }
) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const events = await getMockEvents();
  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    return {
      success: false,
      error: '일정을 찾을 수 없습니다.',
    };
  }

  events[index] = {
    ...events[index],
    ...eventData,
    updatedAt: new Date().toISOString(),
  };

  await saveMockEvents(events);

  return {
    success: true,
    data: events[index],
  };
};

/**
 * 모킹된 이벤트 삭제
 */
export const mockDeleteEvent = async (id: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const events = await getMockEvents();
  const filtered = events.filter((e) => e.id !== id);

  if (events.length === filtered.length) {
    return {
      success: false,
      error: '일정을 찾을 수 없습니다.',
    };
  }

  await saveMockEvents(filtered);

  return {
    success: true,
  };
};

/**
 * 모킹된 AI 챗봇 (간단한 응답만 반환)
 */
export const mockChatWithAI = async (request: {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 응답 지연 시뮬레이션

  const userMessage = request.message.toLowerCase();
  let responseMessage = '';
  const events: any[] = [];

  // 간단한 패턴 매칭으로 일정 생성
  if (userMessage.includes('일정') || userMessage.includes('추가') || userMessage.includes('만들')) {
    // 날짜 추출 시도
    const datePatterns = [
      { pattern: /내일|tomorrow/i, offset: 1 },
      { pattern: /모레|day after tomorrow/i, offset: 2 },
      { pattern: /(\d{1,2})\s*월\s*(\d{1,2})\s*일/i, custom: true },
      { pattern: /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/i, custom: true },
    ];

    let targetDate = new Date();
    for (const pattern of datePatterns) {
      const match = userMessage.match(pattern.pattern);
      if (match) {
        if (pattern.custom && match[1]) {
          // 날짜 파싱
          if (match[3]) {
            // YYYY-MM-DD 형식
            targetDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else {
            // MM월 DD일 형식
            const currentYear = new Date().getFullYear();
            targetDate = new Date(currentYear, parseInt(match[1]) - 1, parseInt(match[2]));
          }
        } else if (pattern.offset) {
          targetDate.setDate(targetDate.getDate() + pattern.offset);
        }
        break;
      }
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    
    // 제목 추출
    let title = '일정';
    const titlePatterns = [
      /회의/i,
      /약속/i,
      /생일/i,
      /파티/i,
      /병원/i,
      /예약/i,
    ];

    for (const pattern of titlePatterns) {
      if (userMessage.match(pattern)) {
        title = userMessage.match(pattern)?.[0] || '일정';
        break;
      }
    }

    events.push({
      title,
      date: dateStr,
      description: userMessage,
    });

    responseMessage = `네, ${dateStr}에 "${title}" 일정을 생성해드리겠습니다.`;
  } else {
    responseMessage = '안녕하세요! 일정을 도와드리는 AI 어시스턴트입니다. "내일 회의 일정 추가해줘" 같은 요청을 보내주세요.';
  }

  return {
    success: true,
    message: responseMessage,
    events: events.length > 0 ? events : undefined,
  };
};
