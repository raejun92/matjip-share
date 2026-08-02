# 배포 (matjip-share)

> 배포 완료: 2026-08-02

## 프로덕션

- **앱**: https://matjip-share.vercel.app
- **호스팅**: Vercel (GitHub `raejun92/matjip-share` 연동, **master 푸시 시 자동 배포**)
- **DB**: Supabase 클라우드 `wmzrwfdnzwfmjefgjtuk` (리전 ap-southeast-1 싱가포르)
- **지도**: 카카오 개발자 앱 — Web 플랫폼 도메인에 `http://localhost:3000`, `https://matjip-share.vercel.app` 등록됨

## 환경변수 (Vercel에 설정됨)

| 이름 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라우드 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 키 (RLS로 보호되는 공개 키) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 지도 SDK (도메인 제한으로 보호) |
| `KAKAO_REST_API_KEY` | 장소 검색 (서버 전용 — NEXT_PUBLIC 금지) |

실제 값은 `.env.local`(커밋 안 됨)과 Vercel 대시보드에만 존재.

## 스키마 변경 배포

```bash
supabase migration new <이름>   # 마이그레이션 작성
bash scripts/db-reset.sh        # 로컬 적용 + 테스트
supabase db push                # 클라우드 적용 (link 되어 있어야 함)
```

⚠️ 마이그레이션 파일이 **비어 있지 않은지 확인** (`wc -c`) — 빈 파일도 조용히 "적용"된다.

## 비용 (전부 무료, 카드 미등록)

- Vercel Hobby / Supabase Free / 카카오 무료 쿼터 (지도 30만 로드/일, 검색 10만/일)
- 카카오 앱에 **비즈월렛을 연결하지 않는 것**이 과금 확률 0의 장치 — 연결 금지
