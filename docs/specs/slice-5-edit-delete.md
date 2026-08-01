# 슬라이스 5: 핀 수정/삭제

> 상태: 구현 완료 (단위·통합 52 + E2E 10 통과, 수동 검증 완료)
> PRD 근거: §6.6 편집 권한 ("본인이 찍은 핀만 수정/삭제 가능, 강제는 UI 레벨")

## 목표

내가 찍은 핀의 **별점을 수정**하거나 핀을 **삭제**할 수 있다.
삭제/수정은 친구들 화면에도 **실시간 반영**된다.

## 사용자 스토리

- 나는 내 핀의 정보 카드에서 별점을 고칠 수 있다.
- 나는 내 핀을 삭제할 수 있다 (실수 방지를 위해 한 번 더 확인).
- 친구 핀의 카드에는 수정/삭제 버튼이 보이지 않는다.
- 친구가 핀을 삭제하면 내 지도에서도 바로 사라진다.

## 동작 규칙

1. **권한(UI 레벨)**: 정보 카드에서 `place.userId === 내 id`일 때만 수정/삭제 버튼 표시.
   DB는 로그인이 없어 소유자 강제 불가 → anon에 update/delete 허용 (PRD 트레이드오프).
2. **수정 범위**: 별점만. (가게명/좌표는 카카오 검색에서 온 값이라 수정 대상 아님)
3. **삭제 확인**: 브라우저 confirm 대신 카드 안 인라인 확인 ("정말 삭제할까요?").
4. **실시간**: UPDATE·DELETE 이벤트 구독 추가. UPDATE는 재조회 후 upsert,
   DELETE는 페이로드의 id로 목록에서 제거.
5. **낙관적이지 않게**: 서버 성공 후 로컬 상태 반영 (MVP 단순성 우선).

## 인수 기준 (Acceptance Criteria)

| # | 기준 | 검증 방법 |
|---|------|----------|
| AC1 | removePlace: id로 목록에서 제거, 없으면 그대로 (불변) | 단위 (TDD) |
| AC2 | updatePlaceRating / deletePlace가 DB에 반영된다 | 통합 (로컬 Supabase) |
| AC3 | UPDATE·DELETE 이벤트가 구독자에게 전달된다 | 통합 (로컬 Supabase Realtime) |
| AC4 | 내 핀 카드에만 수정/삭제 버튼이 보인다 | E2E |
| AC5 | 별점 수정 → 카드·핀에 반영 | E2E |
| AC6 | 삭제 → 내 지도 + 친구 지도(실시간)에서 핀 제거 | E2E |

## 데이터 모델 (마이그레이션)

```sql
-- anon에 update/delete 개방 (UI 레벨 권한, PRD §6.6 트레이드오프)
grant update, delete on public.places to anon, authenticated;
create policy "anon can update places" on public.places for update to anon using (true) with check (true);
create policy "anon can delete places" on public.places for delete to anon using (true);
```

## 범위 제외

- 소유자 DB 강제 (로그인 없이는 불가)
- 가게명/위치 수정, 핀 이동
- 삭제 취소(undo)

## plan (구현 순서)

1. 마이그레이션: update/delete grant + 정책
2. `place-list.ts` — removePlace ← **TDD**
3. `places.ts` — updatePlaceRating, deletePlace ← 통합
4. `realtime.ts` — onUpdate/onDelete 확장 ← 통합
5. MapView/정보 카드: 내 핀이면 수정(별점)/삭제(인라인 확인) UI
6. E2E (AC4~6) + `/verify`
