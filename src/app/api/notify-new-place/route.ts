import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// 새 핀 푸시 발송 (slice 24).
// 클라이언트는 placeId만 보낸다 — 내용은 DB에서 재구성해 위조/스팸을 막고,
// 2분 지난 핀은 거부해 재발송 남용을 제한한다.

const MAX_AGE_MS = 2 * 60 * 1000;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createClient(url, key) : null;
}

export async function POST(request: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const admin = serviceClient();
  if (!publicKey || !privateKey || !admin) {
    return NextResponse.json(
      { error: "푸시 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }
  webpush.setVapidDetails("mailto:raejun922@gmail.com", publicKey, privateKey);

  const { placeId } = await request.json().catch(() => ({}));
  if (typeof placeId !== "string") {
    return NextResponse.json({ error: "placeId가 필요합니다." }, { status: 400 });
  }

  // DB에서 핀 검증 조회 (내용의 출처는 항상 DB)
  const { data: place } = await admin
    .from("places")
    .select("id, user_id, name, rating, created_at, users(name)")
    .eq("id", placeId)
    .maybeSingle();
  if (!place) {
    return NextResponse.json({ error: "핀을 찾을 수 없습니다." }, { status: 404 });
  }
  if (Date.now() - new Date(place.created_at).getTime() > MAX_AGE_MS) {
    return NextResponse.json({ error: "오래된 핀입니다." }, { status: 400 });
  }

  // 작성자 제외 전 구독자
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .neq("user_id", place.user_id);

  const author = (place.users as unknown as { name: string } | null)?.name ?? "누군가";
  const payload = JSON.stringify({
    title: "맛집공유 🍜",
    body: `${author}님이 ${place.name} 추가 ${"★".repeat(place.rating)}`,
    url: "/",
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 = 구독이 죽음 (앱 삭제, 권한 회수 등) → 정리
        if (status === 404 || status === 410) dead.push(sub.id);
      }
    }),
  );
  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }

  return NextResponse.json({ sent, cleaned: dead.length });
}
