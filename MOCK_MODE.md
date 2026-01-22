# 모킹 모드 사용 가이드

백엔드 서버 없이 프론트엔드만 테스트하기 위한 모킹 모드 사용 방법입니다.

## 모킹 모드 활성화

`src/api/config.ts` 파일에서 `USE_MOCK_API`를 `true`로 설정하세요:

```typescript
export const USE_MOCK_API = true; // 백엔드 없이 테스트하려면 true
```

## 모킹 모드 동작

모킹 모드가 활성화되면:

- ✅ **인증 (로그인/회원가입)**: 로컬 메모리에 사용자 정보 저장
- ✅ **일정 관리**: AsyncStorage에 일정 데이터 저장
- ✅ **AI 챗봇**: 간단한 패턴 매칭으로 응답 (실제 OpenAI API 호출 안 함)

## 테스트 계정

모킹 모드에서는 다음 테스트 계정을 사용할 수 있습니다:

- **이메일**: `test@example.com`
- **비밀번호**: `password123`

또는 새로운 계정을 회원가입할 수 있습니다 (로컬 메모리에만 저장).

## 데이터 저장 위치

- **인증 정보**: AsyncStorage (`@calendar_app:access_token`, `@calendar_app:user` 등)
- **일정 데이터**: AsyncStorage (`@calendar_app:events`)
- **사용자 계정**: 메모리 (앱 재시작 시 초기화)

## 실제 백엔드 사용하기

실제 백엔드 서버를 사용하려면:

1. `src/api/config.ts`에서 `USE_MOCK_API`를 `false`로 변경
2. 백엔드 서버 실행
3. `API_BASE_URL`을 올바르게 설정

## 주의사항

- 모킹 모드에서는 사용자 계정이 메모리에만 저장되므로 앱을 재시작하면 초기화됩니다
- 일정 데이터는 AsyncStorage에 저장되므로 앱을 재시작해도 유지됩니다
- AI 챗봇은 간단한 패턴 매칭만 수행하므로 실제 OpenAI API처럼 정교하지 않습니다
