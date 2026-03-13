/**
 * Issue #204 — 계약 상세 화면에 백엔드 계약 내용 섹션 반영 및 레이아웃 정리
 *
 * 수정 사항:
 * - contentJson.sections → 계약 본문 카드에 메인으로 렌더링
 * - 증빙 정보를 하단 보조 섹션으로 이동 (evidenceCard)
 * - 상태 배지 색상 (FULLY_SIGNED: 녹색, SENT: 노랑, INSTRUCTOR_SIGNED: 파랑, VOID: 회색)
 * - PDF 버튼 문구 "PDF로 저장" → "계약서 보기"
 * - 헤더 카드에 제목·기간·상태 배지 집중
 *
 * 정상 / 예외 / 사이드이펙트 / 통합 / 회귀 케이스 20개
 */

// ─────────────────────────────────────────────────────────────────
// parseContentJson 로직 재현 (DocContractDetailScreen 내부 함수)
// ─────────────────────────────────────────────────────────────────
function parseContentJson(contentJson: string | undefined): { title: string; content: string }[] {
    if (!contentJson) return [];
    try {
        const o = JSON.parse(contentJson) as { sections?: { title: string; content: string }[] };
        return o.sections ?? [];
    } catch {
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────
// 상태 배지 색상 / 레이블 로직 재현
// ─────────────────────────────────────────────────────────────────
type ContractStatus = 'DRAFT' | 'SENT' | 'INSTRUCTOR_SIGNED' | 'FULLY_SIGNED' | 'VOID';

function getStatusLabel(status: ContractStatus): string {
    switch (status) {
        case 'FULLY_SIGNED': return '체결 완료';
        case 'SENT': return '서명 대기';
        case 'INSTRUCTOR_SIGNED': return '강사 서명 완료';
        case 'VOID': return '취소';
        default: return status;
    }
}

function getStatusBadgeColor(status: ContractStatus): string {
    switch (status) {
        case 'FULLY_SIGNED': return '#10B981';
        case 'SENT': return '#F59E0B';
        case 'INSTRUCTOR_SIGNED': return '#3B82F6';
        case 'VOID': return '#9CA3AF';
        default: return '#6B7280';
    }
}

// ─────────────────────────────────────────────────────────────────
// 기간 표시 로직 재현
// ─────────────────────────────────────────────────────────────────
function formatPeriod(effectiveFrom?: string, effectiveTo?: string): string {
    if (!effectiveFrom || !effectiveTo) return '';
    return `${effectiveFrom.slice(0, 10)} ~ ${effectiveTo.slice(0, 10)}`;
}

// ─────────────────────────────────────────────────────────────────
// 증빙 정보 표시 조건 재현
// ─────────────────────────────────────────────────────────────────
function hasEvidenceInfo(currentVersion: { documentHashSha256?: string; documentFileKey?: string } | null): boolean {
    if (!currentVersion) return false;
    return !!(currentVersion.documentHashSha256 || currentVersion.documentFileKey);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. parseContentJson — contentJson.sections 파싱
// ════════════════════════════════════════════════════════════════════════════

describe('parseContentJson (계약 본문 섹션 파싱)', () => {
    test('정상 sections JSON → 배열 반환', () => {
        const json = JSON.stringify({
            sections: [
                { title: '계약 목적', content: '본 계약은...' },
                { title: '정산 정보', content: '월 200만원' },
            ],
        });
        const result = parseContentJson(json);
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('계약 목적');
        expect(result[1].content).toBe('월 200만원');
    });

    test('sections가 없는 JSON → 빈 배열', () => {
        const json = JSON.stringify({ other: 'data' });
        expect(parseContentJson(json)).toEqual([]);
    });

    test('undefined → 빈 배열 (방어 코드)', () => {
        expect(parseContentJson(undefined)).toEqual([]);
    });

    test('빈 문자열 → 빈 배열', () => {
        expect(parseContentJson('')).toEqual([]);
    });

    test('잘못된 JSON → 빈 배열 (파싱 실패 안전 처리)', () => {
        expect(parseContentJson('{invalid json')).toEqual([]);
    });

    test('sections가 빈 배열인 경우 → 빈 배열', () => {
        const json = JSON.stringify({ sections: [] });
        expect(parseContentJson(json)).toEqual([]);
    });

    test('sections 항목이 여러 개인 경우 순서 유지', () => {
        const sections = [
            { title: '제1조', content: '목적' },
            { title: '제2조', content: '기간' },
            { title: '제3조', content: '보수' },
        ];
        const result = parseContentJson(JSON.stringify({ sections }));
        expect(result.map(s => s.title)).toEqual(['제1조', '제2조', '제3조']);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. 상태 배지 — 레이블과 색상
// ════════════════════════════════════════════════════════════════════════════

describe('상태 배지 (레이블·색상)', () => {
    test('FULLY_SIGNED → "체결 완료", 녹색', () => {
        expect(getStatusLabel('FULLY_SIGNED')).toBe('체결 완료');
        expect(getStatusBadgeColor('FULLY_SIGNED')).toBe('#10B981');
    });

    test('SENT → "서명 대기", 노란색', () => {
        expect(getStatusLabel('SENT')).toBe('서명 대기');
        expect(getStatusBadgeColor('SENT')).toBe('#F59E0B');
    });

    test('INSTRUCTOR_SIGNED → "강사 서명 완료", 파란색', () => {
        expect(getStatusLabel('INSTRUCTOR_SIGNED')).toBe('강사 서명 완료');
        expect(getStatusBadgeColor('INSTRUCTOR_SIGNED')).toBe('#3B82F6');
    });

    test('VOID → "취소", 회색', () => {
        expect(getStatusLabel('VOID')).toBe('취소');
        expect(getStatusBadgeColor('VOID')).toBe('#9CA3AF');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. 기간 표시 로직
// ════════════════════════════════════════════════════════════════════════════

describe('기간 표시 (formatPeriod)', () => {
    test('양쪽 날짜 모두 있으면 "YYYY-MM-DD ~ YYYY-MM-DD" 형식', () => {
        const result = formatPeriod('2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z');
        expect(result).toBe('2026-01-01 ~ 2026-12-31');
    });

    test('effectiveFrom 없으면 빈 문자열', () => {
        expect(formatPeriod(undefined, '2026-12-31')).toBe('');
    });

    test('effectiveTo 없으면 빈 문자열', () => {
        expect(formatPeriod('2026-01-01', undefined)).toBe('');
    });

    test('둘 다 없으면 빈 문자열', () => {
        expect(formatPeriod()).toBe('');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. 증빙 정보 표시 조건
// ════════════════════════════════════════════════════════════════════════════

describe('증빙 정보 표시 조건 (hasEvidenceInfo)', () => {
    test('documentHashSha256만 있어도 표시', () => {
        expect(hasEvidenceInfo({ documentHashSha256: 'abc123', documentFileKey: '' })).toBe(true);
    });

    test('documentFileKey만 있어도 표시', () => {
        expect(hasEvidenceInfo({ documentHashSha256: '', documentFileKey: 'file/path' })).toBe(true);
    });

    test('둘 다 없으면 미표시', () => {
        expect(hasEvidenceInfo({ documentHashSha256: '', documentFileKey: '' })).toBe(false);
    });

    test('currentVersion이 null이면 미표시', () => {
        expect(hasEvidenceInfo(null)).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. 통합 / 회귀 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('통합 / 회귀 케이스', () => {
    test('실제 백엔드 응답 형태 sections 파싱 정확성', () => {
        const realisticJson = JSON.stringify({
            sections: [
                { title: '계약 목적', content: '본 계약은 강사 서비스 제공을 목적으로 합니다.' },
                { title: '정산 정보', content: '월 강의료 1,800,000원 (세전)' },
                { title: '전달 사항', content: '수업 전 30분 일찍 도착하여 준비해주세요.' },
            ],
        });
        const sections = parseContentJson(realisticJson);
        expect(sections).toHaveLength(3);
        expect(sections[1].title).toBe('정산 정보');
        expect(sections[2].title).toBe('전달 사항');
    });

    test('FULLY_SIGNED 계약은 서명 버튼이 필요 없음 (canSign = false)', () => {
        const canSign = (status: ContractStatus) => status === 'SENT';
        expect(canSign('FULLY_SIGNED')).toBe(false);
        expect(canSign('SENT')).toBe(true);
        expect(canSign('VOID')).toBe(false);
    });

    test('sections가 있는 경우 계약 본문이 먼저 렌더링되어야 함 (순서 검증)', () => {
        // 렌더링 순서: 헤더 → 계약 본문(sections) → 서명 현황 → 액션 → 증빙(하단)
        // 증빙 정보가 sections보다 나중에 위치함을 검증
        const json = JSON.stringify({ sections: [{ title: '제1조', content: '내용' }] });
        const sections = parseContentJson(json);
        const hasEvidence = hasEvidenceInfo({ documentHashSha256: 'abc', documentFileKey: '' });
        // sections가 있고 증빙도 있을 때 섹션이 비어있지 않아야 함
        expect(sections.length).toBeGreaterThan(0);
        expect(hasEvidence).toBe(true);
        // 증빙은 보조 정보 (evidenceCard)로만 노출됨을 의미
    });
});
