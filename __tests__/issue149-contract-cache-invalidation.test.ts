/**
 * Issue #149 — 강사 수락 직후 DRAFT 계약 즉시 표시
 *
 * 검증 전략:
 * - 실제 소스 파일을 직접 읽어(fs.readFileSync) 변경 사항을 검증한다.
 * - 소스가 원래 상태로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 * - 정상/예외/사이드이펙트/통합/회귀 케이스 30개 이상 포함.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CLASS_DETAIL = path.join(ROOT, 'src', 'screens', 'ClassDetailScreen.tsx');
const CONTRACT_DETAIL = path.join(ROOT, 'src', 'screens', 'DocContractDetailScreen.tsx');
const DOCS_SCREEN = path.join(ROOT, 'src', 'screens', 'DocsScreen.tsx');
const REQUEST_DETAIL = path.join(ROOT, 'src', 'screens', 'DocLessonRequestDetailScreen.tsx');
const HOOKS = path.join(ROOT, 'src', 'query', 'hooks.ts');

const classSrc = fs.readFileSync(CLASS_DETAIL, 'utf-8');
const contractSrc = fs.readFileSync(CONTRACT_DETAIL, 'utf-8');
const docsSrc = fs.readFileSync(DOCS_SCREEN, 'utf-8');
const requestSrc = fs.readFileSync(REQUEST_DETAIL, 'utf-8');
const hooksSrc = fs.readFileSync(HOOKS, 'utf-8');

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — ClassDetailScreen: useRespondToRequestMutation 사용
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] ClassDetailScreen — useRespondToRequestMutation 사용', () => {
  test('T01 — useRespondToRequestMutation import 존재', () => {
    expect(classSrc).toContain("useRespondToRequestMutation");
  });

  test('T02 — respondToRequestMutation.mutateAsync 사용 (수락)', () => {
    expect(classSrc).toContain("respondToRequestMutation.mutateAsync");
  });

  test('T03 — action: ACCEPT mutateAsync 호출', () => {
    expect(classSrc).toContain("action: 'ACCEPT'");
  });

  test('T04 — action: REJECT mutateAsync 호출', () => {
    expect(classSrc).toContain("action: 'REJECT'");
  });

  test('T05 — requestLoading은 respondToRequestMutation.isPending으로 대체', () => {
    expect(classSrc).toContain('respondToRequestMutation.isPending');
  });

  test('T06 — 수락 성공 문구: 초안 계약이 생성되었습니다', () => {
    expect(classSrc).toContain('초안 계약이 생성되었습니다');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 회귀 케이스 — ClassDetailScreen: 직접 API 호출 제거 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] ClassDetailScreen — 직접 apiClient.respondToRequest 호출 제거', () => {
  test('T07 — handleAcceptRequest에서 apiClient.respondToRequest 직접 호출 없음', () => {
    // mutateAsync로 교체되었으므로 직접 호출 패턴이 없어야 함
    const directCallPattern = /await apiClient\.respondToRequest\(/;
    expect(directCallPattern.test(classSrc)).toBe(false);
  });

  test('T08 — setRequestLoading(true) 직접 호출 없음 (isPending으로 대체)', () => {
    expect(classSrc).not.toContain('setRequestLoading(true)');
  });

  test('T09 — setRequestLoading(false) 직접 호출 없음', () => {
    expect(classSrc).not.toContain('setRequestLoading(false)');
  });

  test('T10 — useState로 requestLoading 별도 관리 없음', () => {
    expect(classSrc).not.toContain("useState(false); // requestLoading");
    // isPending을 사용하므로 별도 useState 선언이 없어야 함
    const stateForLoading = /const \[requestLoading, setRequestLoading\] = useState/;
    expect(stateForLoading.test(classSrc)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 정상 케이스 — DocContractDetailScreen: 서명 후 캐시 invalidate
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] DocContractDetailScreen — 서명 후 contracts 캐시 invalidate', () => {
  test('T11 — useQueryClient import 존재', () => {
    expect(contractSrc).toContain('useQueryClient');
  });

  test('T12 — queryKeys import 존재', () => {
    expect(contractSrc).toContain('queryKeys');
  });

  test('T13 — handleSubmitSign에서 invalidateQueries 호출', () => {
    expect(contractSrc).toContain('invalidateQueries');
  });

  test('T14 — queryKeys.contracts를 대상으로 invalidate', () => {
    expect(contractSrc).toContain('queryKeys.contracts');
  });

  test('T15 — invalidateQueries가 setDetail 이후에 위치 (응답 반영 후 invalidate)', () => {
    const setDetailIdx = contractSrc.indexOf('setDetail(updated)');
    const invalidateIdx = contractSrc.indexOf('invalidateQueries');
    expect(setDetailIdx).toBeGreaterThan(-1);
    expect(invalidateIdx).toBeGreaterThan(setDetailIdx);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 정상 케이스 — DocsScreen: DRAFT 필터 추가
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] DocsScreen — DRAFT 필터 칩 추가', () => {
  test('T16 — contractFilterStatuses에 DRAFT 포함', () => {
    expect(docsSrc).toContain("'DRAFT'");
  });

  test('T17 — DRAFT가 ALL 다음에 위치 (순서: ALL, DRAFT, SENT, ...)', () => {
    const allIdx = docsSrc.indexOf("'ALL'");
    const draftIdx = docsSrc.indexOf("'DRAFT'");
    const sentIdx = docsSrc.indexOf("'SENT'");
    expect(draftIdx).toBeGreaterThan(allIdx);
    expect(draftIdx).toBeLessThan(sentIdx);
  });

  test('T18 — contractFilterStatuses 배열에 5개 상태 (ALL 포함)', () => {
    const match = docsSrc.match(/contractFilterStatuses[^=]*=\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const items = match![1].split(',').map((s) => s.trim()).filter(Boolean);
    expect(items.length).toBe(5);
  });

  test('T19 — DRAFT 라벨 "초안"이 contractStatusLabel 맵에 정의됨', () => {
    expect(docsSrc).toContain("DRAFT: '초안'");
  });

  test('T20 — 수락 성공 문구 "초안 계약이 생성되었습니다" 포함', () => {
    expect(docsSrc).toContain('초안 계약이 생성되었습니다');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스 — DocsScreen: 잘못된 문구 제거
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] DocsScreen — 잘못된 성공 문구 제거', () => {
  test('T21 — "새로운 계약서가 발송되었습니다" 문구 없음 (DocsScreen)', () => {
    expect(docsSrc).not.toContain('새로운 계약서가 발송되었습니다');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. 정상 케이스 — DocLessonRequestDetailScreen: 성공 문구 수정
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] DocLessonRequestDetailScreen — 수락 성공 문구 수정', () => {
  test('T22 — "초안 계약이 생성되었습니다" 문구 포함', () => {
    expect(requestSrc).toContain('초안 계약이 생성되었습니다');
  });

  test('T23 — "새로운 계약서가 발송되었습니다" 문구 없음', () => {
    expect(requestSrc).not.toContain('새로운 계약서가 발송되었습니다');
  });

  test('T24 — useRespondToRequestMutation 사용 유지 (기존 정상 경로)', () => {
    expect(requestSrc).toContain('useRespondToRequestMutation');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. 통합 케이스 — hooks.ts: useRespondToRequestMutation onSuccess invalidate 검증
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] hooks.ts — useRespondToRequestMutation onSuccess invalidate', () => {
  test('T25 — lessonRequests invalidate 포함', () => {
    expect(hooksSrc).toContain('queryKeys.lessonRequests');
  });

  test('T26 — lessons invalidate 포함', () => {
    expect(hooksSrc).toContain('queryKeys.lessons');
  });

  test('T27 — contracts invalidate 포함', () => {
    expect(hooksSrc).toContain('queryKeys.contracts');
  });

  test('T28 — onSuccess 콜백에서 Promise.all로 병렬 invalidate', () => {
    expect(hooksSrc).toContain('Promise.all');
  });

  test('T29 — useRespondToRequestMutation 함수 export 존재', () => {
    expect(hooksSrc).toContain('export function useRespondToRequestMutation');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. 사이드 이펙트 — 기존 동작 유지 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] 기존 동작 유지', () => {
  test('T30 — ClassDetailScreen: 409 에러 분기 유지', () => {
    expect(classSrc).toContain('e.status === 409');
  });

  test('T31 — ClassDetailScreen: setRequestStatus 호출 유지 (로컬 UI 상태 업데이트)', () => {
    expect(classSrc).toContain('setRequestStatus(updated.status)');
  });

  test('T32 — ClassDetailScreen: 거절 사유 trim 검증 유지', () => {
    expect(classSrc).toContain('rejectReason.trim()');
  });

  test('T33 — DocContractDetailScreen: setDetail(updated) 유지 (화면 내 즉시 반영)', () => {
    expect(contractSrc).toContain('setDetail(updated)');
  });

  test('T34 — DocContractDetailScreen: 서명 완료 Alert 문구 유지', () => {
    expect(contractSrc).toContain('계약서에 서명이 반영되었습니다');
  });

  test('T35 — DocsScreen: useRespondToRequestMutation import 유지', () => {
    expect(docsSrc).toContain('useRespondToRequestMutation');
  });

  test('T36 — DocLessonRequestDetailScreen: ACCEPT 분기 유지', () => {
    expect(requestSrc).toContain("action === 'ACCEPT'");
  });

  test('T37 — DocLessonRequestDetailScreen: 계약 확인하기 버튼 유지', () => {
    expect(requestSrc).toContain('계약 확인하기');
  });
});
