/**
 * 수업 카드용 장소 문자열 (이슈 #136)
 * venueName 우선, 없으면 region·museum 중복 제거 후 조합.
 */
export interface LessonLocationFields {
  region: string;
  museum?: string | null;
  venueName?: string | null;
}

/**
 * 카드 표시용 장소 문자열 생성.
 * - venueName이 있으면 우선 사용
 * - 없으면 region, museum을 중복 제거 후 공백으로 조합
 */
export function formatLessonCardLocation(lesson: LessonLocationFields): string {
  const v = lesson.venueName?.trim();
  if (v) return v;
  const parts = [lesson.region?.trim(), lesson.museum?.trim()].filter(
    (x): x is string => Boolean(x),
  );
  const deduped = [...new Set(parts)];
  return deduped.join(' ').trim() || '';
}
