/**
 * Issue #114 — 계약 표시용 확장 필드(title, lessonTitle, instructorName, effectiveFrom/To) 타입 검증
 */

type ContractStatus = 'DRAFT' | 'SENT' | 'INSTRUCTOR_SIGNED' | 'FULLY_SIGNED' | 'VOID';

interface ApiContract {
  contractId: string;
  companyId: string;
  lessonId: string;
  instructorId: string;
  status: ContractStatus;
  currentVersion: number;
  title?: string;
  lessonTitle?: string;
  instructorName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

const makeContract = (overrides: Partial<ApiContract> = {}): ApiContract => ({
  contractId: 'CT_001',
  companyId: 'COMP_001',
  lessonId: 'LESSON_001',
  instructorId: 'INST_001',
  status: 'SENT',
  currentVersion: 1,
  ...overrides,
});

function getDisplayTitle(c: ApiContract): string {
  return c.title?.trim() || '제목 없음';
}

function getPeriodLabel(c: ApiContract): string {
  if (c.effectiveFrom && c.effectiveTo) {
    return `${c.effectiveFrom.slice(0, 10)} ~ ${c.effectiveTo.slice(0, 10)}`;
  }
  if (c.effectiveFrom) {
    return `${c.effectiveFrom.slice(0, 10)} 체결`;
  }
  return '';
}

// 1. 기본 필드 존재 여부
describe('ApiContract 기본 필드', () => {
  test('T01 — 필수 키가 모두 존재', () => {
    const c = makeContract();
    expect(c).toHaveProperty('contractId');
    expect(c).toHaveProperty('companyId');
    expect(c).toHaveProperty('lessonId');
    expect(c).toHaveProperty('instructorId');
    expect(c).toHaveProperty('status');
    expect(c).toHaveProperty('currentVersion');
  });

  test('T02 — 선택 필드가 없어도 타입상 유효', () => {
    const c: ApiContract = {
      contractId: 'CT_002',
      companyId: 'COMP_001',
      lessonId: 'LESSON_001',
      instructorId: 'INST_001',
      status: 'SENT',
      currentVersion: 1,
    };
    expect(c.title).toBeUndefined();
    expect(c.lessonTitle).toBeUndefined();
    expect(c.instructorName).toBeUndefined();
  });

  test('T03 — lessonTitle과 instructorName을 함께 설정 가능', () => {
    const c = makeContract({
      lessonTitle: '역사 체험 수업',
      instructorName: '홍길동',
    });
    expect(c.lessonTitle).toBe('역사 체험 수업');
    expect(c.instructorName).toBe('홍길동');
  });

  test('T04 — status SENT', () => {
    expect(makeContract({ status: 'SENT' }).status).toBe('SENT');
  });

  test('T05 — status FULLY_SIGNED', () => {
    expect(makeContract({ status: 'FULLY_SIGNED' }).status).toBe('FULLY_SIGNED');
  });
});

// 2. 제목 로직
describe('getDisplayTitle', () => {
  test('T06 — title이 있으면 그대로 사용', () => {
    expect(getDisplayTitle(makeContract({ title: '계약 A' }))).toBe('계약 A');
  });

  test('T07 — title 없으면 "제목 없음"', () => {
    expect(getDisplayTitle(makeContract({ title: undefined }))).toBe('제목 없음');
  });

  test('T08 — 공백만 있는 title도 "제목 없음"', () => {
    expect(getDisplayTitle(makeContract({ title: '   ' }))).toBe('제목 없음');
  });

  test('T09 — 앞뒤 공백은 trim', () => {
    expect(getDisplayTitle(makeContract({ title: '  계약 B  ' }))).toBe('계약 B');
  });

  test('T10 — 한글/특수문자 포함 제목', () => {
    expect(getDisplayTitle(makeContract({ title: '[계약] 2025-08' }))).toBe('[계약] 2025-08');
  });
});

// 3. 기간 라벨
describe('getPeriodLabel', () => {
  test('T11 — from/to 모두 있을 때 범위 표시', () => {
    const label = getPeriodLabel(
      makeContract({
        effectiveFrom: '2025-08-01T00:00:00Z',
        effectiveTo: '2025-08-31T00:00:00Z',
      }),
    );
    expect(label).toBe('2025-08-01 ~ 2025-08-31');
  });

  test('T12 — from만 있을 때 "체결"', () => {
    const label = getPeriodLabel(
      makeContract({
        effectiveFrom: '2025-09-01T00:00:00Z',
        effectiveTo: undefined,
      }),
    );
    expect(label).toBe('2025-09-01 체결');
  });

  test('T13 — 둘 다 없으면 빈 문자열', () => {
    expect(getPeriodLabel(makeContract({ effectiveFrom: undefined, effectiveTo: undefined }))).toBe('');
  });

  test('T14 — from/to에 시간 포함돼도 날짜만 사용', () => {
    const label = getPeriodLabel(
      makeContract({
        effectiveFrom: '2025-10-01T12:34:56Z',
        effectiveTo: '2025-10-31T23:59:59Z',
      }),
    );
    expect(label).toBe('2025-10-01 ~ 2025-10-31');
  });
});

// 4. lessonTitle / instructorName 통합 시나리오
describe('lessonTitle / instructorName 통합', () => {
  test('T15 — lessonTitle만 존재', () => {
    const c = makeContract({ lessonTitle: '박물관 견학' });
    expect(c.lessonTitle).toBe('박물관 견학');
  });

  test('T16 — instructorName만 존재', () => {
    const c = makeContract({ instructorName: '이순신' });
    expect(c.instructorName).toBe('이순신');
  });

  test('T17 — 둘 다 비어 있어도 계약은 유효', () => {
    const c = makeContract({ lessonTitle: undefined, instructorName: undefined });
    expect(c.contractId).toBe('CT_001');
  });

  test('T18 — 긴 lessonTitle도 허용', () => {
    const long = 'A'.repeat(120);
    expect(makeContract({ lessonTitle: long }).lessonTitle).toBe(long);
  });

  test('T19 — instructorName 공백 처리 없이 그대로 표시', () => {
    const c = makeContract({ instructorName: '  홍 길 동  ' });
    expect(c.instructorName).toBe('  홍 길 동  ');
  });
});

// 5. 사이드 이펙트 / 회귀
describe('사이드 이펙트 및 회귀', () => {
  test('T20 — 기존 필드(contractId 등)는 그대로 유지', () => {
    const c = makeContract({ title: '계약 C' });
    expect(c.contractId).toBe('CT_001');
    expect(c.title).toBe('계약 C');
  });

  test('T21 — 여러 계약의 제목 리스트 생성', () => {
    const list = [
      makeContract({ contractId: 'A', title: 'A계약' }),
      makeContract({ contractId: 'B', title: undefined }),
      makeContract({ contractId: 'C', title: 'C계약' }),
    ];
    expect(list.map(getDisplayTitle)).toEqual(['A계약', '제목 없음', 'C계약']);
  });

  test('T22 — 기간 정렬 시 year-month 기준 사용 가능', () => {
    const list = [
      makeContract({ effectiveFrom: '2025-09-01T00:00:00Z' }),
      makeContract({ effectiveFrom: '2025-08-01T00:00:00Z' }),
    ];
    const sorted = [...list].sort(
      (a, b) => (a.effectiveFrom ?? '').localeCompare(b.effectiveFrom ?? ''),
    );
    expect(sorted[0].effectiveFrom).toBe('2025-08-01T00:00:00Z');
  });

  test('T23 — status에 따른 필터링 예시', () => {
    const list = [
      makeContract({ status: 'SENT' }),
      makeContract({ status: 'FULLY_SIGNED' }),
      makeContract({ status: 'VOID' }),
    ];
    const sent = list.filter((c) => c.status === 'SENT');
    expect(sent).toHaveLength(1);
  });

  test('T24 — lessonTitle/instructorName 없는 상태에서도 toString 시 문제 없음', () => {
    const c = makeContract({ lessonTitle: undefined, instructorName: undefined });
    expect(() => JSON.stringify(c)).not.toThrow();
  });

  test('T25 — 여러 필드 동시 업데이트', () => {
    const c = makeContract({
      title: '계약 D',
      lessonTitle: '역사 수업',
      instructorName: '홍길동',
    });
    expect(getDisplayTitle(c)).toBe('계약 D');
    expect(c.lessonTitle).toBe('역사 수업');
    expect(c.instructorName).toBe('홍길동');
  });

  test('T26 — effectiveFrom만 있는 계약들 필터링', () => {
    const list = [
      makeContract({ effectiveFrom: '2025-01-01T00:00:00Z' }),
      makeContract({ effectiveFrom: undefined }),
    ];
    const filtered = list.filter((c) => !!c.effectiveFrom);
    expect(filtered).toHaveLength(1);
  });

  test('T27 — title과 lessonTitle이 모두 없는 경우', () => {
    const c = makeContract({ title: undefined, lessonTitle: undefined });
    expect(getDisplayTitle(c)).toBe('제목 없음');
  });

  test('T28 — instructorName만 있는 경우에도 계약은 유효', () => {
    const c = makeContract({ instructorName: '강사 A' });
    expect(c.instructorName).toBe('강사 A');
    expect(c.contractId).toBe('CT_001');
  });

  test('T29 — 여러 상태 조합에서도 타입 일관성 유지', () => {
    const list: ApiContract[] = [
      makeContract({ status: 'SENT' }),
      makeContract({ status: 'INSTRUCTOR_SIGNED' }),
      makeContract({ status: 'FULLY_SIGNED' }),
    ];
    expect(list.map((c) => c.status)).toEqual(['SENT', 'INSTRUCTOR_SIGNED', 'FULLY_SIGNED']);
  });

  test('T30 — JSON 직렬화에 lessonTitle/instructorName 포함', () => {
    const c = makeContract({
      lessonTitle: '테스트 수업',
      instructorName: '테스트 강사',
    });
    const json = JSON.parse(JSON.stringify(c)) as ApiContract;
    expect(json.lessonTitle).toBe('테스트 수업');
    expect(json.instructorName).toBe('테스트 강사');
  });
});

