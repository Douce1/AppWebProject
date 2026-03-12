/**
 * Issue #134 — 확정 수업 있는 월은 출강 불가 버튼 비활성화
 * hasConfirmedLessonInMonth, lessonFallsInMonth, 409 메시지 등 검증 (30개 이상)
 */

type LessonStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'UPDATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface ApiLesson {
  lessonId: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
}

const CONFIRMED_LESSON_STATUSES: LessonStatus[] = [
  'ACCEPTED',
  'CONTRACT_SIGNED',
  'IN_PROGRESS',
];

function lessonFallsInMonth(lesson: ApiLesson, yearMonth: string): boolean {
  const startMonth = lesson.startsAt?.slice(0, 7);
  const endMonth = lesson.endsAt?.slice(0, 7);
  return yearMonth === startMonth || yearMonth === endMonth;
}

function hasConfirmedLessonInMonth(
  lessons: ApiLesson[],
  yearMonth: string,
): boolean {
  return lessons.some(
    (l) =>
      CONFIRMED_LESSON_STATUSES.includes(l.status) &&
      lessonFallsInMonth(l, yearMonth),
  );
}

function get409Message(): string {
  return '이 달에는 이미 확정된 수업이 있어 출강 불가로 변경할 수 없습니다.';
}

function getCannotSwitchToUnavailable(
  lessons: ApiLesson[],
  yearMonth: string,
  isUnavailable: boolean,
): boolean {
  const hasConfirmed = hasConfirmedLessonInMonth(lessons, yearMonth);
  return hasConfirmed && !isUnavailable;
}

