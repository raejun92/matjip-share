import { supabase } from "./supabase";
import { assignColor } from "./colors";

export type User = {
  id: string;
  name: string;
  color: string;
};

/** id로 사용자 조회. 없으면 null (재접속 시 localStorage 검증용) */
export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, color")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);
  return data;
}

/**
 * 이름으로 사용자를 찾고, 없으면 미사용 색을 배정해 생성한다.
 * 같은 이름 = 같은 사람으로 취급 (spec 규칙 3).
 */
export async function getOrCreateUser(name: string): Promise<User> {
  const existing = await findUserByName(name);
  if (existing) return existing;

  const { data: rows, error: colorsError } = await supabase
    .from("users")
    .select("color");
  if (colorsError) throw new Error(`색상 조회 실패: ${colorsError.message}`);

  const color = assignColor((rows ?? []).map((r) => r.color));
  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({ name, color })
    .select("id, name, color")
    .single();

  if (insertError) {
    // 23505: 동시에 같은 이름이 생성된 경우 → 기존 사용자로 이어쓰기
    if (insertError.code === "23505") {
      const raced = await findUserByName(name);
      if (raced) return raced;
    }
    throw new Error(`사용자 생성 실패: ${insertError.message}`);
  }
  return created;
}

/**
 * 이름 바꾸기 (slice 15) — 핀·색상·id는 유지된다.
 * 이미 있는 이름이면 거부 (이어쓰기 규칙과 혼동 방지).
 */
export async function renameUser(id: string, newName: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .update({ name: newName })
    .eq("id", id)
    .select("id, name, color")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 사용 중인 이름이에요.");
    }
    throw new Error(`이름 변경 실패: ${error.message}`);
  }
  return data;
}

async function findUserByName(name: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, color")
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(`사용자 조회 실패: ${error.message}`);
  return data;
}
