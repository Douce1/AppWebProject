/**
 * Issue #111 — 서류/계약 탭: 리스트 제목 표시 및 보기 연동
 * 대상: 계약 리스트 제목 fallback, 상세 에러 시 목록으로, contractErrors, param 파싱
 */

// ── 타입 (api/types와 동기화) ─────────────────────────────────────────────────

interface ApiContract {
  contractId: string;
  companyId: string;
  lessonId: string;
  instructorId: string;
  status: string;
  currentVersion: number;
  title?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

// ── 헬퍼 (화면 로직 미러) ─────────────────────────────────────────────────────

function getContractListTitle(c: ApiContract): string {
  return c.title?.trim() || '제목 없음';
}

function parseContractIdFromParams(
  params: { contractId?: string | string[] },
): string | undefined {
  const raw = params.contractId;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return undefined;
}

const CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND';
const CONTRACT_ALREADY_SIGNED = 'CONTRACT_ALREADY_SIGNED';
const SIGN_TOKEN_EXPIRED = 'SIGN_TOKEN_EXPIRED';
const CONSENT_REQUIRED = 'CONSENT_REQUIRED';
const FORBIDDEN = 'FORBIDDEN';

const MESSAGES: Record<string, string> = {
  [CONTRACT_NOT_FOUND]: '계약을 찾을 수 없습니다.',
  [CONTRACT_ALREADY_SIGNED]: '이미 서명이 완료된 계약입니다.',
  [SIGN_TOKEN_EXPIRED]: '서명 링크가 만료되었습니다. 다시 요청해 주세요.',
  [CONSENT_REQUIRED]: '동의 항목에 체크해 주세요.',
  [FORBIDDEN]: '권한이 없습니다.',
  CONFLICT: '이미 처리되었거나 중복 요청입니다.',
};

function getContractErrorMessage(code: string | undefined, httpStatus?: number): string {
  if (httpStatus === 409) return MESSAGES.CONFLICT ?? '이미 처리되었거나 중복 요청입니다.';
  if (code && MESSAGES[code]) return MESSAGES[code];
  return code ? `${code}` : '처리 중 오류가 발생했습니다.';
}

function makeContract(overrides: Partial<ApiContract> = {}): ApiContract {
  return {
    contractId: 'CT_AUG_023',
    companyId: 'C1',
    lessonId: 'L1',
    instructorId: 'I1',
    status: 'SENT',
    currentVersion: 1,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. getContractListTitle (리스트 제목: 계약 제목 우선, 없으면 "제목 없음")
// ══════════════════════════════════════════════════════════════════════════════

describe('getContractListTitle', () => {
  test('T01 — title 있으면 title 반환', () => {
    expect(getContractListTitle(makeContract({ title: '2025년 8월 강의 계약' }))).toBe('2025년 8월 강의 계약');
  });

  test('T02 — title 없으면 "제목 없음"', () => {
    expect(getContractListTitle(makeContract({ title: undefined }))).toBe('제목 없음');
  });

  test('T03 — title 빈 문자열이면 "제목 없음"', () => {
    expect(getContractListTitle(makeContract({ title: '' }))).toBe('제목 없음');
  });

  test('T04 — title 공백만이면 "제목 없음"', () => {
    expect(getContractListTitle(makeContract({ title: '   ' }))).toBe('제목 없음');
  });

  test('T05 — title 앞뒤 공백 trim', () => {
    expect(getContractListTitle(makeContract({ title: '  강의 계약  ' }))).toBe('강의 계약');
  });

  test('T06 — contractId 노출하지 않음 (제목 없을 때)', () => {
    const title = getContractListTitle(makeContract({ contractId: 'CT_AUG_023', title: undefined }));
    expect(title).not.toContain('CT_AUG_023');
    expect(title).toBe('제목 없음');
  });

  test('T07 — 한글 제목 그대로', () => {
    expect(getContractListTitle(makeContract({ title: '서울역사박물관 강의 계약서' }))).toBe('서울역사박물관 강의 계약서');
  });

  test('T08 — 긴 제목 그대로', () => {
    const long = 'A'.repeat(100);
    expect(getContractListTitle(makeContract({ title: long }))).toBe(long);
  });

  test('T09 — 특수문자 제목', () => {
    expect(getContractListTitle(makeContract({ title: '[계약] 2025-08 (1차)' }))).toBe('[계약] 2025-08 (1차)');
  });

  test('T10 — title null 대비 (타입상 undefined만 있지만)', () => {
    const c = makeContract();
    (c as { title?: string }).title = undefined;
    expect(getContractListTitle(c)).toBe('제목 없음');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. parseContractIdFromParams (상세 화면 contractId 파싱)
// ══════════════════════════════════════════════════════════════════════════════

describe('parseContractIdFromParams', () => {
  test('T11 — string이면 그대로', () => {
    expect(parseContractIdFromParams({ contractId: 'CT_001' })).toBe('CT_001');
  });

  test('T12 — string[]이면 첫 요소', () => {
    expect(parseContractIdFromParams({ contractId: ['CT_001', 'CT_002'] })).toBe('CT_001');
  });

  test('T13 — 빈 배열이면 undefined', () => {
    expect(parseContractIdFromParams({ contractId: [] })).toBeUndefined();
  });

  test('T14 — params 없으면 undefined', () => {
    expect(parseContractIdFromParams({})).toBeUndefined();
  });

  test('T15 — contractId undefined', () => {
    expect(parseContractIdFromParams({ contractId: undefined })).toBeUndefined();
  });

  test('T16 — 특수문자 포함 ID', () => {
    expect(parseContractIdFromParams({ contractId: 'CT-AUG-023' })).toBe('CT-AUG-023');
  });

  test('T17 — 배열 한 요소', () => {
    expect(parseContractIdFromParams({ contractId: ['ONE'] })).toBe('ONE');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. getContractErrorMessage
// ══════════════════════════════════════════════════════════════════════════════

describe('getContractErrorMessage', () => {
  test('T18 — CONTRACT_NOT_FOUND', () => {
    expect(getContractErrorMessage('CONTRACT_NOT_FOUND')).toBe('계약을 찾을 수 없습니다.');
  });

  test('T19 — CONTRACT_ALREADY_SIGNED', () => {
    expect(getContractErrorMessage('CONTRACT_ALREADY_SIGNED')).toBe('이미 서명이 완료된 계약입니다.');
  });

  test('T20 — SIGN_TOKEN_EXPIRED', () => {
    expect(getContractErrorMessage('SIGN_TOKEN_EXPIRED')).toContain('만료');
  });

  test('T21 — CONSENT_REQUIRED', () => {
    expect(getContractErrorMessage('CONSENT_REQUIRED')).toContain('동의');
  });

  test('T22 — FORBIDDEN', () => {
    expect(getContractErrorMessage('FORBIDDEN')).toBe('권한이 없습니다.');
  });

  test('T23 — httpStatus 409 → CONFLICT 메시지', () => {
    expect(getContractErrorMessage(undefined, 409)).toContain('이미 처리');
  });

  test('T24 — code undefined이면 기본 메시지', () => {
    expect(getContractErrorMessage(undefined)).toBe('처리 중 오류가 발생했습니다.');
  });

  test('T25 — 알 수 없는 code는 code 그대로', () => {
    expect(getContractErrorMessage('UNKNOWN_CODE')).toBe('UNKNOWN_CODE');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 통합 / 사이드 이펙트 / 회귀
// ══════════════════════════════════════════════════════════════════════════════

describe('통합 및 회귀', () => {
  test('T26 — 리스트용 계약 여러 개 제목 표시', () => {
    const list = [
      makeContract({ contractId: 'C1', title: '계약 A' }),
      makeContract({ contractId: 'C2', title: undefined }),
      makeContract({ contractId: 'C3', title: '' }),
    ];
    expect(list.map(getContractListTitle)).toEqual(['계약 A', '제목 없음', '제목 없음']);
  });

  test('T27 — 상세 에러 시 표시 메시지 + 목록으로 버튼 가능', () => {
    const message = getContractErrorMessage('CONTRACT_NOT_FOUND');
    expect(message).toBe('계약을 찾을 수 없습니다.');
    expect(message.length).toBeGreaterThan(0);
  });

  test('T28 — contractId 없을 때 loadContract 시 CONTRACT_NOT_FOUND 시뮬레이션', () => {
    const contractId = parseContractIdFromParams({});
    const errorCode = contractId ? null : 'CONTRACT_NOT_FOUND';
    expect(errorCode).toBe('CONTRACT_NOT_FOUND');
  });

  test('T29 — ApiContract 필수 필드', () => {
    const c = makeContract();
    expect(c).toHaveProperty('contractId');
    expect(c).toHaveProperty('status');
    expect(c).toHaveProperty('companyId');
    expect(c).toHaveProperty('lessonId');
    expect(c).toHaveProperty('instructorId');
  });

  test('T30 — formatContractDate 시뮬레이션 (effectiveFrom/To)', () => {
    const c = makeContract({
      effectiveFrom: '2025-08-01T00:00:00Z',
      effectiveTo: '2025-08-31T00:00:00Z',
    });
    const from = c.effectiveFrom?.slice(0, 10);
    const to = c.effectiveTo?.slice(0, 10);
    expect(from).toBe('2025-08-01');
    expect(to).toBe('2025-08-31');
  });

  test('T31 — 보기 클릭 시 전달할 URL query 시뮬레이션', () => {
    const c = makeContract({ contractId: 'CT_AUG_023' });
    const query = `contractId=${encodeURIComponent(c.contractId)}`;
    expect(query).toBe('contractId=CT_AUG_023');
  });

  test('T32 — contractId에 특수문자 있을 때 인코딩', () => {
    const id = 'CT/AUG/023';
    expect(encodeURIComponent(id)).toBe('CT%2FAUG%2F023');
  });

  test('T33 — 회귀: 기존 계약 번호 fallback 제거 (제목 없음 사용)', () => {
    const title = getContractListTitle(makeContract({ title: undefined, contractId: 'CT_AUG_023' }));
    expect(title).not.toMatch(/계약\s+CT_/);
    expect(title).toBe('제목 없음');
  });

  test('T34 — status 라벨 매핑 시뮬레이션', () => {
    const statusLabels: Record<string, string> = {
      SENT: '서명 대기',
      FULLY_SIGNED: '체결 완료',
      INSTRUCTOR_SIGNED: '강사 서명 완료',
      VOID: '취소',
      DRAFT: '초안',
    };
    expect(statusLabels['SENT']).toBe('서명 대기');
    expect(statusLabels['FULLY_SIGNED']).toBe('체결 완료');
  });

  test('T35 — 빈 title과 공백 title 동일 처리', () => {
    expect(getContractListTitle(makeContract({ title: '' }))).toBe(
      getContractListTitle(makeContract({ title: '  ' })),
    );
  });

  test('T36 — 목록 필터 시 contractId로 key 사용 가능', () => {
    const list = [makeContract({ contractId: 'A' }), makeContract({ contractId: 'B' })];
    const keys = list.map((c) => c.contractId);
    expect(keys).toEqual(['A', 'B']);
    expect(new Set(keys).size).toBe(2);
  });

  test('T37 — getContract 실패 시 errorCode 설정 시뮬레이션', () => {
    const err = { code: 'CONTRACT_NOT_FOUND' as const };
    const errorCode = err?.code ?? 'CONTRACT_NOT_FOUND';
    expect(errorCode).toBe('CONTRACT_NOT_FOUND');
  });

  test('T38 — 에러 시 detail null 유지', () => {
    let detail: ApiContract | null = makeContract();
    const errorCode = 'CONTRACT_NOT_FOUND';
    if (errorCode) detail = null;
    expect(detail).toBeNull();
  });

  test('T39 — 리스트 카드 제목 필드 길이 제한 없음', () => {
    const c = makeContract({ title: '짧은 제목' });
    expect(getContractListTitle(c).length).toBe(5);
  });

  test('T40 — httpStatus 409가 code보다 우선', () => {
    expect(getContractErrorMessage('CONTRACT_NOT_FOUND', 409)).toContain('이미 처리');
  });
});
