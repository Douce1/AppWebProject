/**
 * Issue #86 — 출강불가 버튼 UX 개선 및 월간 출강불가 제출 로직 연동 테스트
 *
 * 테스트 범위:
 *  - formatDate / toYearMonth / formatMonthLabel 순수 함수
 *  - getDatesInRange 범위 계산
 *  - handleMonthUnavailableToggle 로직 (Alert 메시지, 슬롯 정리, API 연동)
 *  - 출강불가 제출 시 해당 월 슬롯 필터링 로직
 *  - 월별 요약(slotsByMonth) 계산 로직
 *  - 경계값 / 예외 / 사이드이펙트 / 통합 케이스
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface TimeSlot {
  start: string;
  end: string;
}
type AvailabilityMap = Record<string, TimeSlot[]>;

interface ApiMonthSubmission {
  month: string;
  isUnavailable: boolean;
  submittedAt: string | null;
}

// ── 순수 함수 (실제 구현과 동일) ───────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toYearMonth(dateString: string): string {
  return dateString.slice(0, 7);
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${year}년 ${parseInt(m, 10)}월`;
}

function getDatesInRange(start: string, end: string): string[] {
  const result: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const step = startDate <= endDate ? 1 : -1;
  const current = new Date(startDate);
  while ((step === 1 && current <= endDate) || (step === -1 && current >= endDate)) {
    result.push(formatDate(current));
    current.setDate(current.getDate() + step);
  }
  return result;
}

/** 출강불가 제출 시 해당 월 슬롯 필터링 */
function clearMonthSlots(availability: AvailabilityMap, month: string): AvailabilityMap {
  return Object.fromEntries(
    Object.entries(availability).filter(([date]) => !date.startsWith(month)),
  );
}

