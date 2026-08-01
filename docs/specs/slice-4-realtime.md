# 슬라이스 4: 실시간 공유

> 상태: 구현 완료 (단위·통합 44 + E2E 6 통과, 두 브라우저 실시간 확인)
> PRD 근거: §6.5 실시간 공유

## 목표

친구가 맛집 핀을 추가하면 **새로고침 없이** 내 지도에 그 친구 색상 핀이 나타난다.
(수정/삭제의 실시간 반영은 슬라이스 5에서 함께 다룬다.)

## 사용자 스토리

- 나는 지도를 보고 있는 동안 친구가 추가한 맛집이 바로 나타나는 걸 본다.

## 동작 규칙

1. **구독**: Supabase Realtime(postgres_changes)으로 `places` INSERT 이벤트 구독.
2. **작성자 정보**: 이벤트 페이로드에는 작성자 join이 없으므로, 이벤트 수신 시 해당 핀을 id로 재조회(작성자 포함)해서 지도에 추가.
3. **중복 방지**: 내가 직접 저장한 핀은 로컬에 즉시 추가되고 잠시 후 실시간 이벤트로도 도착한다 → **id 기준 dedupe** (같은 id면 교체, 없으면 추가).
4. **정리**: 화면 이탈 시 구독 해제.

## 인수 기준 (Acceptance Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| AC1 | id 기준 upsert: 같은 id는 교체, 새 id는 추가 (순서 유지) | 단위 (TDD) |
| AC2 | places INSERT 시 구독자에게 이벤트가 도착한다 | 통합 (로컬 Supabase Realtime) |
| AC3 | 브라우저 A가 핀을 추가하면 브라우저 B 지도에 새로고침 없이 핀이 나타난다 | E2E (컨텍스트 2개) |

## 기술 메모

- `places`를 `supabase_realtime` publication에 추가하는 마이그레이션 필요.
- postgres_changes는 구독자 RLS를 따름 → anon select 정책 있으므로 수신 가능.

## 범위 제외

- UPDATE/DELETE 이벤트 반영 (슬라이스 5)
- 연결 끊김 후 재동기화(refetch) 전략 — MVP에선 새로고침으로 충분

## plan (구현 순서)

1. 마이그레이션: publication에 places 추가
2. `src/lib/place-list.ts` — upsertPlace (id dedupe) ← **TDD**
3. `src/lib/places.ts` — getPlaceById 추가
4. `src/lib/realtime.ts` — 구독/해제 (경계)
5. 통합 테스트: INSERT 이벤트 수신
6. MapView: 구독 연결
7. E2E: 두 브라우저 컨텍스트 실시간 확인 + `/verify`
