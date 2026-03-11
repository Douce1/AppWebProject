/**
 * Issue #87: IncomeScreen 정산 내역 기간 필터 테스트
 *
 * 테스트 범위:
 *  - getCurrentMonth: 현재 월 반환
 *  - formatPeriodLabel: 기간 표시 포맷
 *  - filterSettlementsByPeriod: 기간 필터링
 *  - addMonths: 월 증감
 *  - clampMonth: 범위 제한
 *  - 통합 케이스 / 경계값 / 예외 케이스
 */

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

interface ApiSettlement {
    settlementId: string;
    companyId: string;
    instructorId: string;
    lessonId: string;
    month: string; // "YYYY-MM"
    totalHours: number;
    hourlyRate: number;
    grossAmount: number;
    status: string;
    scheduledPayDate?: string | null;
    paidAt?: string | null;
}

// ─── 순수 함수 (IncomeScreen 로직과 동일) ──────────────────────────────────────

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodLabel(start: string, end: string): string {
    return `${start} ~ ${end}`;
}

function filterSettlementsByPeriod(
    settlements: ApiSettlement[],
    startMonth: string,
    endMonth: string,
): ApiSettlement[] {
    return settlements.filter((s) => s.month >= startMonth && s.month <= endMonth);
}

function addMonths(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function clampMonth(value: string, min: string, max: string): string {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

// ─── 테스트 헬퍼 ───────────────────────────────────────────────────────────────

function makeSettlement(month: string, overrides: Partial<ApiSettlement> = {}): ApiSettlement {
    return {
        settlementId: `s-${month}`,
        companyId: 'c1',
        instructorId: 'i1',
        lessonId: 'l1',
        month,
        totalHours: 10,
        hourlyRate: 30000,
        grossAmount: 300000,
        status: 'PAID',
        scheduledPayDate: null,
        paidAt: null,
        ...overrides,
    };
}

const SAMPLE_SETTLEMENTS: ApiSettlement[] = [
    makeSettlement('2025-11'),
    makeSettlement('2025-12'),
    makeSettlement('2026-01'),
    makeSettlement('2026-02'),
    makeSettlement('2026-03'),
    makeSettlement('2026-04'),
];

// ─── getCurrentMonth ──────────────────────────────────────────────────────────

describe('getCurrentMonth', () => {
    it('returns YYYY-MM format', () => {
        const result = getCurrentMonth();
        expect(result).toMatch(/^\d{4}-\d{2}$/);
    });

    it('returns a valid month (01-12)', () => {
        const result = getCurrentMonth();
        const month = parseInt(result.split('-')[1], 10);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
    });

    it('returns a 4-digit year', () => {
        const result = getCurrentMonth();
        const year = parseInt(result.split('-')[0], 10);
        expect(year).toBeGreaterThanOrEqual(2020);
    });
});

// ─── formatPeriodLabel ────────────────────────────────────────────────────────

describe('formatPeriodLabel', () => {
    it('formats same start and end month', () => {
        expect(formatPeriodLabel('2026-03', '2026-03')).toBe('2026-03 ~ 2026-03');
    });

    it('formats different start and end months', () => {
        expect(formatPeriodLabel('2026-01', '2026-03')).toBe('2026-01 ~ 2026-03');
    });

    it('formats cross-year period', () => {
        expect(formatPeriodLabel('2025-11', '2026-02')).toBe('2025-11 ~ 2026-02');
    });

    it('contains tilde separator', () => {
        const label = formatPeriodLabel('2026-03', '2026-03');
        expect(label).toContain('~');
    });

    it('has exactly 2 parts when split by ~', () => {
        const label = formatPeriodLabel('2026-01', '2026-06');
        expect(label.split('~').length).toBe(2);
    });

    it('preserves YYYY-MM format for both parts', () => {
        const label = formatPeriodLabel('2026-01', '2026-06');
        const parts = label.split(' ~ ');
        expect(parts[0]).toMatch(/^\d{4}-\d{2}$/);
        expect(parts[1]).toMatch(/^\d{4}-\d{2}$/);
    });
});

// ─── filterSettlementsByPeriod ────────────────────────────────────────────────

describe('filterSettlementsByPeriod', () => {
    it('returns all matching settlements in range', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2026-01', '2026-03');
        expect(result).toHaveLength(3);
        expect(result.map((s) => s.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    });

    it('returns only the matching month for same start/end', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2026-02', '2026-02');
        expect(result).toHaveLength(1);
        expect(result[0].month).toBe('2026-02');
    });

    it('returns empty array when no settlements in range', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2024-01', '2024-12');
        expect(result).toHaveLength(0);
    });

    it('includes boundary months (inclusive range)', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2025-11', '2026-04');
        expect(result).toHaveLength(6);
    });

    it('filters correctly across year boundary', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2025-12', '2026-01');
        expect(result).toHaveLength(2);
        expect(result.map((s) => s.month)).toEqual(['2025-12', '2026-01']);
    });

    it('returns empty array for empty input', () => {
        const result = filterSettlementsByPeriod([], '2026-01', '2026-03');
        expect(result).toHaveLength(0);
    });

    it('handles single settlement that is in range', () => {
        const result = filterSettlementsByPeriod([makeSettlement('2026-03')], '2026-03', '2026-03');
        expect(result).toHaveLength(1);
    });

    it('handles single settlement that is out of range', () => {
        const result = filterSettlementsByPeriod([makeSettlement('2026-03')], '2026-01', '2026-02');
        expect(result).toHaveLength(0);
    });

    it('does not mutate original array', () => {
        const copy = [...SAMPLE_SETTLEMENTS];
        filterSettlementsByPeriod(copy, '2026-01', '2026-02');
        expect(copy).toHaveLength(SAMPLE_SETTLEMENTS.length);
    });

    it('keeps settlement with exact start month', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2025-11', '2025-12');
        expect(result.some((s) => s.month === '2025-11')).toBe(true);
    });

    it('keeps settlement with exact end month', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2025-11', '2025-12');
        expect(result.some((s) => s.month === '2025-12')).toBe(true);
    });

    it('inverted range (start > end) returns empty', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2026-06', '2026-01');
        expect(result).toHaveLength(0);
    });

    it('PENDING status items are included in filter', () => {
        const pending = makeSettlement('2026-02', { status: 'PENDING' });
        const result = filterSettlementsByPeriod([pending], '2026-01', '2026-03');
        expect(result).toHaveLength(1);
    });

    it('preserves all settlement fields', () => {
        const s = makeSettlement('2026-02', { grossAmount: 500000, totalHours: 20 });
        const result = filterSettlementsByPeriod([s], '2026-02', '2026-02');
        expect(result[0].grossAmount).toBe(500000);
        expect(result[0].totalHours).toBe(20);
    });
});