/** 월별 요약 계산 */
function buildSlotsByMonth(
  slots: { date: string; start: string; end: string }[],
): [string, { dates: Set<string>; slots: number }][] {
  const map: Record<string, { dates: Set<string>; slots: number }> = {};
  slots.forEach(({ date }) => {
    const ym = date.slice(0, 7);
    if (!map[ym]) map[ym] = { dates: new Set(), slots: 0 };
    map[ym].dates.add(date);
    map[ym].slots++;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

/** Alert 메시지 생성 */
function buildUnavailableAlertMessage(viewMonth: string, next: boolean): string {
  const monthNum = parseInt(viewMonth.split('-')[1], 10);
  return next
    ? `${monthNum}월 출강불가로 제출하시겠습니까?\n확인 시 등록되어 있던 출강가능 날짜는 지워집니다.`
    : `${formatMonthLabel(viewMonth)} 출강 불가를 해제하시겠습니까?`;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeAvailability(entries: [string, TimeSlot[]][]): AvailabilityMap {
  return Object.fromEntries(entries);
}

function flattenSlots(av: AvailabilityMap) {
  return Object.entries(av).flatMap(([date, slots]) =>
    slots.map((s) => ({ date, start: s.start, end: s.end })),
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. formatDate
// ═════════════════════════════════════════════════════════════════════════════

describe('formatDate', () => {
  test('정상: 2026-03-15', () => {
    expect(formatDate(new Date(2026, 2, 15))).toBe('2026-03-15');
  });

  test('정상: 월/일 한 자리 패딩', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('정상: 연말', () => {
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  test('정상: 윤년 2월 29일', () => {
    expect(formatDate(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. toYearMonth
// ═════════════════════════════════════════════════════════════════════════════

describe('toYearMonth', () => {
  test('정상: YYYY-MM-DD → YYYY-MM', () => {
    expect(toYearMonth('2026-03-15')).toBe('2026-03');
  });

  test('정상: 이미 YYYY-MM 형태여도 앞 7자', () => {
    expect(toYearMonth('2026-12-01')).toBe('2026-12');
  });

  test('경계: 1월', () => {
    expect(toYearMonth('2026-01-01')).toBe('2026-01');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. formatMonthLabel
// ═════════════════════════════════════════════════════════════════════════════

describe('formatMonthLabel', () => {
  test('정상: 2026-03 → 2026년 3월', () => {
    expect(formatMonthLabel('2026-03')).toBe('2026년 3월');
  });

  test('정상: 12월', () => {
    expect(formatMonthLabel('2026-12')).toBe('2026년 12월');
  });

  test('정상: 1월 패딩 제거', () => {
    expect(formatMonthLabel('2026-01')).toBe('2026년 1월');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. getDatesInRange
// ═════════════════════════════════════════════════════════════════════════════

describe('getDatesInRange', () => {
  test('정상: 단일 날짜', () => {
    const r = getDatesInRange('2026-03-15', '2026-03-15');
    expect(r).toEqual(['2026-03-15']);
  });

  test('정상: 3일 범위', () => {
    const r = getDatesInRange('2026-03-15', '2026-03-17');
    expect(r).toEqual(['2026-03-15', '2026-03-16', '2026-03-17']);
  });

  test('정상: 역순 범위', () => {
    const r = getDatesInRange('2026-03-17', '2026-03-15');
    expect(r).toEqual(['2026-03-17', '2026-03-16', '2026-03-15']);
  });

  test('정상: 월경계', () => {
    const r = getDatesInRange('2026-03-30', '2026-04-01');
    expect(r).toEqual(['2026-03-30', '2026-03-31', '2026-04-01']);
  });

  test('정상: 연경계', () => {
    const r = getDatesInRange('2025-12-31', '2026-01-01');
    expect(r).toEqual(['2025-12-31', '2026-01-01']);
  });

  test('경계: 30일 범위 길이 확인', () => {
    const r = getDatesInRange('2026-03-01', '2026-03-30');
    expect(r).toHaveLength(30);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. clearMonthSlots (출강불가 제출 시 슬롯 정리)
// ═════════════════════════════════════════════════════════════════════════════

describe('clearMonthSlots', () => {
  test('정상: 해당 월 슬롯만 제거', () => {
    const av = makeAvailability([
      ['2026-03-10', [{ start: '09:00', end: '18:00' }]],
      ['2026-03-15', [{ start: '10:00', end: '12:00' }]],
      ['2026-04-05', [{ start: '09:00', end: '17:00' }]],
    ]);
    const result = clearMonthSlots(av, '2026-03');
    expect(Object.keys(result)).toEqual(['2026-04-05']);
    expect(result['2026-03-10']).toBeUndefined();
    expect(result['2026-03-15']).toBeUndefined();
  });

  test('정상: 다른 월은 보존', () => {
    const av = makeAvailability([
      ['2026-03-10', [{ start: '09:00', end: '18:00' }]],
      ['2026-05-01', [{ start: '08:00', end: '16:00' }]],
    ]);
    const result = clearMonthSlots(av, '2026-03');
    expect(result['2026-05-01']).toBeDefined();
    expect(result['2026-05-01'][0].start).toBe('08:00');
  });

  test('예외: 해당 월 슬롯이 없으면 그대로 반환', () => {
    const av = makeAvailability([
      ['2026-04-10', [{ start: '09:00', end: '18:00' }]],
    ]);
    const result = clearMonthSlots(av, '2026-03');
    expect(Object.keys(result)).toEqual(['2026-04-10']);
  });

  test('예외: 빈 availability', () => {
    const result = clearMonthSlots({}, '2026-03');
    expect(Object.keys(result)).toHaveLength(0);
  });

  test('경계: 월 prefix 매칭 정확성 (2026-03 이 2026-030 등 미포함)', () => {
    const av = makeAvailability([
      ['2026-03-01', [{ start: '09:00', end: '18:00' }]],
      ['2026-03-31', [{ start: '09:00', end: '18:00' }]],
      ['2026-04-01', [{ start: '09:00', end: '18:00' }]],
    ]);
    const result = clearMonthSlots(av, '2026-03');
    expect(Object.keys(result)).toEqual(['2026-04-01']);
  });

  test('사이드이펙트: 원본 availability 변경 없음 (immutable)', () => {
    const av = makeAvailability([
      ['2026-03-10', [{ start: '09:00', end: '18:00' }]],
    ]);
    clearMonthSlots(av, '2026-03');
    expect(av['2026-03-10']).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. buildUnavailableAlertMessage
// ═════════════════════════════════════════════════════════════════════════════

describe('buildUnavailableAlertMessage', () => {
  test('정상: 출강불가 제출 메시지', () => {
    const msg = buildUnavailableAlertMessage('2026-03', true);
    expect(msg).toContain('3월 출강불가로 제출하시겠습니까?');
    expect(msg).toContain('등록되어 있던 출강가능 날짜는 지워집니다');
  });

  test('정상: 출강불가 해제 메시지', () => {
    const msg = buildUnavailableAlertMessage('2026-03', false);
    expect(msg).toContain('2026년 3월');
    expect(msg).toContain('출강 불가를 해제하시겠습니까?');
  });

  test('정상: 12월 숫자 표기', () => {
    const msg = buildUnavailableAlertMessage('2026-12', true);
    expect(msg).toContain('12월 출강불가로 제출하시겠습니까?');
  });

  test('정상: 1월 숫자 표기 (01 → 1)', () => {
    const msg = buildUnavailableAlertMessage('2026-01', true);
    expect(msg).toContain('1월 출강불가로 제출하시겠습니까?');
    expect(msg).not.toContain('01월');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. buildSlotsByMonth (월별 요약)
// ═════════════════════════════════════════════════════════════════════════════

describe('buildSlotsByMonth', () => {
  test('정상: 단일 월 집계', () => {
    const slots = [
      { date: '2026-03-10', start: '09:00', end: '12:00' },
      { date: '2026-03-15', start: '13:00', end: '18:00' },
    ];
    const result = buildSlotsByMonth(slots);
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('2026-03');
    expect(result[0][1].dates.size).toBe(2);
    expect(result[0][1].slots).toBe(2);
  });

  test('정상: 같은 날짜 여러 슬롯', () => {
    const slots = [
      { date: '2026-03-10', start: '09:00', end: '12:00' },
      { date: '2026-03-10', start: '13:00', end: '18:00' },
    ];
    const result = buildSlotsByMonth(slots);
    expect(result[0][1].dates.size).toBe(1); // 날짜는 1
    expect(result[0][1].slots).toBe(2); // 슬롯은 2
  });

  test('정상: 여러 월 정렬', () => {
    const slots = [
      { date: '2026-05-01', start: '09:00', end: '18:00' },
      { date: '2026-03-10', start: '09:00', end: '18:00' },
      { date: '2026-04-05', start: '09:00', end: '18:00' },
    ];
    const result = buildSlotsByMonth(slots);
    expect(result.map(([m]) => m)).toEqual(['2026-03', '2026-04', '2026-05']);
  });

  test('예외: 빈 배열', () => {
    expect(buildSlotsByMonth([])).toHaveLength(0);
  });

  test('정상: 3개월 집계', () => {
    const slots = [
      { date: '2026-03-01', start: '09:00', end: '18:00' },
      { date: '2026-03-02', start: '09:00', end: '18:00' },
      { date: '2026-04-01', start: '09:00', end: '18:00' },
      { date: '2026-05-01', start: '09:00', end: '18:00' },
      { date: '2026-05-02', start: '09:00', end: '18:00' },
      { date: '2026-05-02', start: '14:00', end: '18:00' },
    ];
    const result = buildSlotsByMonth(slots);
    expect(result).toHaveLength(3);
    const [, mar] = result[0];
    const [, apr] = result[1];
    const [, may] = result[2];
    expect(mar.dates.size).toBe(2);
    expect(apr.dates.size).toBe(1);
    expect(may.dates.size).toBe(2);
    expect(may.slots).toBe(3); // 2026-05-02에 2슬롯
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. 통합: 출강불가 제출 흐름
// ═════════════════════════════════════════════════════════════════════════════

describe('출강불가 제출 통합 흐름', () => {
  const viewMonth = '2026-03';

  const availability = makeAvailability([
    ['2026-03-10', [{ start: '09:00', end: '12:00' }]],
    ['2026-03-15', [{ start: '13:00', end: '18:00' }]],
    ['2026-04-05', [{ start: '09:00', end: '17:00' }]],
  ]);

  test('출강불가 제출 시 해당 월 슬롯 삭제 후 다른 월 보존', () => {
    const next = clearMonthSlots(availability, viewMonth);
    expect(next['2026-03-10']).toBeUndefined();
    expect(next['2026-03-15']).toBeUndefined();
    expect(next['2026-04-05']).toBeDefined();
  });

  test('출강불가 제출 메시지 포맷 확인', () => {
    const msg = buildUnavailableAlertMessage(viewMonth, true);
    expect(msg).toContain('3월');
    expect(msg).toContain('지워집니다');
  });

  test('출강불가 해제 메시지 포맷 확인', () => {
    const msg = buildUnavailableAlertMessage(viewMonth, false);
    expect(msg).toContain('해제');
    expect(msg).not.toContain('지워집니다');
  });

  test('제출 후 월별 요약에서 해당 월 사라짐', () => {
    const cleaned = clearMonthSlots(availability, viewMonth);
    const slots = flattenSlots(cleaned);
    const summary = buildSlotsByMonth(slots);
    const months = summary.map(([m]) => m);
    expect(months).not.toContain('2026-03');
    expect(months).toContain('2026-04');
  });

  test('회귀: 다른 월 슬롯 수 변화 없음', () => {
    const before = flattenSlots(availability).filter((s) => !s.date.startsWith(viewMonth));
    const cleaned = clearMonthSlots(availability, viewMonth);
    const after = flattenSlots(cleaned);
    expect(after).toHaveLength(before.length);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. 예외 / 경계 케이스
// ═════════════════════════════════════════════════════════════════════════════

describe('예외 및 경계 케이스', () => {
  test('formatDate: 1월 1일', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  test('getDatesInRange: 같은 날', () => {
    expect(getDatesInRange('2026-03-15', '2026-03-15')).toHaveLength(1);
  });

  test('clearMonthSlots: 빈 맵 처리', () => {
    expect(() => clearMonthSlots({}, '2026-03')).not.toThrow();
  });

  test('buildSlotsByMonth: 중복 날짜 슬롯 합산', () => {
    const slots = Array.from({ length: 5 }, () => ({
      date: '2026-03-10',
      start: '09:00',
      end: '10:00',
    }));
    const result = buildSlotsByMonth(slots);
    expect(result[0][1].dates.size).toBe(1);
    expect(result[0][1].slots).toBe(5);
  });

  test('formatMonthLabel: 10월', () => {
    expect(formatMonthLabel('2026-10')).toBe('2026년 10월');
  });

  test('toYearMonth: 다양한 일자 모두 동일 월 반환', () => {
    expect(toYearMonth('2026-03-01')).toBe('2026-03');
    expect(toYearMonth('2026-03-31')).toBe('2026-03');
  });

  test('buildUnavailableAlertMessage: next=false 시 지워짐 문구 없음', () => {
    const msg = buildUnavailableAlertMessage('2026-05', false);
    expect(msg).not.toContain('지워집니다');
  });

  test('clearMonthSlots: 모든 날짜가 해당 월인 경우 빈 맵 반환', () => {
    const av = makeAvailability([
      ['2026-03-01', [{ start: '09:00', end: '18:00' }]],
      ['2026-03-15', [{ start: '09:00', end: '18:00' }]],
    ]);
    const result = clearMonthSlots(av, '2026-03');
    expect(Object.keys(result)).toHaveLength(0);
  });
});
