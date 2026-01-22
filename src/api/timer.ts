/**
 * 타이머 관련 API 함수
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';

const TIMER_SESSIONS_KEY = '@calendar_app:timer_sessions';

export type TimerSessionRecord = {
  startTime: string;
  endTime: string;
  duration: number;
};

export type TimerStats = {
  totalTime: number; // 총 공부 시간 (초)
  todayTime: number; // 오늘 공부 시간 (초)
  weeklyTime: number; // 이번 주 공부 시간 (초)
  monthlyTime: number; // 이번 달 공부 시간 (초)
  sessions: Array<{
    id: string;
    startTime: string; // ISO 8601
    endTime?: string; // ISO 8601
    duration: number; // 초
  }>;
};

export type TimerResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    timerId?: string;
    startTime?: string;
    status?: 'running' | 'paused' | 'stopped';
  };
};

/**
 * 타이머 시작 (POST /api/timer/start)
 * body에 startTime을 넣어 백엔드가 세션을 DB에 저장할 수 있게 함
 */
export const startTimer = async (): Promise<TimerResponse> => {
  const startTime = new Date().toISOString();
  if (USE_MOCK_API) {
    return {
      success: true,
      data: { timerId: 'mock-timer-1', startTime, status: 'running' },
    };
  }

  try {
    const response = await api.post<TimerResponse['data']>(API_ENDPOINTS.TIMER.START, { startTime }, true);
    if (!response.success) {
      return { success: false, error: (response as any).error || '타이머 시작에 실패했습니다.' };
    }
    return response as TimerResponse;
  } catch (error: any) {
    return { success: false, error: error?.message || '타이머 시작에 실패했습니다.' };
  }
};

/**
 * 타이머 일시정지 (POST /api/timer/pause)
 */
export const pauseTimer = async (): Promise<TimerResponse> => {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: {
        status: 'paused',
      },
    };
  }

  try {
    const response = await api.post<TimerResponse['data']>(API_ENDPOINTS.TIMER.PAUSE, undefined, true);
    if (!response.success) {
      return { success: false, error: (response as any).error || '타이머 일시정지에 실패했습니다.' };
    }
    return response as TimerResponse;
  } catch (error: any) {
    return { success: false, error: error?.message || '타이머 일시정지에 실패했습니다.' };
  }
};

/**
 * 타이머 재개 (POST /api/timer/resume)
 */
export const resumeTimer = async (): Promise<TimerResponse> => {
  if (USE_MOCK_API) {
    return {
      success: true,
      data: {
        status: 'running',
      },
    };
  }

  try {
    const response = await api.post<TimerResponse['data']>(API_ENDPOINTS.TIMER.RESUME, undefined, true);
    if (!response.success) {
      return { success: false, error: (response as any).error || '타이머 재개에 실패했습니다.' };
    }
    return response as TimerResponse;
  } catch (error: any) {
    return { success: false, error: error?.message || '타이머 재개에 실패했습니다.' };
  }
};

/** 백엔드 실패 시 로컬에 타이머 세션 저장 */
const persistTimerSessionLocal = async (duration: number): Promise<void> => {
  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - duration * 1000);
    const record: TimerSessionRecord = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
    };
    const raw = await AsyncStorage.getItem(TIMER_SESSIONS_KEY);
    const list: TimerSessionRecord[] = raw ? JSON.parse(raw) : [];
    list.push(record);
    await AsyncStorage.setItem(TIMER_SESSIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('타이머 세션 로컬 저장 실패:', e);
  }
};

