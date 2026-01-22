import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import CalendarScreen from '@/screens/calendar/CalendarScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import TimerScreen from '@/screens/timer/TimerScreen';
import GroupScreen from '@/screens/group/GroupScreen';
import FloatingChatButton from '@/components/FloatingChatButton';
import { getToken } from '@/utils/storage';
import { THEME } from '@/utils/colors';

// 1. 타입 정의
export type AuthStackParamList = {
  Login: { onLogin: () => void }; // 로그인 성공 콜백 전달을 위해 수정
  Signup: undefined;
};

export type AppTabParamList = {
  Calendar: undefined;
  Timer: undefined;
  Group: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// 2. 인증 스택 네비게이터 (onLogin 프롭스를 전달받음)
function AuthStackNavigator({ onLogin }: { onLogin: () => void }) {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" options={{ title: '로그인' }}>
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />
    </AuthStack.Navigator>
  );
}

// 3. 메인 앱 탭 네비게이터 (플로팅 챗봇 버튼 포함)
function AppTabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: THEME.primary,
          tabBarInactiveTintColor: THEME.textLight,
          tabBarStyle: {
            backgroundColor: THEME.backgroundWhite,
            borderTopWidth: 1,
            borderTopColor: THEME.borderLight,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: THEME.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: '캘린더' }} />
        <Tab.Screen name="Timer" component={TimerScreen} options={{ title: '타이머' }} />
        <Tab.Screen name="Group" component={GroupScreen} options={{ title: '그룹' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '프로필' }} />
      </Tab.Navigator>
      <FloatingChatButton />
    </View>
  );
}

// 4. 최상위 네비게이터
const RootNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 토큰 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 주기적으로 인증 상태 확인 (로그아웃 감지)
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await getToken();
      setIsLoggedIn(!!token);
    }, 1000); // 1초마다 확인

    return () => clearInterval(interval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getToken();
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // 로딩 중일 때는 아무것도 표시하지 않음 (또는 스플래시 화면 표시)
  if (isLoading) {
    return null; // 또는 <LoadingScreen />
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        // 로그인 성공 시 App(탭 네비게이터) 표시
        <RootStack.Screen name="App" component={AppTabNavigator} />
      ) : (
        // 로그인 전에는 Auth(인증 네비게이터) 표시 및 로그인 함수 전달
        <RootStack.Screen name="Auth">
          {() => <AuthStackNavigator onLogin={handleLogin} />}
        </RootStack.Screen>
      )}
    </RootStack.Navigator>
  );
};

export default RootNavigator;