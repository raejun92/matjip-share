import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 관리자 전용 API (slice 18).
// ADMIN_KEY로 보호되고, 삭제는 service role로 실행한다 (anon RLS 차단은 유지).

function unauthorized() {
  return NextResponse.json({ error: "관리자 키가 올바르지 않습니다." }, { status: 401 });
}

function isAuthorized(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return false; // 키 미설정 시 전면 차단
  const raw = request.headers.get("x-admin-key") ?? "";
  try {
    // 클라이언트가 인코딩해서 보낸다 (한글 키 지원 — 헤더는 Latin-1만 허용)
    return decodeURIComponent(raw) === adminKey;
  } catch {
    return false;
  }
}

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const [{ data: users, error: ue }, { data: places, error: pe }] =
    await Promise.all([
      admin.from("users").select("id, name, color, created_at").order("created_at"),
      admin.from("places").select("user_id"),
    ]);
  if (ue || pe) {
    return NextResponse.json(
      { error: ue?.message ?? pe?.message },
      { status: 500 },
    );
  }

  const pinCounts = new Map<string, number>();
  for (const p of places ?? []) {
    pinCounts.set(p.user_id, (pinCounts.get(p.user_id) ?? 0) + 1);
  }
  return NextResponse.json({
    users: (users ?? []).map((u) => ({
      ...u,
      pinCount: pinCounts.get(u.id) ?? 0,
    })),
  });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const userId = request.nextUrl.searchParams.get("id");
  if (!userId) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  // FK 순서: 핀 먼저, 유저 다음
  const { error: pe } = await admin.from("places").delete().eq("user_id", userId);
  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
  const { error: ue } = await admin.from("users").delete().eq("id", userId);
  if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
