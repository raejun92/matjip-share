#!/usr/bin/env bash
# 로컬 Supabase 리셋.
# 마이그레이션(Realtime publication 등록 포함)은 reset만으로 적용된다.
# 주의: reset 직후 Realtime 서비스 워밍업에 ~15초가 걸린다 —
# 그 전에 실시간 테스트를 돌리면 이벤트 미수신으로 실패할 수 있다.
set -euo pipefail

supabase db reset

echo "Realtime 워밍업 대기 중 (15초)…"
sleep 15
echo "로컬 DB 리셋 완료"
