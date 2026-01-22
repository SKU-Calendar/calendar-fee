/**
 * 인증 관련 API 함수
 */
import { api } from './client';
import { API_ENDPOINTS, USE_MOCK_API } from './config';
import { saveToken, saveRefreshToken, saveUser, clearAuth, getToken, getRefreshToken, getUser } from '@/utils/storage';
import { mockLogin, mockSignup } from './mock';

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  name: string; // 사용자 이름 (필수)
};

export type AuthResponse = {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  accessToken: string;
  refreshToken?: string;
};

/**
 * 로그인 (POST /api/auth/login)
 * 이메일/비밀번호를 검증하여 JWT 액세스 토큰을 발급합니다
 * 요청 본문: { email, password }
 */
export const login = async (credentials: LoginRequest): Promise<{
  success: boolean;
  data?: AuthResponse;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    const response = await mockLogin(credentials.email, credentials.password);
    if (response.success && response.data) {
      await saveToken(response.data.accessToken);
      if (response.data.refreshToken) {
        await saveRefreshToken(response.data.refreshToken);
      }
      await saveUser(response.data.user);
    }
    return response;
  }

  // 실제 API 호출
  const response = await api.post<AuthResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    credentials,
    false // 로그인은 인증 불필요
  );

  // 로그인 실패 시 상세 로그 출력
  if (!response.success) {
    console.error('로그인 API 응답 실패:', {
      success: response.success,
      error: response.error,
      data: response.data,
    });
  }

  // 로그인 응답 전체 로그 (디버깅)
  console.log('로그인 API 응답:', {
    success: response.success,
    hasData: !!response.data,
    dataKeys: response.data ? Object.keys(response.data) : [],
    fullData: response.data,
  });

  if (response.success && response.data) {
    // 토큰 저장
    await saveToken(response.data.accessToken);
    if (response.data.refreshToken) {
      await saveRefreshToken(response.data.refreshToken);
    }
    
    // 사용자 정보 저장 - 응답 구조 확인
    let userToSave = null;
    
    if (response.data.user) {
      // 응답에 user 객체가 있는 경우
      userToSave = response.data.user;
    } else {
      // 응답에 user가 없을 경우, JWT 토큰에서 사용자 정보 추출
      try {
        const token = response.data.accessToken;
        // JWT 토큰은 base64로 인코딩된 3부분으로 구성: header.payload.signature
        const payload = token.split('.')[1];
        if (payload) {
          // base64 디코딩 (패딩 추가)
          const decodedPayload = JSON.parse(
            atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
          );
          
          // JWT payload에서 사용자 정보 추출
          userToSave = {
            id: decodedPayload.sub || decodedPayload.userId || decodedPayload.id,
            email: decodedPayload.email,
            name: decodedPayload.name,
          };
          
          console.log('JWT 토큰에서 사용자 정보 추출:', userToSave);
        }
      } catch (error) {
        console.error('JWT 토큰 파싱 실패:', error);
      }
    }
    
    if (userToSave && userToSave.id) {
      await saveUser(userToSave);
      console.log('사용자 정보 저장 완료:', userToSave);
    } else {
      console.error('사용자 정보를 추출할 수 없습니다:', response.data);
    }
    
    // 디버깅: 저장 확인
    const savedUser = await getUser();
    console.log('로그인 성공 - 저장된 정보:', {
      hasToken: !!response.data.accessToken,
      hasUser: !!savedUser,
      userId: savedUser?.id,
      savedUser: savedUser,
    });
  }

  return response;
};

/**
 * 회원가입 (POST /api/auth/signup)
 * 새로운 사용자를 생성합니다. 이메일 중복을 검사하고, 비밀번호는 BCrypt로 암호화합니다
 * 요청 본문: { email, password, name }
 */
