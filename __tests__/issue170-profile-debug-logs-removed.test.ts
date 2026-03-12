/**
 * Issue #170 — ProfileScreen 잔여 디버그 로그 제거 (#154 누락분)
 *
 * 실제 소스 파일을 직접 읽어 디버그 로그 제거 여부를 검증한다.
 * 소스가 원래대로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const PROFILE_SCREEN = path.join(ROOT, 'src', 'screens', 'ProfileScreen.tsx');
const src = fs.readFileSync(PROFILE_SCREEN, 'utf-8');

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 디버그 로그 제거 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] ProfileScreen — 디버그 console.log 제거', () => {
  test('T01 — [ProfileScreen] loaded instructor 로그 없음', () => {
    expect(src).not.toContain('[ProfileScreen] loaded instructor');
  });

  test('T02 — [ProfileScreen] failed to load instructor 로그 없음', () => {
    expect(src).not.toContain('[ProfileScreen] failed to load instructor');
  });

  test('T03 — [ProfileScreen] loaded company 로그 없음', () => {
    expect(src).not.toContain('[ProfileScreen] loaded company');
  });

  test('T04 — [ProfileScreen] failed to load company 로그 없음', () => {
    expect(src).not.toContain('[ProfileScreen] failed to load company');
  });

  test('T05 — instructorId 디버그 출력 없음', () => {
    expect(src).not.toContain('instructorId: nextInstructor.instructorId');
  });

  test('T06 — userId 디버그 출력 없음', () => {
    expect(src).not.toContain('userId: nextInstructor.userId');
  });

  test('T07 — companyId 디버그 출력 없음', () => {
    expect(src).not.toContain('companyId: nextCompany.companyId');
  });

  test('T08 — companyName 디버그 출력 없음', () => {
    expect(src).not.toContain('companyName: nextCompany.name');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — eslint-disable 주석 제거 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] ProfileScreen — eslint-disable no-console 주석 제거', () => {
  test('T09 — eslint-disable-next-line no-console 주석 없음', () => {
    expect(src).not.toContain('eslint-disable-next-line no-console');
  });

  test('T10 — eslint-disable no-console 주석 없음', () => {
    expect(src).not.toContain('eslint-disable no-console');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 회귀 케이스 — 핵심 로직 유지 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] ProfileScreen — 핵심 로직 유지', () => {
  test('T11 — getInstructorProfile 호출 유지', () => {
    expect(src).toContain('getInstructorProfile()');
  });

  test('T12 — getCompany 호출 유지', () => {
    expect(src).toContain('getCompany()');
  });

  test('T13 — Promise.allSettled 사용 유지', () => {
    expect(src).toContain('Promise.allSettled');
  });

  test('T14 — setInstructor 호출 유지', () => {
    expect(src).toContain('setInstructor(');
  });

  test('T15 — setCompany 호출 유지', () => {
    expect(src).toContain('setCompany(');
  });

  test('T16 — instructorResult.status === fulfilled 분기 유지', () => {
    expect(src).toContain("instructorResult.status === 'fulfilled'");
  });

  test('T17 — companyResult.status === fulfilled 분기 유지', () => {
    expect(src).toContain("companyResult.status === 'fulfilled'");
  });

  test('T18 — mounted 플래그 유지', () => {
    expect(src).toContain('mounted');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 사이드 이펙트 — 유지해야 할 console.error는 건드리지 않았는지 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] 유지 대상 로그 미영향 확인 (다른 파일)', () => {
  const chatContextSrc = fs.readFileSync(
    path.join(ROOT, 'src', 'context', 'ChatContext.tsx'), 'utf-8'
  );
  const chatSocketSrc = fs.readFileSync(
    path.join(ROOT, 'src', 'services', 'chatSocket.ts'), 'utf-8'
  );

  test('T19 — ChatContext console.error 유지 (소켓 에러 핸들링)', () => {
    expect(chatContextSrc).toContain('console.error');
  });

  test('T20 — chatSocket MockSocket 로그 유지 (개발 전용 Mock)', () => {
    expect(chatSocketSrc).toContain('[MockSocket]');
  });

  test('T21 — chatSocket Socket Connected 로그 유지', () => {
    expect(chatSocketSrc).toContain('[Socket] Connected');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 통합 케이스 — ProfileScreen console.log 전수 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] ProfileScreen — console.log 전수 검사', () => {
  test('T22 — console.log 호출 없음', () => {
    expect(src).not.toMatch(/console\.log\(/);
  });

  test('T23 — console.debug 호출 없음', () => {
    expect(src).not.toMatch(/console\.debug\(/);
  });

  test('T24 — console.warn 호출 없음', () => {
    expect(src).not.toMatch(/console\.warn\(/);
  });

  test('T25 — console.info 호출 없음', () => {
    expect(src).not.toMatch(/console\.info\(/);
  });

  test('T26 — console.error 호출 없음 (ProfileScreen은 에러 핸들링 불필요)', () => {
    expect(src).not.toMatch(/console\.error\(/);
  });

  test('T27 — 전체 console 참조 없음', () => {
    expect(src).not.toMatch(/console\./);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. 추가 정상 케이스 — 파일 구조 정상
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] ProfileScreen — 파일 구조 정상', () => {
  test('T28 — export default ProfileScreen 존재', () => {
    expect(src).toContain('export default function ProfileScreen');
  });

  test('T29 — useEffect 존재', () => {
    expect(src).toContain('useEffect');
  });

  test('T30 — apiClient import 유지', () => {
    expect(src).toContain("from '@/src/api/apiClient'");
  });
});
