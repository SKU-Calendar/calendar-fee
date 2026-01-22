# 캘린더 앱 (React Native + Expo)

일정 조회, 생성, 삭제 기능과 로그인/회원가입이 있는 리액트 네이티브 캘린더 앱입니다.

## 주요 기능

- 🔐 **인증**: 로그인, 회원가입
- 📅 **캘린더**: 일정 조회, 생성, 삭제
- 💾 **토큰 관리**: AsyncStorage를 사용한 자동 로그인

## 시작하기

### 1. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 2. 환경 변수 설정 (선택사항)

`.env` 파일을 생성하고 API 서버 주소를 설정합니다:

```bash
cp .env.example .env
```

`.env` 파일을 열어서 백엔드 API 서버 주소를 입력하세요:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

또는 `src/api/config.ts` 파일에서 직접 수정할 수 있습니다.

### 3. 앱 실행

```bash
npm start
# 또는
yarn start
```

그 다음 `i` (iOS), `a` (Android), 또는 `w` (Web)를 눌러 실행합니다.

## 프로젝트 구조

```
Calendar/
├── src/
│   ├── api/              # API 관련 파일
│   │   ├── config.ts     # API 설정 (base URL 등)
│   │   ├── client.ts     # HTTP 클라이언트
│   │   ├── auth.ts       # 인증 API (로그인, 회원가입)
│   │   └── events.ts     # 일정 API (조회, 생성, 삭제)
│   ├── screens/          # 화면 컴포넌트
│   │   ├── auth/         # 로그인, 회원가입
│   │   ├── calendar/     # 캘린더 화면
│   │   └── settings/     # 설정 화면
│   ├── navigation/       # 네비게이션 설정
│   └── utils/            # 유틸리티
│       └── storage.ts    # 토큰 저장/관리
├── App.tsx               # 앱 진입점
└── package.json
```

## 백엔드 API 연동

### API 엔드포인트

앱은 다음 API 엔드포인트를 사용합니다:

#### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 새로고침

#### 일정
- `GET /api/events?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - 일정 목록 조회
- `POST /api/events` - 일정 생성
- `DELETE /api/events/:id` - 일정 삭제
- `PUT /api/events/:id` - 일정 수정

### 요청/응답 형식

#### 로그인 요청
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 로그인 응답
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com"
    },
    "accessToken": "jwt-token-here",
    "refreshToken": "refresh-token-here"
  }
}
```

#### 일정 생성 요청
```json
POST /api/events
Authorization: Bearer {accessToken}
{
  "title": "회의",
  "date": "2024-01-15",
  "description": "팀 회의"
}
```

#### 일정 생성 응답
```json
{
  "success": true,
  "data": {
    "id": "event-id",
    "title": "회의",
    "date": "2024-01-15",
    "description": "팀 회의",
    "createdAt": "2024-01-10T10:00:00Z"
  }
}
```

### 인증 토큰

- 로그인 성공 시 받은 `accessToken`은 모든 인증이 필요한 API 요청에 `Authorization: Bearer {token}` 헤더로 포함됩니다.
- 토큰은 AsyncStorage에 저장되어 앱을 재시작해도 유지됩니다.
- 401 에러 발생 시 자동으로 로그아웃 처리됩니다.

## 개발 팁

### API 서버 주소 변경

1. `.env` 파일에서 `EXPO_PUBLIC_API_URL` 수정
2. 또는 `src/api/config.ts`에서 직접 수정

### 로컬 개발 서버 사용 시

iOS 시뮬레이터: `http://localhost:3000/api`  
Android 에뮬레이터: `http://10.0.2.2:3000/api`  
실제 기기: `http://{컴퓨터IP주소}:3000/api`

## 기술 스택

- **React Native** - 모바일 앱 프레임워크
- **Expo** - 개발 도구 및 빌드 시스템
- **React Navigation** - 네비게이션
- **AsyncStorage** - 로컬 저장소
- **dayjs** - 날짜 처리
- **TypeScript** - 타입 안정성

## 라이선스

MIT