/** 로컬에 저장된 타이머 세션 목록 */
const getLocalTimerSessions = async (): Promise<TimerSessionRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(TIMER_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * 타이머 종료 (POST /api/timer/stop)
 * DB의 stopped_at, status=STOPPED 반영을 위해 duration·stopped_at·timer_id 전달
 * @param durationSeconds 기록할 공부 시간(초). 있으면 body로 보냄. 실패 시 로컬 저장
 * @param timerId start 응답의 id. 있으면 body에 포함해 어떤 timer를 stop할지 지정
 */
export const stopTimer = async (
  durationSeconds?: number,
  timerId?: string | null
): Promise<TimerResponse> => {
  if (USE_MOCK_API) {
    if (durationSeconds != null && durationSeconds > 0) {
      await persistTimerSessionLocal(durationSeconds);
    }
    return { success: true, data: { status: 'stopped' } };
  }

  const now = new Date().toISOString();
  const body: Record<string, unknown> = {};
  if (durationSeconds != null && durationSeconds >= 0) {
    body.duration = durationSeconds;
    body.endTime = now;
  }
  body.stopped_at = now;
  if (timerId) body.timer_id = timerId;

  try {
    const response = await api.post<TimerResponse['data']>(API_ENDPOINTS.TIMER.STOP, body, true);
    if (!response.success) {
      return { success: false, error: (response as any).error || '타이머 종료에 실패했습니다.' };
    }
    return response as TimerResponse;
  } catch (error: any) {
    return { success: false, error: error?.message || '타이머 종료에 실패했습니다.' };
  }
};

/** 로컬 세션으로 total/today/weekly/monthly 집계 */
const aggregateLocalSessions = (sessions: TimerSessionRecord[]): TimerStats => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  let totalTime = 0;
  let todayTime = 0;
  let weeklyTime = 0;
  let monthlyTime = 0;

  for (const s of sessions) {
    const t = new Date(s.endTime).getTime();
    totalTime += s.duration;
    if (t >= monthStart) monthlyTime += s.duration;
    if (t >= weekStart) weeklyTime += s.duration;
    if (t >= todayStart) todayTime += s.duration;
  }

  return {
    totalTime,
    todayTime,
    weeklyTime,
    monthlyTime,
    sessions: sessions.map((s, i) => ({
      id: `local-${i}`,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
    })),
  };
};

/** 백엔드 TimerStatsResponseDto 필드 (todayStudyTime, weeklyStudyTime, monthlyStudyTime, totalStudyTime, 초 단위) */
type TimerStatsResponseDto = {
  todayStudyTime?: number | null;
  weeklyStudyTime?: number | null;
  monthlyStudyTime?: number | null;
  totalStudyTime?: number | null;
};

function mapTimerStatsDto(dto: TimerStatsResponseDto | undefined | null): TimerStats {
  const t = dto || {};
  return {
    totalTime: t.totalStudyTime ?? 0,
    todayTime: t.todayStudyTime ?? 0,
    weeklyTime: t.weeklyStudyTime ?? 0,
    monthlyTime: t.monthlyStudyTime ?? 0,
    sessions: [],
  };
}

/**
 * 공부 시간 조회 (GET /api/timer/stats)
 * 백엔드: getStats() → TimerStatsResponseDto(todayStudyTime, weeklyStudyTime, monthlyStudyTime, totalStudyTime)
 * @param userId 사용자 ID (선택). 미입력 시 GET /api/timer/stats — JWT로 현재 사용자 기준 조회
 */
export const getTimerStats = async (userId?: string): Promise<{
  success: boolean;
  data?: TimerStats;
  error?: string;
}> => {
  const fromLocal = async (): Promise<TimerStats> => {
    const sessions = await getLocalTimerSessions();
    return aggregateLocalSessions(sessions);
  };

  if (USE_MOCK_API) {
    return { success: true, data: await fromLocal() };
  }

  try {
    const endpoint = userId
      ? `${API_ENDPOINTS.TIMER.STATS}/${userId}`
      : API_ENDPOINTS.TIMER.STATS;
    const response = await api.get<TimerStatsResponseDto>(endpoint, true);
    if (!response.success) {
      return { success: false, error: (response as any).error || '공부 시간을 불러올 수 없습니다.' };
    }
    return {
      success: true,
      data: mapTimerStatsDto(response.data),
    };
  } catch (error: any) {
    return { success: false, error: error?.message || '공부 시간을 불러올 수 없습니다.' };
  }
};
