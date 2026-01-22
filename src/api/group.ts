/**
 * 그룹 관련 API 함수
 * 백엔드: GroupService (GroupCreateRequest: groupName, isPublic / GroupResponse: id, ownerUserId, groupName, isPublic, createdAt, updatedAt / GroupInviteResponse: groupId, code, expiresAt)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';

const MOCK_CREATED_GROUPS_KEY = '@calendar_app:mock_created_groups';

/** 백엔드 GroupResponse DTO */
type GroupResponseDto = {
  id?: string;
  ownerUserId?: string;
  groupName?: string;
  description?: string;
  groupDescription?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number; // 멤버 수
};

/** 백엔드 GroupInviteResponse: groupId, code, expiresAt */
type GroupInviteResponseDto = { groupId?: string; code?: string; expiresAt?: string };

/** 백엔드 GroupMemberResponse: userId, role, joinedAt (+ optional name/email) */
type GroupMemberResponseDto = {
  userId?: string;
  role?: string;
  joinedAt?: string;
  name?: string;
  email?: string;
  userName?: string;
  userEmail?: string;
  profile?: {
    userId?: string;
    id?: string;
    name?: string;
    email?: string;
  };
};

function mapGroup(d: GroupResponseDto | undefined | null): Group | null {
  if (!d || d.id == null) return null;
  return {
    id: String(d.id),
    name: d.groupName ?? '',
    description: d.description ?? d.groupDescription ?? undefined,
    ownerId: d.ownerUserId != null ? String(d.ownerUserId) : '',
    isPublic: d.isPublic ?? false,
    createdAt: d.createdAt ?? new Date().toISOString(),
    updatedAt: d.updatedAt ?? new Date().toISOString(),
    memberCount: d.memberCount ?? undefined, // 멤버 수 매핑
  };
}

function mapGroupMember(d: GroupMemberResponseDto | undefined | null, groupId: string): GroupMember | null {
  const resolvedUserId = d?.userId ?? d?.profile?.userId ?? d?.profile?.id;
  if (!d || resolvedUserId == null) return null;
  const name = d.name ?? d.userName ?? d.profile?.name;
  const email = d.email ?? d.userEmail ?? d.profile?.email ?? '';
  return {
    id: String(resolvedUserId),
    userId: String(resolvedUserId),
    groupId,
    email,
    name: name ?? undefined,
    joinedAt: d.joinedAt ?? new Date().toISOString(),
  };
}

export type Group = {
  id: string;
  name: string;
  description?: string;
  code?: string; // 초대 코드
  isPublic?: boolean; // 공개 여부
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
};

export type GroupMember = {
  id: string;
  userId: string;
  groupId: string;
  email: string;
  name?: string;
  joinedAt: string;
  studyTime?: number; // 총 공부 시간 (초)
};

