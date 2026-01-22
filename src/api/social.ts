/**
 * 소셜 API - 친구 공부 통계
 */
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';

export type FriendStats = {
  userId: string;
  totalTime: number;
  todayTime: number;
  weeklyTime: number;
  monthlyTime: number;
  name?: string;
  email?: string;
};

type FriendStatsResponse = {
  profile?: {
    userId?: string;
    name?: string;
    email?: string;
  };
  stats?: {
    todayStudyTime?: number;
    weeklyStudyTime?: number;
    monthlyStudyTime?: number;
    totalStudyTime?: number;
  };
};

/**
 * 친구 공부 통계 조회 (GET /api/social/{userId}/stats)
 */
export const getFriendStats = async (userId: string): Promise<{
  success: boolean;
  data?: FriendStats;
  error?: string;
}> => {
  const mockData: FriendStats = {
    userId,
    totalTime: 7200,
    todayTime: 1800,
    weeklyTime: 3600,
    monthlyTime: 14400,
    name: '친구',
    email: 'friend@example.com',
  };

  if (USE_MOCK_API) {
    return { success: true, data: mockData };
  }

  try {
    const endpoint = API_ENDPOINTS.SOCIAL.STATS.replace(':user_id', userId);
    const res = await api.get<FriendStats | FriendStatsResponse>(endpoint, true);
    if (!res.success) {
      return { success: false, error: res.error || '친구 공부 시간을 불러올 수 없습니다.' };
    }
    const data = res.data as FriendStats | FriendStatsResponse | undefined;
    if (data && 'profile' in data) {
      const profile = data.profile ?? {};
      const stats = data.stats ?? {};
      return {
        success: true,
        data: {
          userId: profile.userId || userId,
          name: profile.name,
          email: profile.email,
          todayTime: stats.todayStudyTime ?? 0,
          weeklyTime: stats.weeklyStudyTime ?? 0,
          monthlyTime: stats.monthlyStudyTime ?? 0,
          totalTime: stats.totalStudyTime ?? 0,
        },
      };
    }
    return res as { success: boolean; data?: FriendStats; error?: string };
  } catch (e: any) {
    return { success: false, error: e?.message || '친구 공부 시간을 불러올 수 없습니다.' };
  }
};
