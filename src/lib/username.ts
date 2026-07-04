export const MAX_NAME_LENGTH = 12;

export type NameResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

/** 이름을 trim 후 1~12자 규칙으로 검증한다 (PRD §6.1, spec 규칙 5) */
export function normalizeName(raw: string): NameResult {
  const name = raw.trim();
  if (name.length === 0) {
    return { ok: false, error: "이름을 입력해 주세요." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.` };
  }
  return { ok: true, name };
}
