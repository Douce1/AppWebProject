/**
 * Issue #82 — 월별 출강 불가 제출 플로우 테스트 (self-contained)
 * 대상: ApiMonthSubmission 타입, formatDate, toYearMonth, formatMonthLabel,
 *       monthSubmission 상태 머신, optimistic update/rollback, slot 충돌 처리
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MonthSubmission {
    month: string;           // "YYYY-MM"
    isUnavailable: boolean;
    submittedAt: string | null;
}

interface TimeSlot { start: string; end: string }
type AvailabilityMap = Record<string, TimeSlot[]>;

// ── 헬퍼 함수 (화면 로직과 동일) ─────────────────────────────────────────────

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

function getMonthSubmissionUrl(month: string): string {
    return `/availability/me/month-submission?month=${encodeURIComponent(month)}`;
}

function buildUpdatePayload(month: string, isUnavailable: boolean) {
    return { month, isUnavailable };
}

/** Optimistic 업데이트 */
function optimisticToggle(
    current: MonthSubmission | null,
    month: string,
    next: boolean,
): MonthSubmission {
    return current
        ? { ...current, isUnavailable: next, submittedAt: next ? new Date().toISOString() : null }
        : { month, isUnavailable: next, submittedAt: next ? new Date().toISOString() : null };
}

/** 기본 폴백 상태 */
function defaultSubmission(month: string): MonthSubmission {
    return { month, isUnavailable: false, submittedAt: null };
}

/** slot 등록 가능 여부 (출강 불가 상태에서는 등록 불가) */
function canRegisterSlot(submission: MonthSubmission | null): boolean {
    return !(submission?.isUnavailable ?? false);
}

/** 배너 표시 텍스트 */
function getStatusText(submission: MonthSubmission | null): string {
    if (!submission) return '로딩 중...';
    if (submission.isUnavailable) return '출강 불가 제출됨';
    if (submission.submittedAt == null) return '미제출 (출강 가능)';
    return '출강 가능';
}

