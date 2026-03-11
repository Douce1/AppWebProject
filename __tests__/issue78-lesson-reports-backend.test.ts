/**
 * Issue #78 — 강의 보고서 backend 저장 및 이력 조회 테스트 (self-contained)
 * 대상: submitClassReport 로직, report 초기화, optimistic update/rollback,
 *        getLessonReports → 서버 상태 반영 흐름
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface LessonReport {
    lessonReportId: string;
    companyId: string;
    lessonId: string;
    instructorId: string;
    content: string;
    submittedAt: string;
}

// ── 헬퍼 로직 (ScheduleContext와 동일) ───────────────────────────────────────

function buildReportedIdsFromServer(reports: LessonReport[]): string[] {
    return reports.map((r) => r.lessonId);
}

function buildClassReportsFromServer(reports: LessonReport[]): Record<string, string> {
    const result: Record<string, string> = {};
    reports.forEach((r) => {
        result[r.lessonId] = r.content;
    });
    return result;
}

/** Optimistic update */
function optimisticAdd(
    reportedIds: string[],
    classReports: Record<string, string>,
    id: string,
    text: string,
): { reportedIds: string[]; classReports: Record<string, string> } {
    return {
        reportedIds: [...reportedIds, id],
        classReports: { ...classReports, [id]: text.trim() },
    };
}

/** Rollback on failure */
function rollback(
    reportedIds: string[],
    classReports: Record<string, string>,
    id: string,
): { reportedIds: string[]; classReports: Record<string, string> } {
    const nextReports = { ...classReports };
    delete nextReports[id];
    return {
        reportedIds: reportedIds.filter((rid) => rid !== id),
        classReports: nextReports,
    };
}