export const signup = async (data: SignupRequest): Promise<{
  success: boolean;
  data?: AuthResponse;
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    const response = await mockSignup(data.email, data.password);
    if (response.success && response.data) {
      await saveToken(response.data.accessToken);
      if (response.data.refreshToken) {
        await saveRefreshToken(response.data.refreshToken);
      }
      await saveUser(response.data.user);
    }
    return response;
  }

  // 실제 API 호출
  const response = await api.post<AuthResponse>(
    API_ENDPOINTS.AUTH.SIGNUP,
    data,
    false // 회원가입은 인증 불필요
  );

  // 403 에러인 경우 상세 로그 출력
  if (!response.success && response.error) {
    console.error('회원가입 API 응답:', {
      success: response.success,
      error: response.error,
      data: response.data,
    });
  }

  if (response.success && response.data) {
    // 회원가입 후 자동 로그인 처리
    await saveToken(response.data.accessToken);
    if (response.data.refreshToken) {
      await saveRefreshToken(response.data.refreshToken);
    }
    await saveUser(response.data.user);
  }

  return response;
};

/**
 * 로그아웃 (POST /api/auth/logout)
 * 서버 상태를 저장하지 않고 단순 200 OK를 반환하여 클라이언트 측 토큰을 폐기하도록 합니다
 * 응답: { accessToken, tokenType, message }
 */
export const logout = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  // 모킹 모드일 때는 서버 호출 생략
  if (!USE_MOCK_API) {
    try {
      // 서버에 로그아웃 요청 (서버는 상태를 저장하지 않고 200 OK만 반환)
      const response = await api.post<{
        accessToken: string;
        tokenType: string;
        message: string;
      }>(API_ENDPOINTS.AUTH.LOGOUT, undefined, true);
      // 응답은 무시하고 로컬 토큰만 삭제
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error);
      // API 호출 실패해도 로컬 토큰은 삭제
    }
  }

  // 로컬 저장소에서 인증 정보 삭제 (클라이언트 측 토큰 폐기)
  await clearAuth();

  return { success: true };
};

/**
 * 토큰 재발급 (POST /api/auth/refresh)
 */
export const refreshToken = async (): Promise<{
  success: boolean;
  data?: { accessToken: string; refreshToken?: string };
  error?: string;
}> => {
  if (USE_MOCK_API) {
    const t = await getToken();
    if (t) return { success: true, data: { accessToken: t } };
    return { success: false, error: '저장된 토큰이 없습니다.' };
  }

  const refresh = await getRefreshToken();
  if (!refresh) {
    return { success: false, error: '리프레시 토큰이 없습니다.' };
  }

  try {
    const res = await api.post<{ accessToken: string; refreshToken?: string }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken: refresh },
      false
    );
    if (res.success && res.data?.accessToken) {
      await saveToken(res.data.accessToken);
      if (res.data.refreshToken) await saveRefreshToken(res.data.refreshToken);
      return res;
    }
    return { success: false, error: res.error };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/**
 * 프로필 조회 (GET /api/auth/profile)
 */
export const getProfile = async (): Promise<{
  success: boolean;
  data?: {
    id: string;
    email: string;
    name?: string;
  };
  error?: string;
}> => {
  // 모킹 모드일 때
  if (USE_MOCK_API) {
    const user = await import('@/utils/storage').then(m => m.getUser());
    if (user) {
      return {
        success: true,
        data: user,
      };
    }
    return {
      success: false,
      error: '사용자 정보를 찾을 수 없습니다.',
    };
  }

  // 실제 API 호출
  // 프로필 조회는 인증이 필요하므로 requiresAuth = true (기본값)
  const response = await api.get<{
    id: string;
    email: string;
    name?: string;
  }>(API_ENDPOINTS.AUTH.PROFILE, true);

  // 프로필 조회 실패 시 상세 로그
  if (!response.success) {
    console.error('프로필 조회 실패:', {
      success: response.success,
      error: response.error,
      data: response.data,
    });
    
    // 토큰 확인
    const { getToken } = await import('@/utils/storage');
    const token = await getToken();
    console.log('프로필 조회 시 토큰 상태:', {
      hasToken: !!token,
      tokenLength: token?.length,
    });
  }

  if (response.success && response.data) {
    await saveUser(response.data);
  }

  return response;
};
