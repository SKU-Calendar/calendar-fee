/**
 * AsyncStorage를 사용한 토큰 저장/관리 유틸리티
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@calendar_app:access_token';
const REFRESH_TOKEN_KEY = '@calendar_app:refresh_token';
const USER_KEY = '@calendar_app:user';

/**
 * 액세스 토큰 저장
 */
export const saveToken = async (token: string | null | undefined): Promise<void> => {
  try {
    if (!token) {
      // null이나 undefined면 삭제
      await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('토큰 저장 실패:', error);
    throw error;
  }
};

/**
 * 액세스 토큰 조회
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('토큰 조회 실패:', error);
    return null;
  }
};

/**
 * 리프레시 토큰 저장
 */
export const saveRefreshToken = async (token: string | null | undefined): Promise<void> => {
  try {
    if (!token) {
      // null이나 undefined면 삭제
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('리프레시 토큰 저장 실패:', error);
    throw error;
  }
};

/**
 * 리프레시 토큰 조회
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('리프레시 토큰 조회 실패:', error);
    return null;
  }
};

/**
 * 사용자 정보 저장
 */
export const saveUser = async (user: any): Promise<void> => {
  try {
    if (!user) {
      // null이나 undefined면 삭제
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('사용자 정보 저장 실패:', error);
    throw error;
  }
};

/**
 * 사용자 정보 조회
 */
export const getUser = async (): Promise<any | null> => {
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return null;
  }
};

/**
 * 모든 인증 정보 삭제 (로그아웃 시 사용)
 */
export const clearAuth = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error('인증 정보 삭제 실패:', error);
    throw error;
  }
};
