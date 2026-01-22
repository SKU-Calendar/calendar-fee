# API 서버 연결 설정 가이드

API 요청 실패 문제를 해결하기 위한 설정 가이드입니다.

---

## ⚠️ 403이 계속 나올 때 – 지금 할 수 있는 것

### 1) 당장 403·에러 로그 없이 만들고 싶을 때 (프론트만 개발)

`src/api/config.ts` 에서 아래처럼 바꾸고 앱을 다시 실행하세요.

```ts
export const USE_MOCK_API = true;   // false → true
```

- **동작**: 백엔드를 거의 안 부르고, 캘린더·그룹·타이머·로그인을 **목업 데이터**로 동작시킵니다.
- **로그인**: `test@example.com` / `password123` (목업용). 회원가입도 목업으로 됩니다.
- **한계**: DB에 실제로 저장되지 않고, 앱을 껐다 켜면 목업 데이터는 초기 상태로 돌아갑니다.

백엔드가 403을 고친 뒤에는 다시 `USE_MOCK_API = false` 로 돌려서 연동하면 됩니다.

---

### 2) 403을 근본적으로 해결하려면 (백엔드 수정)

403은 **서버가 해당 요청을 거부**해서 발생합니다. 아래를 **백엔드에서** 확인해야 합니다.

| 확인할 것 | 설명 |
|-----------|------|
| **POST 라우트 인증** | `POST /api/timer/start`, `pause`, `stop`, `POST /api/group`, `POST /api/group/:id/invite` 가 GET와 **같은 인증(예: JWT)**을 쓰는지, POST만 막는 미들웨어가 있는지 |
| **Authorization 헤더** | 클라이언트가 `Authorization: Bearer {액세스토큰}` 을 보내고 있는데, POST에서 이걸 읽어서 검사하는지 |
| **라우트 등록** | 위 POST 경로가 백엔드 앱에 **실제로 등록**되어 있는지 (404가 아니라 403이면, 보통 라우트는 있고 인증/권한에서 막는 경우가 많음) |
| **CORS** | `OPTIONS` (preflight)는 200인데, 그 다음 **POST만 403**인지. 그렇다면 CORS보다는 서버 쪽 인증/권한 로직을 먼저 볼 것 |

**백엔드 담당자에게 전달할 수 있는 문구 예시:**

> GET /api/calendar, /api/group, /api/timer/stats 는 200 OK 인데,  
> POST /api/timer/start, /api/timer/stop, /api/group, /api/group/:id/invite 는 403 (body 비어 있음) 이에요.  
> POST 쪽에도 GET와 동일하게 JWT 인증만 적용하고, 403을 내보내는 별도 체크가 있는지 확인해주세요.

---

## 문제 원인

React Native/Expo 앱에서 `localhost`는 실행 환경에 따라 다르게 동작합니다:
- **iOS 시뮬레이터**: `localhost` 사용 가능
- **Android 에뮬레이터**: `10.0.2.2` 사용 필요
- **실제 기기**: 컴퓨터의 IP 주소 사용 필요

## 해결 방법

### 1. 컴퓨터의 IP 주소 확인

터미널에서 다음 명령어를 실행하세요:

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

일반적으로 `192.168.x.x` 형태의 주소를 찾으면 됩니다.

### 2. API 주소 설정

`src/api/config.ts` 파일을 열어서 IP 주소를 설정하세요:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api' // 여기에 본인의 IP 주소 입력
  : 'https://your-api-domain.com/api';
```

**예시:**
- IP 주소가 `192.168.0.5`이고 백엔드 서버가 3000번 포트를 사용한다면:
  ```
  http://192.168.0.5:3000/api
  ```

### 3. 백엔드 서버가 실행 중인지 확인

백엔드 서버가 실행 중이어야 합니다:
```bash
# 백엔드 서버 실행 (예시)
npm start
# 또는
node server.js
```

### 4. 방화벽 설정 확인

컴퓨터의 방화벽이 3000번 포트를 차단하지 않는지 확인하세요.

### 5. 네트워크 확인

- 컴퓨터와 기기가 같은 Wi-Fi 네트워크에 연결되어 있어야 합니다
- VPN을 사용 중이라면 끄고 시도해보세요

## 환경별 설정 예시

### iOS 시뮬레이터
```typescript
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-api-domain.com/api';
```

### Android 에뮬레이터
```typescript
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000/api'
  : 'https://your-api-domain.com/api';
```

### 실제 기기 (iPhone/Android)
```typescript
export const API_BASE_URL = __DEV__
  ? 'http://192.168.0.5:3000/api' // 컴퓨터의 IP 주소
  : 'https://your-api-domain.com/api';
```

## 설정 변경 후

1. 앱을 완전히 종료
2. Expo 개발 서버 재시작:
   ```bash
   npm start
   ```
3. 앱 다시 실행

## 403 Forbidden – GET는 되고 POST만 실패할 때

**증상**: `GET /api/calendar`, `GET /api/group`, `GET /api/timer/stats` 등은 200인데,  
`POST /api/group`, `POST /api/group/:id/invite`, `POST /api/timer/start`, `POST /api/timer/stop` 등에서 403 (본문 비어 있음)이 뜨는 경우.

**가능한 원인 (백엔드 점검)**  
- POST 라우트에만 적용된 권한/미들웨어가 JWT를 다르게 검사하거나 거부하는지  
- `Content-Type: application/json` + `Authorization: Bearer {token}` 이 POST에서도 그대로 전달되는지  
- CORS preflight(`OPTIONS`) 후 실제 POST가 403이 되는지 (preflight는 통과, POST만 403인지)

**프론트 동작**: 403이면 목업으로 fallback 해서 화면은 동작합니다. 백엔드에서 해당 POST를 200으로 만들면 실제 API가 사용됩니다.

## 문제가 계속되면

1. 백엔드 서버가 정상적으로 실행 중인지 확인
2. 브라우저에서 `http://[IP주소]:3000/api/health` (또는 유사한 엔드포인트) 접속 테스트
3. 터미널에서 백엔드 서버 로그 확인
