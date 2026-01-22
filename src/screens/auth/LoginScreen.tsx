import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';
import { login } from '@/api/auth';
import { THEME } from '@/utils/colors';

// RootNavigator에서 넘겨주는 onLogin 함수를 위한 타입을 추가합니다.
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onLogin: () => void;
};

const LoginScreen: React.FC<Props> = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. 입력 유효성 검사
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 2. 백엔드 API 호출
      const response = await login({ email, password });

      if (response.success) {
        // 로그인 성공 - RootNavigator의 onLogin 호출하여 화면 전환
        onLogin();
      } else {
        // 로그인 실패 - 에러 메시지 표시
        Alert.alert('로그인 실패', response.error || '이메일 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>캘린더 앱</Text>
      
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>로그인</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.linkText}>아직 회원이 아니신가요? 회원가입</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: THEME.background,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 48,
    textAlign: 'center',
    color: THEME.text,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: THEME.backgroundWhite,
    fontSize: 15,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  button: {
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkText: {
    color: THEME.primary,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default LoginScreen;