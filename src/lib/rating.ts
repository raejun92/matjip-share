export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** 별점은 1~5 정수 (PRD §6.3, spec 규칙 5) */
export function isValidRating(rating: number): boolean {
  return (
    Number.isInteger(rating) && rating >= RATING_MIN && rating <= RATING_MAX
  );
}