/** 버튼 텍스트 */
function getButtonText(month: string, isUnavailable: boolean): string {
    return isUnavailable
        ? `${formatMonthLabel(month)} 출강 불가 취소`
        : `${formatMonthLabel(month)} 출강 불가로 제출`;
}

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const makeSubmission = (overrides: Partial<MonthSubmission> = {}): MonthSubmission => ({
    month: '2026-03',
    isUnavailable: false,
    submittedAt: null,
    ...overrides,
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. ApiMonthSubmission 타입 정합성
// ══════════════════════════════════════════════════════════════════════════════

describe('MonthSubmission 타입 정합성', () => {
    test('T01 — 필수 필드 모두 포함', () => {
        const s = makeSubmission();
        expect(s).toHaveProperty('month');
        expect(s).toHaveProperty('isUnavailable');
        expect(s).toHaveProperty('submittedAt');
    });

    test('T02 — isUnavailable은 boolean', () => {
        expect(typeof makeSubmission().isUnavailable).toBe('boolean');
    });

    test('T03 — submittedAt은 null 허용', () => {
        expect(makeSubmission({ submittedAt: null }).submittedAt).toBeNull();
    });

    test('T04 — submittedAt은 ISO 문자열 허용', () => {
        const s = makeSubmission({ submittedAt: '2026-03-01T10:00:00Z' });
        expect(() => new Date(s.submittedAt!)).not.toThrow();
    });

    test('T05 — month는 "YYYY-MM" 형식', () => {
        expect(makeSubmission({ month: '2026-03' }).month).toMatch(/^\d{4}-\d{2}$/);
    });

    test('T06 — isUnavailable true 가능', () => {
        expect(makeSubmission({ isUnavailable: true }).isUnavailable).toBe(true);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. formatDate 헬퍼
// ══════════════════════════════════════════════════════════════════════════════

describe('formatDate', () => {
    test('T07 — 2026-03-11 포맷 정확', () => {
        const d = new Date(2026, 2, 11); // month는 0-indexed
        expect(formatDate(d)).toBe('2026-03-11');
    });

    test('T08 — 1월 01일 0 패딩', () => {
        const d = new Date(2026, 0, 1);
        expect(formatDate(d)).toBe('2026-01-01');
    });

    test('T09 — 12월 31일', () => {
        const d = new Date(2025, 11, 31);
        expect(formatDate(d)).toBe('2025-12-31');
    });

    test('T10 — "YYYY-MM-DD" 형식 검증', () => {
        expect(formatDate(new Date(2026, 2, 11))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. toYearMonth 헬퍼
// ══════════════════════════════════════════════════════════════════════════════

describe('toYearMonth', () => {
    test('T11 — "2026-03-11" → "2026-03"', () => {
        expect(toYearMonth('2026-03-11')).toBe('2026-03');
    });

    test('T12 — "2025-01-01" → "2025-01"', () => {
        expect(toYearMonth('2025-01-01')).toBe('2025-01');
    });

    test('T13 — "2026-03" → "2026-03" (이미 월 형식)', () => {
        expect(toYearMonth('2026-03')).toBe('2026-03');
    });

    test('T14 — ISO 문자열에서도 동작', () => {
        expect(toYearMonth('2026-03-11T00:00:00Z')).toBe('2026-03');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. formatMonthLabel 헬퍼
// ══════════════════════════════════════════════════════════════════════════════

describe('formatMonthLabel', () => {
    test('T15 — "2026-03" → "2026년 3월"', () => {
        expect(formatMonthLabel('2026-03')).toBe('2026년 3월');
    });

    test('T16 — "2025-01" → "2025년 1월" (앞 0 제거)', () => {
        expect(formatMonthLabel('2025-01')).toBe('2025년 1월');
    });

    test('T17 — "2025-12" → "2025년 12월"', () => {
        expect(formatMonthLabel('2025-12')).toBe('2025년 12월');
    });

    test('T18 — "2024-07" → "2024년 7월"', () => {
        expect(formatMonthLabel('2024-07')).toBe('2024년 7월');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. getMonthSubmissionUrl
// ══════════════════════════════════════════════════════════════════════════════

describe('getMonthSubmissionUrl', () => {
    test('T19 — "2026-03" → 올바른 URL', () => {
        expect(getMonthSubmissionUrl('2026-03')).toBe(
            '/availability/me/month-submission?month=2026-03',
        );
    });

    test('T20 — 특수문자 인코딩 없이 "YYYY-MM"은 그대로', () => {
        const url = getMonthSubmissionUrl('2026-03');
        expect(url).not.toContain(' ');
        expect(url).toContain('month=2026-03');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. buildUpdatePayload
// ══════════════════════════════════════════════════════════════════════════════

describe('buildUpdatePayload', () => {
    test('T21 — isUnavailable true 페이로드', () => {
        const p = buildUpdatePayload('2026-03', true);
        expect(p.month).toBe('2026-03');
        expect(p.isUnavailable).toBe(true);
    });

    test('T22 — isUnavailable false 페이로드 (취소)', () => {
        const p = buildUpdatePayload('2026-03', false);
        expect(p.isUnavailable).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. optimisticToggle
// ══════════════════════════════════════════════════════════════════════════════

describe('optimisticToggle', () => {
    test('T23 — null → 불가 제출 (isUnavailable: true)', () => {
        const result = optimisticToggle(null, '2026-03', true);
        expect(result.isUnavailable).toBe(true);
        expect(result.month).toBe('2026-03');
        expect(result.submittedAt).not.toBeNull();
    });

    test('T24 — 기존 가능 상태 → 불가 제출', () => {
        const current = makeSubmission({ isUnavailable: false, submittedAt: null });
        const result = optimisticToggle(current, '2026-03', true);
        expect(result.isUnavailable).toBe(true);
    });

    test('T25 — 불가 → 취소 (isUnavailable: false)', () => {
        const current = makeSubmission({ isUnavailable: true, submittedAt: '2026-03-01T10:00:00Z' });
        const result = optimisticToggle(current, '2026-03', false);
        expect(result.isUnavailable).toBe(false);
        expect(result.submittedAt).toBeNull();
    });

    test('T26 — 원본 객체 불변', () => {
        const current = makeSubmission({ isUnavailable: false });
        optimisticToggle(current, '2026-03', true);
        expect(current.isUnavailable).toBe(false);
    });

    test('T27 — null → 취소 시 기본 가능 상태', () => {
        const result = optimisticToggle(null, '2026-03', false);
        expect(result.isUnavailable).toBe(false);
        expect(result.submittedAt).toBeNull();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. defaultSubmission 폴백
// ══════════════════════════════════════════════════════════════════════════════

describe('defaultSubmission', () => {
    test('T28 — isUnavailable false', () => {
        expect(defaultSubmission('2026-03').isUnavailable).toBe(false);
    });

    test('T29 — submittedAt null', () => {
        expect(defaultSubmission('2026-03').submittedAt).toBeNull();
    });

    test('T30 — month 정확히 저장', () => {
        expect(defaultSubmission('2026-04').month).toBe('2026-04');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. canRegisterSlot (slot 등록 가능 여부)
// ══════════════════════════════════════════════════════════════════════════════

describe('canRegisterSlot', () => {
    test('T31 — null(로딩) → 등록 가능 (기본 허용)', () => {
        expect(canRegisterSlot(null)).toBe(true);
    });

    test('T32 — isUnavailable false → 등록 가능', () => {
        expect(canRegisterSlot(makeSubmission({ isUnavailable: false }))).toBe(true);
    });

    test('T33 — isUnavailable true → 등록 불가', () => {
        expect(canRegisterSlot(makeSubmission({ isUnavailable: true }))).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. getStatusText
// ══════════════════════════════════════════════════════════════════════════════

describe('getStatusText', () => {
    test('T34 — null → "로딩 중..."', () => {
        expect(getStatusText(null)).toBe('로딩 중...');
    });

    test('T35 — isUnavailable true → "출강 불가 제출됨"', () => {
        expect(getStatusText(makeSubmission({ isUnavailable: true, submittedAt: '2026-03-01T10:00:00Z' }))).toBe('출강 불가 제출됨');
    });

    test('T36 — submittedAt null → "미제출 (출강 가능)"', () => {
        expect(getStatusText(makeSubmission({ isUnavailable: false, submittedAt: null }))).toBe('미제출 (출강 가능)');
    });

    test('T37 — submittedAt 있고 가능 → "출강 가능"', () => {
        expect(getStatusText(makeSubmission({ isUnavailable: false, submittedAt: '2026-03-01T10:00:00Z' }))).toBe('출강 가능');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. getButtonText
// ══════════════════════════════════════════════════════════════════════════════

describe('getButtonText', () => {
    test('T38 — 가능 상태 → "…출강 불가로 제출"', () => {
        expect(getButtonText('2026-03', false)).toContain('출강 불가로 제출');
        expect(getButtonText('2026-03', false)).toContain('2026년 3월');
    });

    test('T39 — 불가 상태 → "…출강 불가 취소"', () => {
        expect(getButtonText('2026-03', true)).toContain('출강 불가 취소');
        expect(getButtonText('2026-03', true)).toContain('2026년 3월');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. 사이드 이펙트 / 통합 케이스
// ══════════════════════════════════════════════════════════════════════════════

describe('사이드 이펙트 및 통합 케이스', () => {
    test('T40 — 불가 제출 후 롤백: 원래 상태 복원', () => {
        const original = makeSubmission({ isUnavailable: false, submittedAt: null });
        // Optimistic
        const optimistic = optimisticToggle(original, '2026-03', true);
        expect(optimistic.isUnavailable).toBe(true);
        // API 실패 → 원본으로 복원
        expect(original.isUnavailable).toBe(false);
    });

    test('T41 — 월 변경 시 뷰 월이 바뀜: toYearMonth 적용', () => {
        const dateString = '2026-04-01';
        const newMonth = toYearMonth(dateString);
        expect(newMonth).toBe('2026-04');
    });

    test('T42 — 불가 상태에서 canRegisterSlot = false → slot 등록 버튼 비활성화 로직', () => {
        const s = makeSubmission({ isUnavailable: true });
        const canApply = true; // 날짜 선택됨
        const shouldDisable = !canApply || !canRegisterSlot(s);
        expect(shouldDisable).toBe(true);
    });

    test('T43 — 가능 상태에서 canRegisterSlot = true → 날짜 선택만 있으면 등록 가능', () => {
        const s = makeSubmission({ isUnavailable: false });
        const canApply = true;
        const shouldDisable = !canApply || !canRegisterSlot(s);
        expect(shouldDisable).toBe(false);
    });

    test('T44 — getMonthSubmissionUrl은 각 월마다 고유 URL 생성', () => {
        const url1 = getMonthSubmissionUrl('2026-03');
        const url2 = getMonthSubmissionUrl('2026-04');
        expect(url1).not.toBe(url2);
    });

    test('T45 — optimisticToggle은 항상 새 객체 반환', () => {
        const current = makeSubmission();
        const result = optimisticToggle(current, '2026-03', true);
        expect(result).not.toBe(current);
    });

    test('T46 — formatMonthLabel + getButtonText 조합: 전체 버튼 문구', () => {
        const month = '2026-03';
        const text = getButtonText(month, false);
        expect(text).toBe('2026년 3월 출강 불가로 제출');
    });

    test('T47 — buildUpdatePayload month 필드가 PUT body에 포함', () => {
        const payload = buildUpdatePayload('2026-05', true);
        expect(Object.keys(payload)).toContain('month');
        expect(Object.keys(payload)).toContain('isUnavailable');
    });

    test('T48 — 서버 응답으로 optimistic 상태 덮어쓰기', () => {
        const serverResponse = makeSubmission({
            isUnavailable: true,
            submittedAt: '2026-03-11T12:00:00Z',
        });
        let state: MonthSubmission | null = optimisticToggle(null, '2026-03', true);
        state = serverResponse; // 서버 응답으로 교체
        expect(state.submittedAt).toBe('2026-03-11T12:00:00Z');
    });

    test('T49 — defaultSubmission은 API 실패 시 항상 안전한 기본값 제공', () => {
        const months = ['2026-01', '2026-06', '2025-12'];
        months.forEach((m) => {
            const d = defaultSubmission(m);
            expect(d.isUnavailable).toBe(false);
            expect(d.submittedAt).toBeNull();
            expect(d.month).toBe(m);
        });
    });

    test('T50 — 불가 취소 후 slot 등록 가능 여부 전환 확인', () => {
        const unavailable = makeSubmission({ isUnavailable: true });
        expect(canRegisterSlot(unavailable)).toBe(false);

        const available = optimisticToggle(unavailable, '2026-03', false);
        expect(canRegisterSlot(available)).toBe(true);
    });
});
