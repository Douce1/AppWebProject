/**
 * Issue #196 — 대시보드 일정 라벨 옆 괄호 숫자 제거
 *
 * HomeScreen.tsx를 직접 읽어 일정 수 괄호 표기가 제거되었음을 검증한다.
 * 소스가 원래대로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const homeScreen = fs.readFileSync(
  path.join(ROOT, 'src', 'screens', 'HomeScreen.tsx'),
  'utf-8',
);

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 괄호 숫자가 제거된 상태 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] 일정 라벨에 괄호 숫자 없음', () => {
  test('T01 — sectionTitle에 dayClasses.length 괄호 표기가 없어야 한다', () => {
    expect(homeScreen).not.toContain('({dayClasses.length})');
  });

  test('T02 — "오늘의 일정" 텍스트가 존재해야 한다', () => {
    expect(homeScreen).toContain('오늘의 일정');
  });

  test('T03 — "월 일 일정" 형태의 날짜 텍스트 패턴이 존재해야 한다', () => {
    expect(homeScreen).toMatch(/월.*일 일정/);
  });

  test('T04 — sectionTitle 스타일이 정의되어 있어야 한다', () => {
    expect(homeScreen).toContain('sectionTitle');
  });

  test('T05 — dateStr === todayStr 비교 조건이 존재해야 한다', () => {
    expect(homeScreen).toContain('dateStr === todayStr');
  });

  test('T06 — 괄호와 함께 length를 출력하는 다른 패턴도 없어야 한다', () => {
    // 예: `(${dayClasses.length})` 형태
    expect(homeScreen).not.toMatch(/\(\$\{dayClasses\.length\}\)/);
  });

  test('T07 — 일정 섹션 제목 줄에 숫자 카운트 출력이 없어야 한다', () => {
    // 섹션 제목 부분에서 length 를 그대로 출력하는 구문 없어야 함
    const sectionTitleLine = homeScreen
      .split('\n')
      .find(l => l.includes('오늘의 일정') || l.includes('일 일정'));
    expect(sectionTitleLine).toBeDefined();
    expect(sectionTitleLine).not.toMatch(/\.length\)/);
  });

  test('T08 — 일정 수 0 출력 패턴 "(0)" 이 소스에 하드코딩되어 있지 않아야 한다', () => {
    expect(homeScreen).not.toContain('(0)');
  });

  test('T09 — renderPage 함수 내에 dayClasses 변수가 존재해야 한다', () => {
    expect(homeScreen).toContain('dayClasses');
  });

  test('T10 — dayClasses.length 는 빈 화면 처리 조건에서만 쓰여야 한다', () => {
    // dayClasses.length === 0 조건으로만 사용
    expect(homeScreen).toContain('dayClasses.length === 0');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 잘못된 표기 패턴이 없음
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] 잘못된 카운트 표기 패턴 부재', () => {
  test('T11 — "일정 (" 으로 이어지는 카운트 표기가 없어야 한다', () => {
    expect(homeScreen).not.toMatch(/일정.*\(\d/);
  });

  test('T12 — 템플릿 리터럴로 괄호 숫자를 삽입하는 패턴이 없어야 한다', () => {
    expect(homeScreen).not.toMatch(/일정.*\(\$\{/);
  });

  test('T13 — 일정 라벨 바로 뒤에 count를 출력하는 JSX 표현식이 없어야 한다', () => {
    // `일정`} ({` 패턴 확인
    expect(homeScreen).not.toMatch(/일정.*\} \(\{/);
  });

  test('T14 — "count" 라는 변수명으로 일정 수를 별도 노출하지 않아야 한다', () => {
    // 화면에 count 변수를 JSX로 직접 출력하는 경우 없어야 함
    expect(homeScreen).not.toMatch(/<Text[^>]*>\{count\}/);
  });

  test('T15 — dayClasses.length 를 JSX 텍스트 내에서 직접 렌더링하지 않아야 한다', () => {
    // {dayClasses.length} 단독으로 Text 내에 있으면 안 됨 (조건식 제외)
    expect(homeScreen).not.toMatch(/>\s*\{dayClasses\.length\}\s*</);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 사이드이펙트 — 기존 기능 유지 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] 기존 기능 유지', () => {
  test('T16 — 빈 일정 안내 텍스트가 유지되어야 한다 (오늘)', () => {
    expect(homeScreen).toContain('오늘 예정된 강의가 없습니다.');
  });

  test('T17 — 빈 일정 안내 텍스트가 유지되어야 한다 (다른 날)', () => {
    expect(homeScreen).toContain('해당 날짜에 예정된 강의가 없습니다.');
  });

  test('T18 — 날짜 네비게이션 버튼 (ChevronLeft, ChevronRight) 이 유지되어야 한다', () => {
    expect(homeScreen).toContain('ChevronLeft');
    expect(homeScreen).toContain('ChevronRight');
  });

  test('T19 — 오늘로 이동 힌트 텍스트가 유지되어야 한다', () => {
    expect(homeScreen).toContain('오늘로 이동');
  });

  test('T20 — scrollToPrev 와 scrollToNext 핸들러가 유지되어야 한다', () => {
    expect(homeScreen).toContain('scrollToPrev');
    expect(homeScreen).toContain('scrollToNext');
  });
});
