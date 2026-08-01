import { describe, it, expect } from "vitest";
import { isValidRating, RATING_MIN, RATING_MAX } from "./rating";

// AC1: 별점은 1~5 정수만 유효
describe("isValidRating", () => {
  it("1~5 정수는 유효하다", () => {
    for (let r = RATING_MIN; r <= RATING_MAX; r++) {
      expect(isValidRating(r)).toBe(true);
    }
  });

  it("0과 6은 무효하다", () => {
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
  });

  it("소수는 무효하다", () => {
    expect(isValidRating(3.5)).toBe(false);
  });

  it("NaN과 음수는 무효하다", () => {
    expect(isValidRating(NaN)).toBe(false);
    expect(isValidRating(-1)).toBe(false);
  });
});
