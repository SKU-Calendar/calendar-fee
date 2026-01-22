# CORS 설정 가이드 (백엔드 개발자용)

## 1. 프론트엔드 포트 · Origin

### 프론트 포트 (Expo 기본값)

| 환경 | 주소 예시 |
|------|-----------|
| **Metro(개발 서버)** | `http://localhost:8081` |
| **같은 네트워크 기기** | `http://192.168.x.x:8081` (예: `http://192.168.0.47:8081`) |
| **Expo Web (브라우저)** | `http://localhost:8081` 또는 `http://localhost:19006` |

- `npm start` / `expo start` → 기본 포트 **8081**
- `expo start --web` → 8081 또는 19006

### 백엔드에서 CORS로 허용할 Origin (개발용)

아래 중 **하나**만 적용해도 됩니다.

**가장 쉬운 방법 (개발 시):**
```
origin: '*'   // 모든 Origin 허용 (개발용)
```

**특정 도메인만 쓰고 싶을 때:**
```
http://localhost:8081
http://localhost:19006
http://127.0.0.1:8081
http://127.0.0.1:19006
http://192.168.0.0/16       // 같은 공유기 (192.168.x.x 전체, 정규식 등으로 처리)
```

**Expo Go (iOS/Android) 사용 시:**
- 앱에서 나가는 요청은 브라우저가 아니라서 `Origin`이 **없거나 `null`**일 수 있음  
- CORS에서 **`origin`이 없을 때 / `null`일 때도 허용**해 두는 게 좋음  
- `origin: '*'` 이면 이런 경우도 통과

### 프로덕션 (나중에 웹/앱 배포할 때)
- 배포한 도메인·스킴을 나중에 CORS `origin`에 추가하면 됩니다.

## 2. 백엔드에서 이렇게 허용하면 CORS 오류 안 남

### ⭐ 추천: 개발 시 `origin: '*'`

```javascript
const cors = require('cors');

app.use(cors({
  origin: '*',                                    // 개발: 모두 허용
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
}));
```

- **프론트 포트**: `8081` (Expo 기본) / Web: `8081` 또는 `19006`
- **Expo Go (폰)** 는 `Origin` 이 없거나 `null` 이라서, `*` 또는 `origin` 없음/`null` 허용이 필요함  
- `origin: '*'` 와 `credentials: true` 를 같이 쓰면 브라우저에서 제한이 있을 수 있음. 문제 생기면 개발용은 `credentials: false` 로 시도

### 옵션 1: localhost 전체 허용
```javascript
// localhost의 모든 포트 허용
const allowedOrigins = /^http:\/\/localhost:\d+$/;
```


## 현재 문제

현재 백엔드에서 403 Forbidden 에러가 발생하고 있습니다:
- **에러 발생 엔드포인트**: `/api/auth/login`, `/api/auth/profile`
- **응답 본문**: 비어있음 (content-length: 0)
- **원인 추정**: CORS 설정 또는 인증 미들웨어 문제

## 권장 CORS 설정 (Express.js 예시)

### 방법 1: 개발 환경에서 모든 Origin 허용 (가장 간단)
```javascript
const cors = require('cors');

// 개발 환경에서는 모든 Origin 허용
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));
} else {
  // 프로덕션에서는 특정 도메인만 허용
  app.use(cors({
    origin: ['https://your-production-domain.com'],
    credentials: true,
  }));
}
```

### 방법 2: localhost 정규식으로 허용
```javascript
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // React Native 앱의 경우 origin이 없을 수 있음
    if (!origin) {
      return callback(null, true);
    }
    
    // localhost의 모든 포트 허용
    if (origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') ||
        process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(cors(corsOptions));
```

## 추가 확인 사항

1. **인증 미들웨어**: `/api/auth/login`과 `/api/auth/signup` 엔드포인트는 인증 미들웨어를 거치지 않아야 합니다.

2. **OPTIONS 요청**: CORS preflight 요청을 처리해야 합니다:
```javascript
app.options('*', cors(corsOptions));
```

3. **프로필 API**: `/api/auth/profile`은 인증이 필요한 엔드포인트이므로, 토큰이 유효한 경우에만 접근을 허용해야 합니다.

## 문의

프로덕션 배포 후 추가 주소를 알려드리겠습니다.
