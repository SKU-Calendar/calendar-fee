/**
 * API 클라이언트
 * 백엔드와 통신하는 기본 HTTP 클라이언트
 */
import { API_BASE_URL, USE_MOCK_API } from './config';
import { getToken, clearAuth } from '@/utils/storage';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

/**
 * API 요청 옵션
 */
type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
  _retried?: boolean; // 401/403 후 refresh 재시도 여부 (내부용)
};

/**
 * API 요청 함수
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const {
    method = 'GET',
    headers = {},
    body,
    requiresAuth = true,
    _retried = false,
  } = options;

  try {
    // 모킹 모드일 때는 실제 API 호출하지 않음 (각 API 함수에서 처리)
    if (USE_MOCK_API) {
      // 모킹 모드에서는 여기서는 처리하지 않고 각 API 함수(mock.ts)에서 처리
      // 실제 API 호출은 하지 않지만 타입 호환성을 위해 빈 응답 반환
      return {
        success: false,
        error: '모킹 모드: API 클라이언트를 직접 사용하지 마세요. 각 API 함수를 사용하세요.',
      };
    }

    // URL 구성
    const url = `${API_BASE_URL}${endpoint}`;

    // 헤더 설정
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // 인증이 필요한 경우에만 토큰 추가
    // requiresAuth가 false인 경우 (로그인, 회원가입 등)는 토큰을 전송하지 않음
    if (requiresAuth) {
      const token = await getToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // 디버깅: 회원가입/로그인 요청 로그
    if (endpoint.includes('/auth/signup') || endpoint.includes('/auth/login')) {
      console.log('API 요청:', {
        url,
        method,
        requiresAuth,
        hasAuthHeader: !!requestHeaders['Authorization'],
        headers: Object.keys(requestHeaders),
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    
    // 디버깅: 인증이 필요한 요청 로그
    if (requiresAuth) {
      console.log('인증 필요한 API 요청:', {
        url,
        method,
        hasAuthHeader: !!requestHeaders['Authorization'],
        authHeaderPrefix: requestHeaders['Authorization']?.substring(0, 20) + '...',
      });
    }

    // 요청 옵션
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // body가 있으면 JSON으로 변환
    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    // API 호출
    const response = await fetch(url, requestOptions);

    // 401 Unauthorized - 토큰 만료 시 refresh 후 1회 재시도 (/auth/refresh 제외)
    if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
      if (_retried) {
        await clearAuth();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      try {
        const { refreshToken } = await import('./auth');
        const r = await refreshToken();
        if (r.success) {
          return apiRequest<T>(endpoint, { ...options, _retried: true });
        }
      } catch (_) {}
      await clearAuth();
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    
    // 응답 본문 확인 (response.text()는 한 번만 호출 가능)
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    // 응답 본문 읽기
    const text = await response.text();
    let responseData: any = {};
    
    // 403 Forbidden - 로그인/회원가입 요청인 경우 특별 처리
    if (response.status === 403 && (endpoint.includes('/auth/login') || endpoint.includes('/auth/signup'))) {
      if (text && text.trim()) {
        try {
          responseData = JSON.parse(text);
        } catch (e) {
          // JSON 파싱 실패 시 텍스트 그대로 사용
        }
      }
      
      console.error('로그인/회원가입 403 에러:', {
        url,
        status: response.status,
        responseText: text,
        responseData,
        requestHeaders: Object.keys(requestHeaders),
      });
      
      // 백엔드에서 반환한 에러 메시지가 있으면 사용
      const errorMessage = responseData.message || responseData.error || 
        (text && text.trim() ? text : '서버에서 요청을 거부했습니다. 백엔드 설정을 확인해주세요.');
      
      return {
        success: false,
        error: errorMessage,
        data: responseData,
      };
    }
    
    if (text && text.trim()) {
      if (isJson) {
        try {
          responseData = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON 파싱 실패:', parseError, '응답 본문:', text);
          return {
            success: false,
            error: '서버 응답 형식이 올바르지 않습니다.',
          };
        }
      } else {
        // JSON이 아닌 경우 (예: HTML 에러 페이지)
        console.error('JSON이 아닌 응답:', text.substring(0, 200));
        return {
          success: false,
          error: `서버 오류 (${response.status}): ${text.substring(0, 100)}`,
        };
      }
    } else if (response.status >= 400 && response.status !== 403) {
      console.warn('응답 본문 비어있음:', { url, status: response.status });
    }

    // 에러 응답 처리
    if (!response.ok) {
      // 403 Forbidden - 토큰 만료 가능성으로 refresh 후 1회 재시도 (로그인/회원가입 제외)
      if (response.status === 403 && requiresAuth && !_retried &&
          !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
        try {
          const { refreshToken } = await import('./auth');
          const r = await refreshToken();
          if (r.success) {
            return apiRequest<T>(endpoint, { ...options, _retried: true });
          }
        } catch (_) {}
      }

      // 403 Forbidden 에러 처리
      if (response.status === 403) {
        console.warn('403:', url);

        // 백엔드에서 반환한 에러 메시지가 있으면 사용, 없으면 기본 메시지
        let errorMessage = '접근 권한이 없습니다.';
        
        if (text && text.trim()) {
          errorMessage = text.substring(0, 200);
        } else if (responseData && (responseData.message || responseData.error)) {
          errorMessage = responseData.message || responseData.error;
        } else {
          // CORS 또는 백엔드 설정 문제일 가능성
          errorMessage = '서버에서 요청을 거부했습니다. 백엔드 CORS 설정 또는 인증 설정을 확인해주세요.';
        }
        
        return {
          success: false,
          error: errorMessage,
          data: responseData,
        };
      }
      
      return {
        success: false,
        error: responseData.message || responseData.error || `요청에 실패했습니다. (${response.status})`,
        data: responseData,
      };
    }

    // 성공 응답
    return {
      success: true,
      data: responseData.data || responseData,
      message: responseData.message,
    };
  } catch (error: any) {
    console.error('API 요청 실패:', error);
    return {
      success: false,
      error: error.message || '네트워크 오류가 발생했습니다.',
    };
  }
};

/**
 * 편의 함수들
 */
export const api = {
  get: <T = any>(endpoint: string, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'GET', requiresAuth }),

  post: <T = any>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'POST', body, requiresAuth }),

  put: <T = any>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, requiresAuth }),

  delete: <T = any>(endpoint: string, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'DELETE', requiresAuth }),

  patch: <T = any>(endpoint: string, body?: any, requiresAuth = true) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, requiresAuth }),
};
