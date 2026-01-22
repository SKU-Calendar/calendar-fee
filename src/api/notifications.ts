/**
 * 알림 API (웹소켓/HTTP)
 */
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
};

/**
 * 알림 목록 조회 (GET /api/notifications)
 */
export const getNotifications = async (): Promise<{
  success: boolean;
  data?: Notification[];
  error?: string;
}> => {
  const mockData: Notification[] = [
    {
      id: 'n1',
      type: 'group_invite',
      title: '그룹 초대',
      body: '스터디 그룹에 초대되었습니다.',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ];

  if (USE_MOCK_API) {
    return { success: true, data: mockData };
  }

  try {
    const res = await api.get<Notification[]>(API_ENDPOINTS.NOTIFICATIONS.LIST, true);
    if (!res.success) {
      return { success: false, error: res.error || '알림을 불러올 수 없습니다.' };
    }
    return res;
  } catch (e: any) {
    return { success: false, error: e?.message || '알림을 불러올 수 없습니다.' };
  }
};

/**
 * 알림 읽음 처리 (PATCH /api/notifications/{notificationId}/read)
 */
export const markNotificationRead = async (notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  if (USE_MOCK_API) {
    return { success: true };
  }

  try {
    const endpoint = API_ENDPOINTS.NOTIFICATIONS.READ.replace(':notification_id', notificationId);
    const res = await api.patch(endpoint, undefined, true);
    if (!res.success) return { success: false, error: res.error };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