// ─── addMonths ────────────────────────────────────────────────────────────────

describe('addMonths', () => {
    it('adds 1 month correctly', () => {
        expect(addMonths('2026-03', 1)).toBe('2026-04');
    });

    it('subtracts 1 month correctly', () => {
        expect(addMonths('2026-03', -1)).toBe('2026-02');
    });

    it('handles year rollover forward', () => {
        expect(addMonths('2025-12', 1)).toBe('2026-01');
    });

    it('handles year rollover backward', () => {
        expect(addMonths('2026-01', -1)).toBe('2025-12');
    });

    it('adds multiple months', () => {
        expect(addMonths('2026-01', 5)).toBe('2026-06');
    });

    it('subtracts multiple months across year', () => {
        expect(addMonths('2026-03', -6)).toBe('2025-09');
    });

    it('adding 0 returns same value', () => {
        expect(addMonths('2026-03', 0)).toBe('2026-03');
    });

    it('pads single-digit months with leading zero', () => {
        expect(addMonths('2026-08', 1)).toBe('2026-09');
    });

    it('handles December to January rollover', () => {
        expect(addMonths('2026-12', 1)).toBe('2027-01');
    });

    it('handles January to December rollover', () => {
        expect(addMonths('2027-01', -1)).toBe('2026-12');
    });

    it('large positive delta: +24 months', () => {
        expect(addMonths('2026-01', 24)).toBe('2028-01');
    });

    it('large negative delta: -24 months', () => {
        expect(addMonths('2026-01', -24)).toBe('2024-01');
    });
});

