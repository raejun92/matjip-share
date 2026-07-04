import { createClient } from "@supabase/supabase-js";

// 기본값은 로컬 Supabase 개발 스택 (모두가 동일한 공개 개발용 키라 커밋 안전).
// 클라우드 배포 시 .env.local 의 NEXT_PUBLIC_* 값으로 대체된다.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase = createClient(url, anonKey);