export type GroupInvitation = {
  id: string;
  groupId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type CreateGroupRequest = {
  name: string;
  description?: string;
  isPublic?: boolean; // 공개 여부 (기본값: false)
};

export type UpdateGroupRequest = {
  name?: string;
  description?: string;
  isPublic?: boolean;
};

/**
 * 8자리 초대 코드 생성 (영문+숫자) — 백엔드 발급 형식과 동일 (목업/폴백용)
 */
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/** 백엔드 실패/목업 시 생성된 그룹을 로컬에 저장 (getGroups에서 함께 반환) */
const persistMockCreatedGroup = async (group: Group): Promise<void> => {
  try {
    const u = await import('@/utils/storage').then((m) => m.getUser());
    const toSave = { ...group, ownerId: u?.id || group.ownerId };
    const raw = await AsyncStorage.getItem(MOCK_CREATED_GROUPS_KEY);
    const list: Group[] = raw ? JSON.parse(raw) : [];
    list.push(toSave);
    await AsyncStorage.setItem(MOCK_CREATED_GROUPS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('mock 그룹 로컬 저장 실패:', e);
  }
};

/** 로컬에 저장된 mock 생성 그룹 목록 */
const getMockCreatedGroups = async (): Promise<Group[]> => {
  try {
    const raw = await AsyncStorage.getItem(MOCK_CREATED_GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * 그룹 생성 (POST /api/group)
 */
export const createGroup = async (data: CreateGroupRequest): Promise<{
  success: boolean;
  data?: Group;
  error?: string;
}> => {
  const inviteCode = generateInviteCode();
  const mockData = {
    success: true as const,
    data: {
      id: `mock-group-${Date.now()}`,
      name: data.name,
      description: data.description,
      code: inviteCode,
      isPublic: data.isPublic ?? false,
      ownerId: 'mock-user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  if (USE_MOCK_API) {
    await persistMockCreatedGroup(mockData.data);
    return mockData;
  }

  try {
    const body = { groupName: data.name, isPublic: data.isPublic ?? false };
    const response = await api.post<GroupResponseDto>(API_ENDPOINTS.GROUP.LIST, body, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 생성에 실패했습니다.' };
    }
    const mapped = mapGroup(response.data);
    if (!mapped) return { success: false, error: '그룹 생성 응답 형식이 올바르지 않습니다.' };
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 생성에 실패했습니다.' };
  }
};

/**
 * 그룹 목록 조회 (GET /api/group)
 */
const DEFAULT_MOCK_GROUPS: Group[] = [
  {
    id: 'mock-group-1',
    name: '스터디 그룹 1',
    description: '함께 공부하는 그룹입니다',
    ownerId: 'mock-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    memberCount: 3,
  },
  {
    id: 'mock-group-2',
    name: '코딩 스터디',
    description: '코딩 공부 모임',
    ownerId: 'mock-user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    memberCount: 5,
  },
];

export const getGroups = async (): Promise<{
  success: boolean;
  data?: Group[];
  error?: string;
}> => {
  const mergeMockList = async (): Promise<Group[]> => {
    const created = await getMockCreatedGroups();
    return [...DEFAULT_MOCK_GROUPS, ...created];
  };

  if (USE_MOCK_API) {
    return { success: true, data: await mergeMockList() };
  }

  try {
    const response = await api.get<GroupResponseDto[]>(API_ENDPOINTS.GROUP.LIST, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 목록을 불러올 수 없습니다.' };
    }
    const raw = Array.isArray(response.data) ? response.data : [];
    const list = raw.map((d) => mapGroup(d)).filter((g): g is Group => g != null);
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 목록을 불러올 수 없습니다.' };
  }
};

/**
 * 그룹 상세 조회 (GET /api/group/{groupid})
 */
export const getGroupById = async (groupId: string): Promise<{
  success: boolean;
  data?: Group;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
    data: {
      id: groupId,
      name: 'Mock Group',
      ownerId: 'mock-user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.BY_ID.replace(':group_id', groupId);
    const response = await api.get<GroupResponseDto>(endpoint, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 정보를 불러올 수 없습니다.' };
    }
    const mapped = mapGroup(response.data);
    if (!mapped) return { success: false, error: '그룹 정보를 불러올 수 없습니다.' };
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 정보를 불러올 수 없습니다.' };
  }
};

/**
 * 그룹 정보 수정 (PATCH /api/group/{groupid})
 * 백엔드 GroupUpdateRequest: groupName?, isPublic?
 */
export const updateGroup = async (groupId: string, data: UpdateGroupRequest): Promise<{
  success: boolean;
  data?: Group;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
    data: {
      id: groupId,
      name: data.name || 'Updated Group',
      ownerId: 'mock-user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.BY_ID.replace(':group_id', groupId);
    const body: { groupName?: string; isPublic?: boolean } = {};
    if (data.name != null) body.groupName = data.name;
    if (data.isPublic != null) body.isPublic = data.isPublic;
    const response = await api.patch<GroupResponseDto>(endpoint, body, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 수정에 실패했습니다.' };
    }
    const mapped = mapGroup(response.data);
    if (!mapped) return { success: false, error: '그룹 수정 응답 형식이 올바르지 않습니다.' };
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 수정에 실패했습니다.' };
  }
};

/**
 * 그룹 삭제 (DELETE /api/group/{groupid})
 */
export const deleteGroup = async (groupId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.BY_ID.replace(':group_id', groupId);
    const response = await api.delete(endpoint, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 삭제에 실패했습니다.' };
    }
    return response;
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 삭제에 실패했습니다.' };
  }
};

/**
 * 그룹 코드 발급 (POST /api/group/{groupId}/invite)
 * 백엔드 issueInvite: body 없음, GroupInviteResponse(groupId, code, expiresAt) 반환
 */
export const inviteGroup = async (groupId: string): Promise<{
  success: boolean;
  data?: { code: string };
  error?: string;
}> => {
  const mockData = {
    success: true as const,
    data: { code: generateInviteCode() },
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.INVITE.replace(':group_id', groupId);
    const response = await api.post<GroupInviteResponseDto>(endpoint, undefined, true);
    if (!response.success) {
      return { success: false, error: response.error || '초대 코드 발급에 실패했습니다.' };
    }
    const d = response.data as Record<string, unknown> | undefined;
    const code = (d?.code ?? d?.inviteCode ?? (d?.invite as Record<string, unknown>)?.code ?? (d?.data as Record<string, unknown>)?.code ?? '') as string;
    return { success: true, data: { code: code || '' } };
  } catch (error: any) {
    return { success: false, error: error?.message || '초대 코드 발급에 실패했습니다.' };
  }
};

/**
 * 코드로 그룹 참여 (POST /api/group/invite/accept)
 * 백엔드 acceptInvite(inviteCode): body { code } (또는 { inviteCode } — 컨트롤러 DTO에 맞게 변경), 반환 void(200)
 */
export const joinGroupByCode = async (code: string): Promise<{
  success: boolean;
  data?: Group;
  requiresApproval?: boolean;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
    data: {
      id: `mock-group-${Date.now()}`,
      name: '참여한 그룹',
      isPublic: true,
      ownerId: 'mock-user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    requiresApproval: false,
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const response = await api.post(API_ENDPOINTS.GROUP.ACCEPT_BY_CODE, { code }, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 참여에 실패했습니다.' };
    }
    const stub: Group = { id: '', name: '그룹', ownerId: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return { success: true, data: stub, requiresApproval: false };
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 참여 중 오류가 발생했습니다.' };
  }
};

/**
 * 그룹 초대 요청 목록 조회 (GET /api/group/{groupId}/invitations)
 */
export const getGroupInvitations = async (groupId: string): Promise<{
  success: boolean;
  data?: GroupInvitation[];
  error?: string;
}> => {
  const mockData = {
    success: true as const,
    data: [] as GroupInvitation[],
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.INVITATIONS.replace(':group_id', groupId);
    const response = await api.get<GroupInvitation[]>(endpoint, true);
    if (!response.success) {
      return { success: false, error: response.error || '초대 목록을 불러올 수 없습니다.' };
    }
    const list = Array.isArray(response.data) ? response.data : [];
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error?.message || '초대 목록을 불러올 수 없습니다.' };
  }
};

/**
 * 공개 그룹 참여 (POST /api/group/{groupId}/join)
 */
export const joinPublicGroup = async (groupId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const mockData = { success: true as const };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.JOIN.replace(':group_id', groupId);
    const response = await api.post(endpoint, undefined, true);
    if (!response.success) {
      return { success: false, error: response.error || '그룹 참여에 실패했습니다.' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || '그룹 참여 중 오류가 발생했습니다.' };
  }
};

/**
 * 초대 요청 수락 (POST /api/group/{groupId}/invitations/{invitationId}/accept)
 */
export const acceptInvitation = async (groupId: string, invitationId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.ACCEPT_INVITATION
      .replace(':group_id', groupId)
      .replace(':invitation_id', invitationId);
    const response = await api.post(endpoint, undefined, true);
    if (!response.success) {
      console.warn('백엔드 에러:', response.error);
      return {
        success: false,
        error: response.error || '초대 수락에 실패했습니다.',
      };
    }
    return { success: true };
  } catch (error: any) {
    console.warn('백엔드 요청 실패:', error);
    return {
      success: false,
      error: error.message || '초대 수락 중 오류가 발생했습니다.',
    };
  }
};

/**
 * 초대 요청 거절 (POST /api/group/{groupId}/invitations/{invitationId}/reject)
 */
export const rejectInvitation = async (groupId: string, invitationId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.REJECT_INVITATION
      .replace(':group_id', groupId)
      .replace(':invitation_id', invitationId);
    const response = await api.post(endpoint, undefined, true);
    if (!response.success) {
      console.warn('백엔드 에러:', response.error);
      return {
        success: false,
        error: response.error || '초대 거절에 실패했습니다.',
      };
    }
    return { success: true };
  } catch (error: any) {
    console.warn('백엔드 요청 실패:', error);
    return {
      success: false,
      error: error.message || '초대 거절 중 오류가 발생했습니다.',
    };
  }
};

/**
 * 그룹 나가기 (DELETE /api/group/{groupId}/me)
 */
export const leaveGroup = async (groupId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const mockData = { success: true as const };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.LEAVE_ME.replace(':group_id', groupId);
    const response = await api.delete(endpoint, true);
    if (!response.success) {
      console.warn('백엔드 에러:', response.error);
      return { success: false, error: response.error };
    }
    return { success: true };
  } catch (error: any) {
    console.warn('백엔드 요청 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 그룹 멤버 목록 조회 (GET /api/group/{groupId}/member)
 */
export const getGroupMembers = async (groupId: string): Promise<{
  success: boolean;
  data?: GroupMember[];
  error?: string;
}> => {
  const mockData = {
    success: true as const,
    data: [
      {
        id: 'member-1',
        userId: 'user-1',
        groupId: groupId,
        email: 'member1@example.com',
        name: '멤버 1',
        joinedAt: new Date().toISOString(),
        studyTime: 7200, // 2시간
      },
      {
        id: 'member-2',
        userId: 'user-2',
        groupId: groupId,
        email: 'member2@example.com',
        name: '멤버 2',
        joinedAt: new Date().toISOString(),
        studyTime: 10800, // 3시간
      },
    ] as GroupMember[],
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.MEMBERS.replace(':group_id', groupId);
    const response = await api.get<GroupMemberResponseDto[]>(endpoint, true);
    if (!response.success) {
      return { success: false, error: response.error || '멤버 목록을 불러올 수 없습니다.' };
    }
    const raw = Array.isArray(response.data) ? response.data : [];
    const list = raw.map((d) => mapGroupMember(d, groupId)).filter((m): m is GroupMember => m != null);
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error?.message || '멤버 목록을 불러올 수 없습니다.' };
  }
};

/**
 * 그룹 멤버 제거 (DELETE /api/group/{groupId}/member)
 * 백엔드 kickMember: targetUserId 쿼리
 */
export const removeGroupMember = async (groupId: string, memberId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const mockData = {
    success: true as const,
  };

  if (USE_MOCK_API) {
    return mockData;
  }

  try {
    const endpoint = API_ENDPOINTS.GROUP.MEMBERS.replace(':group_id', groupId);
    const url = `${endpoint}?targetUserId=${encodeURIComponent(memberId)}`;
    const response = await api.delete(url, true);
    if (!response.success) {
      return { success: false, error: response.error || '멤버 제거에 실패했습니다.' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || '멤버 제거에 실패했습니다.' };
  }
};