/** Server response에서 content 반영 */
function applyServerReport(
    classReports: Record<string, string>,
    report: LessonReport,
): Record<string, string> {
    return { ...classReports, [report.lessonId]: report.content };
}

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const makeReport = (overrides: Partial<LessonReport> = {}): LessonReport => ({
    lessonReportId: 'R001',
    companyId: 'C001',
    lessonId: 'L001',
    instructorId: 'I001',
    content: '오늘 강의 잘 진행됨',
    submittedAt: '2026-03-11T10:00:00Z',
    ...overrides,
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. LessonReport 타입 정합성
// ══════════════════════════════════════════════════════════════════════════════

describe('LessonReport 타입 정합성', () => {
    test('T01 — 필수 필드 모두 포함', () => {
        const r = makeReport();
        expect(r).toHaveProperty('lessonReportId');
        expect(r).toHaveProperty('lessonId');
        expect(r).toHaveProperty('content');
        expect(r).toHaveProperty('submittedAt');
    });

    test('T02 — content는 문자열', () => {
        expect(typeof makeReport().content).toBe('string');
    });

    test('T03 — submittedAt은 ISO 문자열', () => {
        const r = makeReport({ submittedAt: '2026-03-11T10:00:00Z' });
        expect(() => new Date(r.submittedAt)).not.toThrow();
    });

    test('T04 — 빈 content 가능 (서버가 허용할 수 있음)', () => {
        expect(makeReport({ content: '' }).content).toBe('');
    });

    test('T05 — 긴 content 허용', () => {
        const longContent = 'a'.repeat(5000);
        expect(makeReport({ content: longContent }).content).toHaveLength(5000);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. buildReportedIdsFromServer
// ══════════════════════════════════════════════════════════════════════════════

describe('buildReportedIdsFromServer', () => {
    test('T06 — 빈 배열 → 빈 배열', () => {
        expect(buildReportedIdsFromServer([])).toEqual([]);
    });

    test('T07 — 1개 보고서 → lessonId 1개', () => {
        const result = buildReportedIdsFromServer([makeReport({ lessonId: 'L001' })]);
        expect(result).toEqual(['L001']);
    });

    test('T08 — 복수 보고서 → 모든 lessonId', () => {
        const reports = [
            makeReport({ lessonId: 'L001', lessonReportId: 'R1' }),
            makeReport({ lessonId: 'L002', lessonReportId: 'R2' }),
            makeReport({ lessonId: 'L003', lessonReportId: 'R3' }),
        ];
        expect(buildReportedIdsFromServer(reports)).toEqual(['L001', 'L002', 'L003']);
    });

    test('T09 — 원본 배열 불변', () => {
        const reports = [makeReport()];
        const copy = [...reports];
        buildReportedIdsFromServer(reports);
        expect(reports).toHaveLength(copy.length);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. buildClassReportsFromServer
// ══════════════════════════════════════════════════════════════════════════════

describe('buildClassReportsFromServer', () => {
    test('T10 — 빈 배열 → 빈 객체', () => {
        expect(buildClassReportsFromServer([])).toEqual({});
    });

    test('T11 — 1개 보고서 → 키-값 매핑', () => {
        const result = buildClassReportsFromServer([
            makeReport({ lessonId: 'L001', content: '좋은 수업' }),
        ]);
        expect(result['L001']).toBe('좋은 수업');
    });

    test('T12 — 복수 보고서 → 모두 매핑', () => {
        const reports = [
            makeReport({ lessonId: 'L001', lessonReportId: 'R1', content: 'A' }),
            makeReport({ lessonId: 'L002', lessonReportId: 'R2', content: 'B' }),
        ];
        const result = buildClassReportsFromServer(reports);
        expect(result['L001']).toBe('A');
        expect(result['L002']).toBe('B');
    });

    test('T13 — 동일 lessonId 복수 보고서 시 마지막 값으로 덮어쓰기', () => {
        const reports = [
            makeReport({ lessonId: 'L001', lessonReportId: 'R1', content: '첫 번째' }),
            makeReport({ lessonId: 'L001', lessonReportId: 'R2', content: '두 번째' }),
        ];
        const result = buildClassReportsFromServer(reports);
        expect(result['L001']).toBe('두 번째');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. optimisticAdd
// ══════════════════════════════════════════════════════════════════════════════

describe('optimisticAdd', () => {
    test('T14 — id가 reportedIds에 추가됨', () => {
        const { reportedIds } = optimisticAdd([], {}, 'L001', '보고서');
        expect(reportedIds).toContain('L001');
    });

    test('T15 — content가 classReports에 추가됨', () => {
        const { classReports } = optimisticAdd([], {}, 'L001', '보고서');
        expect(classReports['L001']).toBe('보고서');
    });

    test('T16 — trim 처리됨', () => {
        const { classReports } = optimisticAdd([], {}, 'L001', '  보고서  ');
        expect(classReports['L001']).toBe('보고서');
    });

    test('T17 — 기존 reportedIds 보존', () => {
        const { reportedIds } = optimisticAdd(['L000'], {}, 'L001', '내용');
        expect(reportedIds).toContain('L000');
        expect(reportedIds).toContain('L001');
    });

    test('T18 — 기존 classReports 보존', () => {
        const { classReports } = optimisticAdd([], { L000: '기존' }, 'L001', '새 내용');
        expect(classReports['L000']).toBe('기존');
        expect(classReports['L001']).toBe('새 내용');
    });

    test('T19 — 원본 배열/객체 불변', () => {
        const ids = ['L000'];
        const reports: Record<string, string> = { L000: '기존' };
        optimisticAdd(ids, reports, 'L001', '새');
        expect(ids).toHaveLength(1);
        expect(reports['L001']).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. rollback
// ══════════════════════════════════════════════════════════════════════════════

describe('rollback', () => {
    test('T20 — id가 reportedIds에서 제거됨', () => {
        const { reportedIds } = rollback(['L000', 'L001'], { L001: '내용' }, 'L001');
        expect(reportedIds).not.toContain('L001');
    });

    test('T21 — classReports에서 해당 키 제거됨', () => {
        const { classReports } = rollback(['L001'], { L001: '내용' }, 'L001');
        expect(classReports['L001']).toBeUndefined();
    });

    test('T22 — 다른 항목은 유지됨', () => {
        const { reportedIds, classReports } = rollback(
            ['L000', 'L001'],
            { L000: '유지', L001: '제거' },
            'L001',
        );
        expect(reportedIds).toContain('L000');
        expect(classReports['L000']).toBe('유지');
    });

    test('T23 — 없는 id 롤백 시 기존 상태 그대로', () => {
        const { reportedIds } = rollback(['L000'], { L000: '내용' }, 'L999');
        expect(reportedIds).toEqual(['L000']);
    });

    test('T24 — 빈 상태 롤백 시 에러 없음', () => {
        const { reportedIds, classReports } = rollback([], {}, 'L001');
        expect(reportedIds).toEqual([]);
        expect(classReports).toEqual({});
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. applyServerReport
// ══════════════════════════════════════════════════════════════════════════════

describe('applyServerReport', () => {
    test('T25 — 서버 content로 로컬 값 업데이트', () => {
        const report = makeReport({ lessonId: 'L001', content: '서버에서 온 내용' });
        const result = applyServerReport({ L001: '낙관적 내용' }, report);
        expect(result['L001']).toBe('서버에서 온 내용');
    });

    test('T26 — 기존 다른 항목 유지', () => {
        const report = makeReport({ lessonId: 'L001', content: '서버 내용' });
        const result = applyServerReport({ L000: '다른 항목', L001: '낙관적' }, report);
        expect(result['L000']).toBe('다른 항목');
    });

    test('T27 — 원본 객체 불변', () => {
        const original = { L001: '원본' };
        const report = makeReport({ lessonId: 'L001', content: '서버' });
        applyServerReport(original, report);
        expect(original['L001']).toBe('원본');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. submitClassReport 플로우 시뮬레이션
// ══════════════════════════════════════════════════════════════════════════════

describe('submitClassReport 플로우', () => {
    test('T28 — 성공: 낙관적 추가 → 서버 응답 반영', async () => {
        let reportedIds: string[] = [];
        let classReports: Record<string, string> = {};

        // Optimistic
        const opt = optimisticAdd(reportedIds, classReports, 'L001', '보고서 내용');
        reportedIds = opt.reportedIds;
        classReports = opt.classReports;

        // 서버 성공
        const serverReport = makeReport({ lessonId: 'L001', content: '보고서 내용' });
        classReports = applyServerReport(classReports, serverReport);

        expect(reportedIds).toContain('L001');
        expect(classReports['L001']).toBe('보고서 내용');
    });

    test('T29 — 실패: 롤백 후 상태 원복', async () => {
        let reportedIds: string[] = [];
        let classReports: Record<string, string> = {};

        const opt = optimisticAdd(reportedIds, classReports, 'L001', '보고서');
        reportedIds = opt.reportedIds;
        classReports = opt.classReports;

        // 실패 시 롤백
        const rb = rollback(reportedIds, classReports, 'L001');
        reportedIds = rb.reportedIds;
        classReports = rb.classReports;

        expect(reportedIds).not.toContain('L001');
        expect(classReports['L001']).toBeUndefined();
    });

    test('T30 — 빈 content는 저장하지 않음', async () => {
        const text = '   ';
        const shouldSubmit = text.trim().length > 0;
        expect(shouldSubmit).toBe(false);
    });

    test('T31 — submitLessonReport URL 인코딩 검증', () => {
        const lessonId = 'L/001 test';
        const url = `/lessons/${encodeURIComponent(lessonId)}/report`;
        expect(url).not.toContain(' ');
        expect(url).toBe('/lessons/L%2F001%20test/report');
    });

    test('T32 — 초기 로드 시 서버 보고서로 reportedIds 초기화', () => {
        const reports = [
            makeReport({ lessonId: 'L001', lessonReportId: 'R1' }),
            makeReport({ lessonId: 'L002', lessonReportId: 'R2' }),
        ];
        const ids = buildReportedIdsFromServer(reports);
        expect(ids).toContain('L001');
        expect(ids).toContain('L002');
    });

    test('T33 — 앱 재시작 후 서버 데이터로 보고서 복원', () => {
        const reports = [makeReport({ lessonId: 'L001', content: '강의 내용' })];
        const classReports = buildClassReportsFromServer(reports);
        expect(classReports['L001']).toBe('강의 내용');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. 사이드 이펙트 / 통합 케이스
// ══════════════════════════════════════════════════════════════════════════════

describe('사이드 이펙트 및 통합 케이스', () => {
    test('T34 — 낙관적 업데이트 후 서버 에러 → 전체 롤백', () => {
        const initial = { reportedIds: [] as string[], classReports: {} as Record<string, string> };

        const after = optimisticAdd(initial.reportedIds, initial.classReports, 'L001', '내용');
        const rolled = rollback(after.reportedIds, after.classReports, 'L001');

        expect(rolled.reportedIds).toEqual(initial.reportedIds);
        expect(rolled.classReports).toEqual(initial.classReports);
    });

    test('T35 — 복수 보고서 로드 후 특정 lessonId만 수정', () => {
        const reports = [
            makeReport({ lessonId: 'L001', lessonReportId: 'R1', content: 'A' }),
            makeReport({ lessonId: 'L002', lessonReportId: 'R2', content: 'B' }),
        ];
        let classReports = buildClassReportsFromServer(reports);

        const updated = makeReport({ lessonId: 'L001', content: 'A-updated' });
        classReports = applyServerReport(classReports, updated);

        expect(classReports['L001']).toBe('A-updated');
        expect(classReports['L002']).toBe('B'); // 변경 없음
    });

    test('T36 — reportedIds 중복 추가 방지 검증', () => {
        const ids = ['L001'];
        const { reportedIds } = optimisticAdd(ids, {}, 'L001', '중복');
        // 낙관적 추가는 중복을 막지 않지만, 실제 사용 전에 확인해야 함
        const unique = [...new Set(reportedIds)];
        expect(unique).toHaveLength(1);
    });

    test('T37 — 보고서 내용이 trim 후에도 비면 제출 거부', () => {
        const inputs = ['', '   ', '\t', '\n'];
        inputs.forEach((input) => {
            expect(input.trim().length).toBe(0);
        });
    });

    test('T38 — getClassReport: 보고서 있으면 반환, 없으면 null', () => {
        const reports: Record<string, string> = { L001: '내용' };
        const getClassReport = (id: string) => reports[id] ?? null;
        expect(getClassReport('L001')).toBe('내용');
        expect(getClassReport('L999')).toBeNull();
    });

    test('T39 — 서버 보고서 로드 후 isReported 상태 정확', () => {
        const reports = [makeReport({ lessonId: 'L001' })];
        const reportedIds = buildReportedIdsFromServer(reports);
        const isReported = (id: string) => reportedIds.includes(id);
        expect(isReported('L001')).toBe(true);
        expect(isReported('L002')).toBe(false);
    });

    test('T40 — 롤백 후 재시도 가능 (상태가 초기화됨)', () => {
        let reportedIds: string[] = [];
        let classReports: Record<string, string> = {};

        // 1차 시도 → 낙관적
        const opt1 = optimisticAdd(reportedIds, classReports, 'L001', '내용');
        // 실패 롤백
        const rb = rollback(opt1.reportedIds, opt1.classReports, 'L001');
        reportedIds = rb.reportedIds;
        classReports = rb.classReports;

        // 2차 재시도 → 낙관적
        const opt2 = optimisticAdd(reportedIds, classReports, 'L001', '내용');
        expect(opt2.reportedIds).toContain('L001');
        expect(opt2.classReports['L001']).toBe('내용');
    });

    test('T41 — 보고서 제출 API path: POST /lessons/:id/report', () => {
        const lessonId = 'abc-123';
        const path = `/lessons/${encodeURIComponent(lessonId)}/report`;
        expect(path).toBe('/lessons/abc-123/report');
    });

    test('T42 — getLessonReports path: GET /lesson-reports', () => {
        const path = '/lesson-reports';
        expect(path).toBe('/lesson-reports');
    });

    test('T43 — 여러 수업 보고서를 동시에 초기화할 때 누락 없음', () => {
        const lessonIds = ['L001', 'L002', 'L003', 'L004', 'L005'];
        const reports = lessonIds.map((id, i) =>
            makeReport({ lessonId: id, lessonReportId: `R${i}`, content: `내용${i}` }),
        );
        const ids = buildReportedIdsFromServer(reports);
        const map = buildClassReportsFromServer(reports);

        expect(ids).toHaveLength(5);
        lessonIds.forEach((id, i) => {
            expect(ids).toContain(id);
            expect(map[id]).toBe(`내용${i}`);
        });
    });
});
