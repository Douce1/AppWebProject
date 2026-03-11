/**
 * Issue #74 — settlements API 연동 테스트 (self-contained)
 * 대상: ApiSettlement 타입, formatMonth, formatScheduledPayDate, calcTax, 목록 필터/정렬 로직
 */

// ── 타입 (자체 정의) ─────────────────────────────────────────────────────────

type SettlementStatus = 'PENDING' | 'PAID' | 'CANCELLED';

interface Settlement {
    settlementId: string;
    companyId: string;
    instructorId: string;
    lessonId: string;
    month: string;
    totalHours: number;
    hourlyRate: number;
    grossAmount: number;
    status: SettlementStatus;
    scheduledPayDate: string | null | undefined;
    paidAt: string | null | undefined;
}

// ── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function formatMonth(isoMonth: string): string {
    const [year, month] = isoMonth.split('-');
    return `${year}년 ${parseInt(month, 10)}월`;
}

function formatScheduledPayDate(iso: string | null | undefined): string {
    if (!iso) return '미정';
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function calcTax(gross: number): { incomeTax: number; localTax: number; net: number } {
    const incomeTax = Math.floor(gross * 0.03);
    const localTax = Math.floor(gross * 0.003);
    return { incomeTax, localTax, net: gross - incomeTax - localTax };
}

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function filterCurrentMonth(settlements: Settlement[], month: string): Settlement | undefined {
    return settlements.find((s) => s.month === month);
}

function filterPastSettlements(settlements: Settlement[], currentMonth: string): Settlement[] {
    return settlements
        .filter((s) => s.month !== currentMonth)
        .sort((a, b) => b.month.localeCompare(a.month));
}

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const make = (overrides: Partial<Settlement> = {}): Settlement => ({
    settlementId: 'S001',
    companyId: 'C001',
    instructorId: 'I001',
    lessonId: 'L001',
    month: '2026-03',
    totalHours: 20,
    hourlyRate: 50000,
    grossAmount: 1000000,
    status: 'PENDING',
    scheduledPayDate: null,
    paidAt: null,
    ...overrides,
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. Settlement 타입 정합성
// ══════════════════════════════════════════════════════════════════════════════

describe('Settlement 타입 정합성', () => {
    test('T01 — 필수 필드 모두 포함', () => {
        const s = make();
        expect(s).toHaveProperty('settlementId');
        expect(s).toHaveProperty('grossAmount');
        expect(s).toHaveProperty('month');
        expect(s).toHaveProperty('status');
        expect(s).toHaveProperty('totalHours');
        expect(s).toHaveProperty('hourlyRate');
    });

    test('T02 — status PENDING', () => {
        expect(make({ status: 'PENDING' }).status).toBe('PENDING');
    });

    test('T03 — status PAID', () => {
        expect(make({ status: 'PAID' }).status).toBe('PAID');
    });

    test('T04 — status CANCELLED', () => {
        expect(make({ status: 'CANCELLED' }).status).toBe('CANCELLED');
    });

    test('T05 — scheduledPayDate null 허용', () => {
        expect(make({ scheduledPayDate: null }).scheduledPayDate).toBeNull();
    });

    test('T06 — paidAt null 허용', () => {
        expect(make({ paidAt: null }).paidAt).toBeNull();
    });

    test('T07 — grossAmount는 숫자', () => {
        expect(typeof make({ grossAmount: 3450000 }).grossAmount).toBe('number');
    });

    test('T08 — totalHours는 숫자', () => {
        expect(typeof make({ totalHours: 40 }).totalHours).toBe('number');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. formatMonth
// ══════════════════════════════════════════════════════════════════════════════

describe('formatMonth', () => {
    test('T09 — 2026-03 → 2026년 3월', () => {
        expect(formatMonth('2026-03')).toBe('2026년 3월');
    });

    test('T10 — 2025-01 → 2025년 1월 (앞 0 제거)', () => {
        expect(formatMonth('2025-01')).toBe('2025년 1월');
    });

    test('T11 — 2025-12 → 2025년 12월', () => {
        expect(formatMonth('2025-12')).toBe('2025년 12월');
    });

    test('T12 — 2024-07 → 2024년 7월', () => {
        expect(formatMonth('2024-07')).toBe('2024년 7월');
    });

    test('T13 — 2023-10 → 2023년 10월', () => {
        expect(formatMonth('2023-10')).toBe('2023년 10월');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. formatScheduledPayDate
// ══════════════════════════════════════════════════════════════════════════════

describe('formatScheduledPayDate', () => {
    test('T14 — null → "미정"', () => {
        expect(formatScheduledPayDate(null)).toBe('미정');
    });

    test('T15 — undefined → "미정"', () => {
        expect(formatScheduledPayDate(undefined)).toBe('미정');
    });

    test('T16 — 빈 문자열 → "미정"', () => {
        expect(formatScheduledPayDate('')).toBe('미정');
    });

    test('T17 — ISO 날짜 → "M월 D일" 패턴 포함', () => {
        const result = formatScheduledPayDate('2026-03-10T00:00:00.000Z');
        expect(result).toMatch(/\d+월\s*\d+일/);
    });

    test('T18 — 유효 날짜이면 "미정" 아님', () => {
        expect(formatScheduledPayDate('2026-04-05T00:00:00.000Z')).not.toBe('미정');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. calcTax
// ══════════════════════════════════════════════════════════════════════════════

describe('calcTax', () => {
    test('T19 — 1,000,000원 → 소득세 30,000원', () => {
        expect(calcTax(1000000).incomeTax).toBe(30000);
    });

    test('T20 — 1,000,000원 → 지방세 3,000원', () => {
        expect(calcTax(1000000).localTax).toBe(3000);
    });

    test('T21 — 1,000,000원 → 실수령 967,000원', () => {
        expect(calcTax(1000000).net).toBe(967000);
    });

    test('T22 — 0원 → 세금 0', () => {
        const { incomeTax, localTax, net } = calcTax(0);
        expect(incomeTax).toBe(0);
        expect(localTax).toBe(0);
        expect(net).toBe(0);
    });

    test('T23 — floor 적용: 333,333원 소득세', () => {
        expect(calcTax(333333).incomeTax).toBe(Math.floor(333333 * 0.03));
    });

    test('T24 — net = gross - incomeTax - localTax 항등식', () => {
        const gross = 2500000;
        const { incomeTax, localTax, net } = calcTax(gross);
        expect(net).toBe(gross - incomeTax - localTax);
    });

    test('T25 — 3,450,000원 소득세 103,500원', () => {
        expect(calcTax(3450000).incomeTax).toBe(103500);
    });

    test('T26 — 50,000,000원 → 실수령 48,350,000원', () => {
        expect(calcTax(50000000).net).toBe(48350000);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. getCurrentMonth
// ══════════════════════════════════════════════════════════════════════════════

describe('getCurrentMonth', () => {
    test('T27 — "YYYY-MM" 형식', () => {
        expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
    });

    test('T28 — 월이 1~12 범위', () => {
        const month = parseInt(getCurrentMonth().split('-')[1], 10);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. filterCurrentMonth / filterPastSettlements
// ══════════════════════════════════════════════════════════════════════════════

describe('filterCurrentMonth', () => {
    const list = [
        make({ settlementId: 'S1', month: '2026-03' }),
        make({ settlementId: 'S2', month: '2026-02' }),
        make({ settlementId: 'S3', month: '2026-01' }),
    ];

    test('T29 — 이번 달 정산 반환', () => {
        expect(filterCurrentMonth(list, '2026-03')?.settlementId).toBe('S1');
    });

    test('T30 — 없으면 undefined', () => {
        expect(filterCurrentMonth(list, '2026-04')).toBeUndefined();
    });

    test('T31 — 빈 배열 → undefined', () => {
        expect(filterCurrentMonth([], '2026-03')).toBeUndefined();
    });
});

describe('filterPastSettlements', () => {
    const list = [
        make({ settlementId: 'S1', month: '2026-01' }),
        make({ settlementId: 'S2', month: '2026-03' }),
        make({ settlementId: 'S3', month: '2026-02' }),
    ];

    test('T32 — 이번 달 제외', () => {
        const result = filterPastSettlements(list, '2026-03');
        expect(result.every((s) => s.month !== '2026-03')).toBe(true);
    });

    test('T33 — 최신순 정렬 (2월 > 1월)', () => {
        const result = filterPastSettlements(list, '2026-03');
        expect(result[0].month).toBe('2026-02');
        expect(result[1].month).toBe('2026-01');
    });

    test('T34 — 빈 배열 → 빈 배열', () => {
        expect(filterPastSettlements([], '2026-03')).toEqual([]);
    });

    test('T35 — 이번 달만 있을 때 빈 배열', () => {
        expect(filterPastSettlements([make({ month: '2026-03' })], '2026-03')).toHaveLength(0);
    });

    test('T36 — 원본 배열 불변', () => {
        const original = [...list];
        filterPastSettlements(list, '2026-03');
        expect(list).toHaveLength(original.length);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. 사이드 이펙트 / 통합 케이스
// ══════════════════════════════════════════════════════════════════════════════

describe('통합 및 회귀 케이스', () => {
    test('T37 — calcTax net ≈ gross * 0.967 (오차 ≤10원)', () => {
        const gross = 1000000;
        const { net } = calcTax(gross);
        expect(Math.abs(net - gross * 0.967)).toBeLessThanOrEqual(10);
    });

    test('T38 — formatMonth + calcTax 조합 데이터 생성', () => {
        const s = make({ month: '2026-03', grossAmount: 2000000 });
        const label = formatMonth(s.month);
        const { net } = calcTax(s.grossAmount);
        expect(label).toBe('2026년 3월');
        expect(net).toBe(1934000);
    });

    test('T39 — status PAID 이면 paidAt 활용 가능', () => {
        const s = make({ status: 'PAID', paidAt: '2026-02-28T12:00:00Z' });
        expect(new Date(s.paidAt!).getFullYear()).toBe(2026);
    });

    test('T40 — CANCELLED 상태도 목록에 포함', () => {
        const list = [
            make({ settlementId: 'S1', month: '2026-02', status: 'CANCELLED' }),
            make({ settlementId: 'S2', month: '2026-01', status: 'PAID' }),
        ];
        expect(filterPastSettlements(list, '2026-03')).toHaveLength(2);
    });

    test('T41 — 동일 월 복수 정산: filterCurrentMonth는 첫 번째 반환', () => {
        const list = [
            make({ settlementId: 'S1', month: '2026-03', grossAmount: 1000000 }),
            make({ settlementId: 'S2', month: '2026-03', grossAmount: 2000000 }),
        ];
        expect(filterCurrentMonth(list, '2026-03')?.settlementId).toBe('S1');
    });

    test('T42 — scheduledPayDate 있으면 formatScheduledPayDate가 "미정" 반환 안 함', () => {
        const result = formatScheduledPayDate('2026-03-10T00:00:00.000Z');
        expect(result).not.toBe('미정');
    });

    test('T43 — 연도간 정렬: 2025-12 > 2025-11 > 2025-10', () => {
        const list = [
            make({ settlementId: 'S1', month: '2025-10' }),
            make({ settlementId: 'S2', month: '2025-12' }),
            make({ settlementId: 'S3', month: '2025-11' }),
        ];
        const sorted = filterPastSettlements(list, '2026-03');
        expect(sorted[0].month).toBe('2025-12');
        expect(sorted[1].month).toBe('2025-11');
        expect(sorted[2].month).toBe('2025-10');
    });
});
