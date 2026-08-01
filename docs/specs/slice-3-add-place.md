# 슬라이스 3: 맛집 핀 추가

> 상태: 구현 완료 (단위·통합 39 + E2E 5 통과, 실지도 핀 저장·색 구분 확인)
> PRD 근거: §6.3 맛집 핀, §6.4 맛집 추가, §7 화면 2·3, §9 데이터 모델

## 목표

지도에서 **맛집을 검색해 별점과 함께 저장**하면, **내 색상 핀**으로 지도에 표시된다.
저장된 모든 친구의 핀이 지도에 보이고, 핀을 누르면 가게명·별점·작성자가 보인다.
(실시간 반영은 슬라이스 4 — 이 슬라이스에선 접속/저장 시점 기준으로만 그려진다.)

## 사용자 스토리

- 나는 가게 이름으로 검색해서 맛집을 고를 수 있다.
- 나는 별점(1~5)을 주고 저장할 수 있다.
- 저장하면 지도에 내 색상 핀이 바로 생긴다.
- 나는 친구들이 저장한 핀도 각자의 색으로 볼 수 있다.
- 핀을 누르면 가게명·별점·누가 저장했는지 보인다.

## 동작 규칙

1. **검색**: 지도 화면의 "맛집 추가" 버튼 → 검색창. 카카오 로컬 키워드 검색 사용.
   REST 키 보호를 위해 **Next.js API 라우트(`/api/search-places`)를 경유** (브라우저에 키 노출 금지).
2. **선택 → 별점**: 검색 결과에서 가게 선택 → 별점 1~5 필수 → 저장.
3. **저장**: `places`에 (user_id, name, address, lat, lng, rating) 저장. 저장 즉시 지도에 핀 표시 + 해당 위치로 지도 이동.
4. **핀 렌더링**: 접속 시 모든 places 로드. 핀 색 = 작성자 색. 핀 클릭 → 가게명·별점(★)·작성자 이름 표시.
5. **유효성**: 별점은 1~5 정수. 검색 결과 좌표(카카오는 문자열 x/y)는 숫자로 변환.
6. **중복**: 같은 가게를 여러 명이 저장 가능 (각자의 핀). 같은 사람이 같은 가게 중복 저장도 MVP에선 허용.

## 인수 기준 (Acceptance Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| AC1 | 별점은 1~5 정수만 유효하다 | 단위 (TDD) |
| AC2 | 카카오 검색 응답이 우리 Place 후보 형태로 변환된다 (좌표 문자열→숫자 등) | 단위 (TDD) |
| AC3 | 핀 저장 시 places에 작성자와 함께 저장된다 | 통합 (로컬 Supabase) |
| AC4 | 전체 핀 조회 시 작성자 이름·색상이 함께 온다 | 통합 (로컬 Supabase) |
| AC5 | 검색→선택→별점→저장→내 색 핀 표시 흐름이 동작한다 | E2E |
| AC6 | 핀 클릭 시 가게명·별점·작성자가 보인다 | E2E |

## 데이터 모델 (마이그레이션)

```sql
create table places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id),
  name       text not null,
  address    text not null default '',
  lat        double precision not null,
  lng        double precision not null,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
-- RLS: anon select/insert 허용 (users와 동일 패턴). update/delete 정책 없음.
```

## 범위 제외

- 실시간 반영 (슬라이스 4)
- 핀 수정/삭제 UI
- 지도 클릭으로 직접 핀 찍기 (검색 기반만)
- 사진, 한줄평 (PRD 확장 후보)

## plan (구현 순서)

1. `supabase/migrations/` — places 테이블
2. `src/lib/rating.ts` — 별점 검증 ← **TDD**
3. `src/lib/place-search.ts` — 카카오 응답 → Place 후보 변환 ← **TDD**
4. `src/app/api/search-places/route.ts` — 검색 프록시 (REST 키 서버 보관)
5. `src/lib/places.ts` — 저장/조회 (작성자 join) ← 통합 테스트
6. UI: 맛집 추가 시트(검색→선택→별점→저장) + 지도 색상 핀 + 핀 정보
7. E2E + `/verify`
