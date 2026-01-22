# 백엔드 API 스펙 - AI 챗봇

AI 챗봇 기능은 백엔드 서버를 통해 처리됩니다. 백엔드에서 OpenAI API를 호출하고 응답을 처리합니다.

## 엔드포인트

### POST /api/ai/chat

AI 챗봇과 대화하고 일정을 생성합니다.

#### 요청 헤더
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

#### 요청 본문
```json
{
  "message": "내일 오후 2시 회의 일정 추가해줘",
  "conversationHistory": [
    {
      "role": "user",
      "content": "안녕"
    },
    {
      "role": "assistant",
      "content": "안녕하세요! 일정을 도와드리는 AI 어시스턴트입니다."
    }
  ]
}
```

- `message` (필수): 사용자의 현재 메시지
- `conversationHistory` (선택): 이전 대화 히스토리 (최대 5-10개 권장)

#### 성공 응답 (200)
```json
{
  "success": true,
  "data": {
    "message": "네, 내일 오후 2시 회의 일정을 추가해드리겠습니다.",
    "events": [
      {
        "title": "회의",
        "date": "2024-01-15",
        "description": "오후 2시 회의"
      }
    ]
  }
}
```

- `message`: AI의 응답 메시지
- `events`: 파싱된 일정 목록 (없을 수 있음)

#### 에러 응답 (400/401/500)
```json
{
  "success": false,
  "error": "오류 메시지"
}
```

## 백엔드 구현 가이드

### 1. OpenAI API 호출

백엔드에서 OpenAI API를 호출해야 합니다:

```javascript
// Node.js 예시
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini', // 또는 'gpt-3.5-turbo'
    messages: [
      {
        role: 'system',
        content: '당신은 캘린더 일정 관리 AI 어시스턴트입니다. 사용자의 요청에 따라 일정을 생성하고 JSON 형식으로 반환해야 합니다.\n\n응답 형식:\n1. 사용자에게 친절하게 응답하고\n2. 일정 정보를 JSON 형식으로 포함합니다\n\nJSON 형식 예시:\n```json\n{\n  "events": [\n    {\n      "title": "회의",\n      "date": "2024-01-15",\n      "description": "팀 회의"\n    }\n  ]\n}\n```\n\n주의사항:\n- 날짜는 YYYY-MM-DD 형식으로 반환\n- 날짜가 명시되지 않으면 오늘 날짜 기준으로 추론\n- "내일", "모레", "다음 주 월요일" 등 상대적 표현을 절대 날짜로 변환\n- 여러 일정이 있으면 모두 배열에 포함'
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
});
```

### 2. 응답 파싱

OpenAI 응답에서 일정 정보를 추출해야 합니다:

```javascript
const data = await response.json();
const aiMessage = data.choices[0]?.message?.content || '';

// JSON 블록에서 일정 정보 추출
const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/);
let events = [];

if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[1]);
  if (Array.isArray(parsed)) {
    events = parsed;
  } else if (parsed.events && Array.isArray(parsed.events)) {
    events = parsed.events;
  }
}
```

### 3. 날짜 정규화

상대적 날짜 표현("내일", "모레" 등)을 절대 날짜(YYYY-MM-DD)로 변환해야 합니다.

### 4. 응답 반환

파싱된 일정 정보와 AI 메시지를 함께 반환합니다:

```javascript
return {
  success: true,
  data: {
    message: aiMessage,
    events: events
  }
};
```

## 환경 변수

백엔드 서버에 다음 환경 변수를 설정해야 합니다:

```env
OPENAI_API_KEY=sk-...
```

## 보안 고려사항

1. **API 키 보안**: OpenAI API 키는 절대 클라이언트에 노출되어서는 안 됩니다. 백엔드에서만 사용하세요.
2. **인증**: 모든 요청은 인증 토큰을 검증해야 합니다.
3. **Rate Limiting**: OpenAI API 호출에 대한 Rate Limiting을 구현하는 것을 권장합니다.
4. **에러 처리**: OpenAI API 오류를 적절히 처리하고 사용자에게 친화적인 에러 메시지를 반환하세요.