function makeLesson(overrides: Partial<ApiLesson> = {}): ApiLesson {
  return {
    lessonId: 'L1',
    startsAt: '2026-03-15T10:00:00Z',
    endsAt: '2026-03-15T12:00:00Z',
    status: 'ACCEPTED',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. lessonFallsInMonth (정상/경계)
// ══════════════════════════════════════════════════════════════════════════════

describe('lessonFallsInMonth', () => {
  test('T01 — startsAt이 해당 월이면 true', () => {
    const lesson = makeLesson({ startsAt: '2026-03-10T09:00:00Z', endsAt: '2026-04-10T09:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(true);
  });

  test('T02 — endsAt이 해당 월이면 true', () => {
    const lesson = makeLesson({ startsAt: '2026-02-01T09:00:00Z', endsAt: '2026-03-01T09:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(true);
  });

  test('T03 — 둘 다 해당 월이면 true', () => {
    const lesson = makeLesson({ startsAt: '2026-03-01T00:00:00Z', endsAt: '2026-03-31T23:59:59Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(true);
  });

  test('T04 — 해당 월이 아니면 false', () => {
    const lesson = makeLesson({ startsAt: '2026-02-01T00:00:00Z', endsAt: '2026-02-28T23:59:59Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(false);
  });

  test('T05 — yearMonth 형식 YYYY-MM', () => {
    const lesson = makeLesson({ startsAt: '2025-12-25T12:00:00Z', endsAt: '2025-12-25T14:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2025-12')).toBe(true);
  });

  test('T06 — 1월', () => {
    const lesson = makeLesson({ startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-01-01T01:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2026-01')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. CONFIRMED_LESSON_STATUSES 및 hasConfirmedLessonInMonth
// ══════════════════════════════════════════════════════════════════════════════

describe('hasConfirmedLessonInMonth', () => {
  test('T07 — ACCEPTED 한 건이 해당 월이면 true', () => {
    const lessons = [makeLesson({ status: 'ACCEPTED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(true);
  });

  test('T08 — CONTRACT_SIGNED 한 건이 해당 월이면 true', () => {
    const lessons = [makeLesson({ status: 'CONTRACT_SIGNED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(true);
  });

  test('T09 — IN_PROGRESS 한 건이 해당 월이면 true', () => {
    const lessons = [makeLesson({ status: 'IN_PROGRESS', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(true);
  });

  test('T10 — PENDING만 있으면 false', () => {
    const lessons = [makeLesson({ status: 'PENDING', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(false);
  });

  test('T11 — COMPLETED만 있으면 false', () => {
    const lessons = [makeLesson({ status: 'COMPLETED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(false);
  });

  test('T12 — CANCELLED만 있으면 false', () => {
    const lessons = [makeLesson({ status: 'CANCELLED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(false);
  });

  test('T13 — 빈 배열이면 false', () => {
    expect(hasConfirmedLessonInMonth([], '2026-03')).toBe(false);
  });

  test('T14 — 확정 수업이 다른 월이면 false', () => {
    const lessons = [makeLesson({ status: 'ACCEPTED', startsAt: '2026-02-10T00:00:00Z', endsAt: '2026-02-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(false);
  });

  test('T15 — 여러 건 중 한 건만 확정+해당 월이면 true', () => {
    const lessons = [
      makeLesson({ lessonId: 'L1', status: 'PENDING', startsAt: '2026-03-01T00:00:00Z', endsAt: '2026-03-01T01:00:00Z' }),
      makeLesson({ lessonId: 'L2', status: 'ACCEPTED', startsAt: '2026-03-15T00:00:00Z', endsAt: '2026-03-15T01:00:00Z' }),
    ];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(true);
  });

  test('T16 — CONFIRMED_LESSON_STATUSES 길이 3', () => {
    expect(CONFIRMED_LESSON_STATUSES).toHaveLength(3);
    expect(CONFIRMED_LESSON_STATUSES).toContain('ACCEPTED');
    expect(CONFIRMED_LESSON_STATUSES).toContain('CONTRACT_SIGNED');
    expect(CONFIRMED_LESSON_STATUSES).toContain('IN_PROGRESS');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. getCannotSwitchToUnavailable (버튼 비활성화 조건)
// ══════════════════════════════════════════════════════════════════════════════

describe('getCannotSwitchToUnavailable', () => {
  test('T17 — 확정 수업 있고 출강 가능 상태면 true (버튼 비활성화)', () => {
    const lessons = [makeLesson({ status: 'ACCEPTED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(getCannotSwitchToUnavailable(lessons, '2026-03', false)).toBe(true);
  });

  test('T18 — 확정 수업 있고 이미 출강 불가 상태면 false (해제는 가능)', () => {
    const lessons = [makeLesson({ status: 'ACCEPTED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(getCannotSwitchToUnavailable(lessons, '2026-03', true)).toBe(false);
  });

  test('T19 — 확정 수업 없고 출강 가능이면 false', () => {
    expect(getCannotSwitchToUnavailable([], '2026-03', false)).toBe(false);
  });

  test('T20 — 확정 수업 없고 출강 불가면 false', () => {
    expect(getCannotSwitchToUnavailable([], '2026-03', true)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 409 메시지 및 예외
// ══════════════════════════════════════════════════════════════════════════════

describe('get409Message', () => {
  test('T21 — 409 시 사용할 전용 메시지', () => {
    const msg = get409Message();
    expect(msg).toContain('확정된 수업');
    expect(msg).toContain('출강 불가로 변경할 수 없습니다');
  });

  test('T22 — 메시지가 비어있지 않음', () => {
    expect(get409Message().length).toBeGreaterThan(10);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 예외 / 경계 / 통합 / 회귀
// ══════════════════════════════════════════════════════════════════════════════

describe('예외 및 경계', () => {
  test('T23 — UPDATED는 확정이 아님', () => {
    const lessons = [makeLesson({ status: 'UPDATED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(false);
  });

  test('T24 — startsAt만 해당 월, endsAt은 다음 달', () => {
    const lesson = makeLesson({ startsAt: '2026-03-31T23:00:00Z', endsAt: '2026-04-01T01:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(true);
  });

  test('T25 — endsAt만 해당 월', () => {
    const lesson = makeLesson({ startsAt: '2026-02-28T23:00:00Z', endsAt: '2026-03-01T00:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(true);
  });

  test('T26 — 빈 lessons + isUnavailable false → cannotSwitch false', () => {
    expect(getCannotSwitchToUnavailable([], '2026-03', false)).toBe(false);
  });

  test('T27 — 여러 확정 수업 같은 월', () => {
    const lessons = [
      makeLesson({ lessonId: 'A', status: 'ACCEPTED', startsAt: '2026-03-01T00:00:00Z', endsAt: '2026-03-01T01:00:00Z' }),
      makeLesson({ lessonId: 'B', status: 'IN_PROGRESS', startsAt: '2026-03-15T00:00:00Z', endsAt: '2026-03-15T01:00:00Z' }),
    ];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(true);
  });

  test('T28 — 회귀: 기존 출강 가능 시 버튼 활성화 유지 (확정 수업 없을 때)', () => {
    const cannot = getCannotSwitchToUnavailable([], '2026-04', false);
    expect(cannot).toBe(false);
  });

  test('T29 — 회귀: 확정 수업 있는 월에서 출강 불가 버튼만 비활성화', () => {
    const lessons = [makeLesson({ status: 'CONTRACT_SIGNED', startsAt: '2026-05-10T00:00:00Z', endsAt: '2026-05-10T01:00:00Z' })];
    expect(getCannotSwitchToUnavailable(lessons, '2026-05', false)).toBe(true);
    expect(getCannotSwitchToUnavailable(lessons, '2026-05', true)).toBe(false);
  });

  test('T30 — yearMonth 일치 형식 (7자)', () => {
    const lesson = makeLesson({ startsAt: '2026-03-15T10:00:00Z', endsAt: '2026-03-15T12:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(true);
    expect(lesson.startsAt.slice(0, 7)).toBe('2026-03');
  });

  test('T31 — 다른 연도 같은 월', () => {
    const lesson = makeLesson({ startsAt: '2025-03-10T00:00:00Z', endsAt: '2025-03-10T01:00:00Z' });
    expect(lessonFallsInMonth(lesson, '2025-03')).toBe(true);
    expect(lessonFallsInMonth(lesson, '2026-03')).toBe(false);
  });

  test('T32 — 사이드 이펙트: 원본 배열 변경 없음', () => {
    const lessons = [makeLesson({ status: 'ACCEPTED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' })];
    const copy = [...lessons];
    hasConfirmedLessonInMonth(lessons, '2026-03');
    expect(lessons).toEqual(copy);
  });

  test('T33 — 통합: 월 변경 시 viewMonth만 바꿔도 재계산 가능', () => {
    const lessons = [
      makeLesson({ status: 'ACCEPTED', startsAt: '2026-03-10T00:00:00Z', endsAt: '2026-03-10T01:00:00Z' }),
      makeLesson({ status: 'ACCEPTED', startsAt: '2026-04-10T00:00:00Z', endsAt: '2026-04-10T01:00:00Z' }),
    ];
    expect(hasConfirmedLessonInMonth(lessons, '2026-03')).toBe(true);
    expect(hasConfirmedLessonInMonth(lessons, '2026-04')).toBe(true);
    expect(hasConfirmedLessonInMonth(lessons, '2026-05')).toBe(false);
  });

  test('T34 — 이슈 #134 요약: 확정 수업 = ACCEPTED, CONTRACT_SIGNED, IN_PROGRESS', () => {
    expect(CONFIRMED_LESSON_STATUSES).not.toContain('PENDING');
    expect(CONFIRMED_LESSON_STATUSES).not.toContain('COMPLETED');
    expect(CONFIRMED_LESSON_STATUSES).not.toContain('CANCELLED');
  });

  test('T35 — 409 메시지에 "이 달" 포함', () => {
    expect(get409Message()).toMatch(/이 달/);
  });
});
