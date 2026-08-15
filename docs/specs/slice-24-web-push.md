# 슬라이스 24: Web Push 알림

> 상태: 구현 완료 (E2E 37 통과, 실 Chrome에서 구독→발송→수신 전체 확인)
> 배경: 사용자 요청 — "핀이 추가될 때 알림". 앱이 꺼져 있어도 도착하는 푸시.

## 아키텍처 (Edge Function 없이 기존 인프라 재사용)

```
[구독]  배지 메뉴 "🔔 알림 켜기" → SW 등록 + 브라우저 권한
        → 푸시 구독권(endpoint+키)을 push_subscriptions에 저장
[발송]  핀 저장 성공 직후 클라이언트가 POST /api/notify-new-place {placeId}
        → Vercel 서버가 DB에서 핀 검증(실존+2분 이내) 후
        → 작성자 제외 구독자 전원에게 web-push 발송 (VAPID 서명)
        → 죽은 구독(404/410)은 자동 정리
[수신]  public/sw.js: push → 알림 표시, 클릭 → 앱 포커스/열기
```

- SW는 **푸시 전용** — fetch 핸들러 없음 → 오프라인 캐시 부작용 원천 차단.
- iOS는 홈 화면 설치 PWA에서만 동작 (기존 PWA로 충족).
- 비용 0원: FCM/APNs 무료, VAPID 자체 생성, Vercel 함수 무료 한도 내.

## 동작 규칙

1. 배지 메뉴에 "🔔 알림 켜기/끄기" 토글. 권한 거부 시 안내.
2. 발송 대상: **작성자 본인 제외** 전 구독자. 내용: "{이름}님이 {가게} 추가 ★{별점}".
3. 알림 탭 → 앱 열기(이미 열려 있으면 포커스).
4. 남용 방어: notify API는 placeId만 받고 내용은 DB에서 재구성, 2분 지난 핀은 거부.

## 인수 기준

| # | 기준 | 검증 방법 |
|---|------|----------|
| AC1 | notify API: 없는 핀 404, 오래된 핀 거부, 구독 0명이면 sent 0 | E2E (request) |
| AC2 | 알림 켜기 → 구독 저장, 끄기 → 제거 | 수동 (헤드 브라우저, FCM 실구독) |
| AC3 | 핀 추가 → 다른 구독자에게 FCM 발송 성공(2xx) | 수동 |
| AC4 | 실기기 수신 | 사용자 폰 (배포 후) |

## 환경변수 (Vercel에 2개 추가 필요)

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`

## plan

1. 마이그레이션: push_subscriptions
2. public/sw.js (푸시 전용)
3. lib/push.ts: 구독/해지/상태
4. BadgeMenu 토글 + handleAdded에서 notify 호출
5. /api/notify-new-place
6. E2E(API 계약) + 수동 검증 + 배포 + Vercel env 안내
