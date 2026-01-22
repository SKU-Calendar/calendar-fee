import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';
import { signup } from '@/api/auth';
import { THEME } from '@/utils/colors';

// 네비게이션 프롭스 타입 정의
type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // 1. 입력 유효성 검사
    if (!name || !email || !password || !passwordConfirm) {
      Alert.alert('알림', '모든 정보를 입력해주세요.');
      return;
    }

    // 2. 비밀번호 일치 확인
    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    // 3. 비밀번호 길이 검사 (선택사항)
    if (password.length < 6) {
      Alert.alert('오류', '비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      // 4. 백엔드 API 호출
      const response = await signup({ email, password, name });

      if (response.success) {
        Alert.alert(
          '성공',
          '회원가입이 완료되었습니다!',
          [{ text: '확인', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('회원가입 실패', response.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      
      <TextInput
        style={styles.input}
        placeholder="이름"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      
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
      
      <TextInput
        style={styles.input}
        placeholder="비밀번호 확인"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>회원가입 완료</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>이미 계정이 있으신가요? 로그인</Text>
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
    marginBottom: 40,
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

export default SignupScreen;