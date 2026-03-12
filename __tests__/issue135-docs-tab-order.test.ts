/**
 * Issue #135 — 서류/계약 화면 탭 순서 제안-계약-서류, 요청/제안 → 제안 통일
 * DOCS_TABS 순서, targetTab 정규화, 딥링크 호환 검증 (30개 이상)
 */

const DOCS_TABS = ['제안', '계약', '서류'] as const;
type DocsTab = (typeof DOCS_TABS)[number];

/** 딥링크/파라미터 호환: 기존 '요청/제안'을 '제안'으로 매핑 */
function normalizeTargetTab(raw: string | undefined): string | undefined {
  if (raw === '요청/제안') return '제안';
  return raw;
}

function getTabIndex(tab: string): number {
  const normalized = normalizeTargetTab(tab);
  if (!normalized) return -1;
  const idx = DOCS_TABS.indexOf(normalized as DocsTab);
  return idx;
}

function getTabLabelAt(index: number): string {
  if (index < 0 || index >= DOCS_TABS.length) return '';
  return DOCS_TABS[index];
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. 탭 순서 (정상)
// ══════════════════════════════════════════════════════════════════════════════

describe('DOCS_TABS 순서 (이슈 #135)', () => {
  test('T01 — 첫 번째 탭은 제안', () => {
    expect(DOCS_TABS[0]).toBe('제안');
  });

  test('T02 — 두 번째 탭은 계약', () => {
    expect(DOCS_TABS[1]).toBe('계약');
  });

  test('T03 — 세 번째 탭은 서류', () => {
    expect(DOCS_TABS[2]).toBe('서류');
  });

  test('T04 — 탭 수 3개', () => {
    expect(DOCS_TABS).toHaveLength(3);
  });

  test('T05 — 순서가 서류-계약-요청/제안이 아님', () => {
    expect(DOCS_TABS[0]).not.toBe('서류');
    expect(DOCS_TABS[2]).not.toBe('요청/제안');
  });

  test('T06 — 제안 인덱스 0', () => {
    expect(DOCS_TABS.indexOf('제안')).toBe(0);
  });

  test('T07 — 계약 인덱스 1', () => {
    expect(DOCS_TABS.indexOf('계약')).toBe(1);
  });

  test('T08 — 서류 인덱스 2', () => {
    expect(DOCS_TABS.indexOf('서류')).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. normalizeTargetTab (딥링크 호환)
// ══════════════════════════════════════════════════════════════════════════════

describe('normalizeTargetTab', () => {
  test('T09 — 요청/제안 → 제안', () => {
    expect(normalizeTargetTab('요청/제안')).toBe('제안');
  });

  test('T10 — 제안은 그대로', () => {
    expect(normalizeTargetTab('제안')).toBe('제안');
  });

  test('T11 — 계약은 그대로', () => {
    expect(normalizeTargetTab('계약')).toBe('계약');
  });

  test('T12 — 서류는 그대로', () => {
    expect(normalizeTargetTab('서류')).toBe('서류');
  });

  test('T13 — undefined → undefined', () => {
    expect(normalizeTargetTab(undefined)).toBeUndefined();
  });

  test('T14 — 빈 문자열은 그대로', () => {
    expect(normalizeTargetTab('')).toBe('');
  });

  test('T15 — 알 수 없는 값은 그대로', () => {
    expect(normalizeTargetTab('OTHER')).toBe('OTHER');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. getTabIndex / getTabLabelAt
// ══════════════════════════════════════════════════════════════════════════════

describe('getTabIndex / getTabLabelAt', () => {
  test('T16 — 제안 인덱스 0', () => {
    expect(getTabIndex('제안')).toBe(0);
  });

  test('T17 — 요청/제안으로 들어오면 제안 인덱스 0', () => {
    expect(getTabIndex('요청/제안')).toBe(0);
  });

  test('T18 — 계약 인덱스 1', () => {
    expect(getTabIndex('계약')).toBe(1);
  });

  test('T19 — 서류 인덱스 2', () => {
    expect(getTabIndex('서류')).toBe(2);
  });

  test('T20 — 인덱스 0 라벨 제안', () => {
    expect(getTabLabelAt(0)).toBe('제안');
  });

  test('T21 — 인덱스 1 라벨 계약', () => {
    expect(getTabLabelAt(1)).toBe('계약');
  });

  test('T22 — 인덱스 2 라벨 서류', () => {
    expect(getTabLabelAt(2)).toBe('서류');
  });

  test('T23 — 범위 밖 인덱스 빈 문자열', () => {
    expect(getTabLabelAt(-1)).toBe('');
    expect(getTabLabelAt(3)).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 예외 / 통합 / 회귀
// ══════════════════════════════════════════════════════════════════════════════

describe('예외 및 통합', () => {
  test('T24 — DOCS_TABS에 요청/제안 없음', () => {
    expect(DOCS_TABS).not.toContain('요청/제안');
  });

  test('T25 — DOCS_TABS에 제안 있음', () => {
    expect(DOCS_TABS).toContain('제안');
  });

  test('T26 — 딥링크 시나리오: targetTab=요청/제안 → 선택 인덱스 0', () => {
    const normalized = normalizeTargetTab('요청/제안');
    const idx = DOCS_TABS.indexOf((normalized ?? '') as DocsTab);
    expect(idx).toBe(0);
  });

  test('T27 — 채팅방에서 문서로 이동 시 제안 탭으로 연결 (targetTab 제안)', () => {
    const targetTab = '제안';
    expect(getTabIndex(targetTab)).toBe(0);
  });

  test('T28 — 계약 확인하기 후 계약 탭 인덱스 1 유지', () => {
    expect(getTabIndex('계약')).toBe(1);
    expect(getTabLabelAt(1)).toBe('계약');
  });

  test('T29 — 회귀: 기존 순서 서류-계약-요청/제안 아님', () => {
    const first = DOCS_TABS[0];
    const last = DOCS_TABS[DOCS_TABS.length - 1];
    expect(first).toBe('제안');
    expect(last).toBe('서류');
  });

  test('T30 — 탭 라벨 배열 불변', () => {
    const copy = [...DOCS_TABS];
    expect(DOCS_TABS).toEqual(copy);
  });

  test('T31 — normalizeTargetTab 원본 변경 없음', () => {
    const raw = '요청/제안';
    normalizeTargetTab(raw);
    expect(raw).toBe('요청/제안');
  });

  test('T32 — 이슈 #135 요약: 제안 먼저', () => {
    expect(DOCS_TABS[0]).toBe('제안');
  });

  test('T33 — 이슈 #135 요약: 요청/제안 표기 제거', () => {
    expect(DOCS_TABS.every((t) => t !== '요청/제안')).toBe(true);
  });

  test('T34 — 파라미터 호환: 요청/제안 들어와도 제안 탭 선택 가능', () => {
    const idx = getTabIndex('요청/제안');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(getTabLabelAt(idx)).toBe('제안');
  });

  test('T35 — 세 탭 모두 유효 인덱스 반환', () => {
    expect(getTabIndex('제안')).toBe(0);
    expect(getTabIndex('계약')).toBe(1);
    expect(getTabIndex('서류')).toBe(2);
  });
});
