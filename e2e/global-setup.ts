import { createClient } from "@supabase/supabase-js";

// E2E 시작 전 로컬 DB 비우기.
// 데이터가 쌓이면 fit bounds가 전국 줌아웃을 만들어 핀이 겹치고 테스트가 흔들린다.
// 아래 service role 키는 로컬 개발 스택 공용 값 — 클라우드에는 통하지 않는다.
export default async function globalSetup() {
  const admin = createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  );
  // 전체 삭제 (places 먼저 — users FK)
  const { error: pe } = await admin
    .from("places")
    .delete()
    .gte("created_at", "1970-01-01");
  const { error: ue } = await admin
    .from("users")
    .delete()
    .gte("created_at", "1970-01-01");
  if (pe || ue) {
    throw new Error(
      `E2E 사전 정리 실패: ${pe?.message ?? ""} ${ue?.message ?? ""} — 로컬 Supabase(supabase start)가 떠 있는지 확인하세요.`,
    );
  }
}