// ─── clampMonth ───────────────────────────────────────────────────────────────

describe('clampMonth', () => {
    it('returns value when within range', () => {
        expect(clampMonth('2026-03', '2026-01', '2026-06')).toBe('2026-03');
    });

    it('clamps to min when below range', () => {
        expect(clampMonth('2025-12', '2026-01', '2026-06')).toBe('2026-01');
    });

    it('clamps to max when above range', () => {
        expect(clampMonth('2026-07', '2026-01', '2026-06')).toBe('2026-06');
    });

    it('returns min when value equals min', () => {
        expect(clampMonth('2026-01', '2026-01', '2026-06')).toBe('2026-01');
    });

    it('returns max when value equals max', () => {
        expect(clampMonth('2026-06', '2026-01', '2026-06')).toBe('2026-06');
    });

    it('works with same min and max', () => {
        expect(clampMonth('2026-05', '2026-03', '2026-03')).toBe('2026-03');
    });
});

// ─── 통합 케이스 ──────────────────────────────────────────────────────────────

describe('filter integration', () => {
    it('filtered results can be sorted descending', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2026-01', '2026-04')
            .sort((a, b) => b.month.localeCompare(a.month));
        expect(result[0].month).toBe('2026-04');
        expect(result[result.length - 1].month).toBe('2026-01');
    });

    it('default filter (current month only) matches single month', () => {
        const currentMonth = getCurrentMonth();
        const withCurrent = [...SAMPLE_SETTLEMENTS, makeSettlement(currentMonth)];
        const result = filterSettlementsByPeriod(withCurrent, currentMonth, currentMonth);
        expect(result.every((s) => s.month === currentMonth)).toBe(true);
    });

    it('full range returns all settlements', () => {
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2025-11', '2026-04');
        expect(result).toHaveLength(SAMPLE_SETTLEMENTS.length);
    });

    it('period label updates correctly when months change', () => {
        const start = addMonths(getCurrentMonth(), -2);
        const end = getCurrentMonth();
        const label = formatPeriodLabel(start, end);
        expect(label).toContain(start);
        expect(label).toContain(end);
    });

    it('extending range by 1 month includes new settlement', () => {
        const initial = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2026-01', '2026-03');
        const extended = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, '2026-01', '2026-04');
        expect(extended.length).toBe(initial.length + 1);
    });

    it('addMonths then filter: next month range starts from next month', () => {
        const nextMonth = addMonths('2026-03', 1);
        expect(nextMonth).toBe('2026-04');
        const result = filterSettlementsByPeriod(SAMPLE_SETTLEMENTS, nextMonth, nextMonth);
        expect(result).toHaveLength(1);
        expect(result[0].month).toBe('2026-04');
    });
});

// ─── 회귀 케이스 ──────────────────────────────────────────────────────────────

describe('regression cases', () => {
    it('existing settlement structure unchanged after filtering', () => {
        const original = makeSettlement('2026-02', {
            settlementId: 'unique-id',
            grossAmount: 999999,
            status: 'PAID',
        });
        const [result] = filterSettlementsByPeriod([original], '2026-02', '2026-02');
        expect(result.settlementId).toBe('unique-id');
        expect(result.grossAmount).toBe(999999);
        expect(result.status).toBe('PAID');
    });

    it('formatPeriodLabel: padded months display correctly', () => {
        const label = formatPeriodLabel('2026-01', '2026-09');
        expect(label).toBe('2026-01 ~ 2026-09');
    });

    it('addMonths: month 10, 11, 12 maintain two-digit format', () => {
        expect(addMonths('2026-09', 1)).toBe('2026-10');
        expect(addMonths('2026-10', 1)).toBe('2026-11');
        expect(addMonths('2026-11', 1)).toBe('2026-12');
    });
});
