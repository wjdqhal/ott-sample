# 스포츠 페이지 운영

`/sports`는 MLB Stats API에서 실제 경기 일정과 점수를 30초마다 가져옵니다. 진행 중인 경기를 우선 표시하고, 예정·종료 경기를 함께 최대 12개 보여줍니다. 일주일 전부터 일주일 뒤까지 5경기가 없으면 최근 370일로 조회 범위를 넓힙니다. 종료 경기를 LIVE로 표시하거나 실제 중계가 없는 영상을 대신 재생하지 않습니다. API 장애 시 마지막 데이터와 오류를 표시합니다.

## 네트워크와 공식 영상

- 브라우저와 검증 환경에서 `statsapi.mlb.com` HTTPS 접근이 필요합니다.
- 공식 경기 페이지는 `www.mlb.com`입니다. 페이지 내 영상 재생을 사용한다면 `www.youtube-nocookie.com` 및 YouTube가 요구하는 미디어 도메인 접근도 필요합니다.
- 공식 제공자로부터 임베드 권한을 얻은 YouTube 생중계 ID를 경기 ID별로 지정합니다. 실제 영상 ID를 넣은 아래 형식의 `VITE_BASEBALL_STREAMS`를 런타임 환경 변수 또는 무시되는 `.env.local`에 저장하고 Vite를 재시작하세요. 프로덕션은 다시 빌드해야 합니다. 비밀 키나 인증된 개인 재생 URL을 이 변수에 넣지 마세요.

```text
VITE_BASEBALL_STREAMS={"실제MLB경기ID":"11자리영상ID"}
```

영상 ID가 없거나 형식이 올바르지 않으면 공식 MLB 경기 링크를 제공합니다. 실제 중계 URL은 운영자가 공급해야 합니다. iframe 영상에는 지역·구독·임베드 제한이 적용될 수 있습니다.

## 경기별 실시간 채팅

기존 Firebase 프로젝트와 Google 로그인을 사용합니다. 메시지는 `sportsRooms/{gameId}/messages`에 저장하고 최신 100개를 실시간 구독합니다. 로그인 사용자는 300자까지 전송할 수 있습니다. 다른 경기로 이동하면 구독과 입력 상태를 정리합니다. 로그인하지 않은 사용자는 공개 메시지를 읽고 로그인 링크를 이용할 수 있습니다.

`sportsRooms/{gameId}/presence/{sessionId}`에 30초 간격으로 접속 정보를 갱신합니다. 90초 안에 활동한 로그인 사용자의 UID를 중복 제거해 집계하므로, 한 사용자가 여러 탭을 열어도 한 명으로 표시합니다. 비로그인 시청자는 집계하지 않습니다. 정상 종료 시 접속 문서를 삭제하며 비정상 종료 문서는 90초 뒤 집계에서 제외합니다. 장기 운영 시 presence 문서 정리 작업과 메시지 보존 정책이 필요합니다.

아래 규칙을 **기존 Firestore 규칙의 `match /databases/{database}/documents` 내부에 병합**하고 Firebase 콘솔 또는 기존 배포 절차로 배포하세요. 기존의 광범위한 허용 규칙은 이 제한을 무효화할 수 있으므로 함께 검토해야 합니다. 저장소에는 기존 규칙/배포 설정이 없으며, 이 작업에서는 원격 규칙을 배포하지 않았습니다. Firestore 및 Firebase Auth가 활성화되어 있고 앱 도메인이 인증 허용 목록에 있어야 합니다.

```javascript
match /sportsRooms/{gameId}/messages/{messageId} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.keys().hasAll(['uid', 'name', 'text', 'createdAt'])
    && request.resource.data.keys().hasOnly(['uid', 'name', 'text', 'createdAt'])
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 40
    && request.resource.data.text is string
    && request.resource.data.text.size() > 0
    && request.resource.data.text.size() <= 300
    && request.resource.data.createdAt == request.time;
  allow update, delete: if false;
}
match /sportsRooms/{gameId}/presence/{sessionId} {
  allow read: if request.auth != null;
  function validPresence() {
    return request.auth != null
    && request.resource.data.keys().hasAll(['uid', 'lastSeen'])
    && request.resource.data.keys().hasOnly(['uid', 'lastSeen'])
    && request.resource.data.uid == request.auth.uid
    && request.resource.data.lastSeen == request.time;
  }
  allow create: if validPresence();
  allow update: if validPresence() && resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

공개 운영에는 추가로 App Check, 서버 측 전송 빈도 제한, 신고/차단 등 운영 정책을 마련하세요. 클라이언트의 전송 중 버튼 비활성화는 서버 측 도배 방지 기능을 대체하지 않습니다.

## 확인

`node --test src/sports/baseball.test.mjs`, `npm run build` 및 `npx eslint src/pages/Sports.jsx src/sports/*.js src/sports/*.jsx`를 실행합니다. 실제 API 연결 후 5개 이상 경기와 진행 상태를 확인하고, 공식 영상 ID를 지정한 경기의 재생을 확인하세요. Firestore 규칙 적용 후 서로 다른 로그인 계정의 브라우저 두 개로 같은 경기에서 메시지 전달·접속자 수를 확인하고, 다른 경기로 이동했을 때 대화방이 분리되는지 확인하세요. 네트워크/권한 차단 시 오류가 표시되는지도 확인하세요. 테스트용 경기 응답으로 확인한 UI 동작은 실제 중계·원격 채팅 검증과 구분합니다.
