#!/usr/bin/env bash
# 로컬 Supabase 리셋.
# 주의: 로컬 Realtime은 db reset 시 supabase_realtime publication을 비어 있는 상태로
# 재생성하므로 (마이그레이션의 alter publication이 유실됨), 재등록 + Realtime 재시작이 필요하다.
# 클라우드에선 마이그레이션만으로 충분하다.
set -euo pipefail

supabase db reset

docker exec supabase_db_matjip-share psql -U postgres -c "
do \$\$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'places'
  ) then
    alter publication supabase_realtime add table public.places;
  end if;
end \$\$;"

docker restart supabase_realtime_matjip-share > /dev/null
echo "로컬 DB 리셋 + Realtime publication 재등록 완료"
