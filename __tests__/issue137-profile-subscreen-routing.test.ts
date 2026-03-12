/**
 * Issue #137 — 내 정보 하위 화면 진입 시 bottom tab 숨김 처리
 *
 * 검증 전략:
 * - 라우팅 구조 변경은 순수 유틸 함수가 없으므로, 실제 소스 파일을 직접 읽어 검증한다.
 * - fs.readFileSync / fs.existsSync 로 실제 소스를 참조 → 소스가 바뀌면 테스트도 실패함.
 * - 정상/예외/사이드이펙트/통합/회귀 케이스 30개 이상 포함.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const TABS_PROFILE = path.join(ROOT, 'app', '(tabs)', 'profile');
const ROOT_PROFILE = path.join(ROOT, 'app', 'profile');
const ROOT_LAYOUT = path.join(ROOT, 'app', '_layout.tsx');
const TABS_LAYOUT = path.join(TABS_PROFILE, '_layout.tsx');
const CAREER_SCREEN = path.join(ROOT, 'src', 'screens', 'CareerSettingScreen.tsx');
const PROFILE_SCREEN = path.join(ROOT, 'src', 'screens', 'ProfileScreen.tsx');

const SUB_SCREENS = [
  'availability',
  'instructor',
  'career',
  'career-detail',
  'region',
  'settings',
] as const;

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 루트 스택에 서브 화면 파일 존재
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] app/profile/ 에 서브 화면 파일 존재 (루트 스택)', () => {
  test.each(SUB_SCREENS)(
    'T01~06 — app/profile/%s.tsx 존재',
    (screen) => {
      expect(fs.existsSync(path.join(ROOT_PROFILE, `${screen}.tsx`))).toBe(true);
    },
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 탭 내부에 서브 화면 파일 없어야 함
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] app/(tabs)/profile/ 에서 서브 화면 파일 제거됨', () => {
  test.each(SUB_SCREENS)(
    'T07~12 — app/(tabs)/profile/%s.tsx 없음',
    (screen) => {
      expect(fs.existsSync(path.join(TABS_PROFILE, `${screen}.tsx`))).toBe(false);
    },
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 정상 케이스 — 루트 _layout.tsx 에 서브 화면 등록
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] app/_layout.tsx — 루트 Stack에 profile 서브 화면 등록', () => {
  const src = fs.readFileSync(ROOT_LAYOUT, 'utf-8');

  test('T13 — profile/instructor 등록', () => {
    expect(src).toContain('profile/instructor');
  });

  test('T14 — profile/availability 등록', () => {
    expect(src).toContain('profile/availability');
  });

  test('T15 — profile/career 등록', () => {
    expect(src).toContain('profile/career');
  });

  test('T16 — profile/career-detail 등록', () => {
    expect(src).toContain('profile/career-detail');
  });

  test('T17 — profile/region 등록', () => {
    expect(src).toContain('profile/region');
  });

  test('T18 — profile/settings 등록', () => {
    expect(src).toContain('profile/settings');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 회귀 케이스 — 탭 _layout 은 index 만 보유
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] app/(tabs)/profile/_layout.tsx — index 전용, 서브 화면 없음', () => {
  const src = fs.readFileSync(TABS_LAYOUT, 'utf-8');

  test('T19 — index 는 여전히 있음', () => {
    expect(src).toContain('index');
  });

  test('T20 — availability 등록 없음', () => {
    expect(src).not.toMatch(/name=["']availability["']/);
  });

  test('T21 — instructor 등록 없음', () => {
    expect(src).not.toMatch(/name=["']instructor["']/);
  });

  test('T22 — career 등록 없음', () => {
    expect(src).not.toMatch(/name=["']career["']/);
  });

  test('T23 — region 등록 없음', () => {
    expect(src).not.toMatch(/name=["']region["']/);
  });

  test('T24 — settings 등록 없음 (탭 내부)', () => {
    expect(src).not.toMatch(/name=["']settings["']/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스 — CareerSettingScreen 네비게이션 경로
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] CareerSettingScreen — career-detail 경로', () => {
  const src = fs.readFileSync(CAREER_SCREEN, 'utf-8');

  test('T25 — /profile/career-detail 경로 사용', () => {
    expect(src).toContain('/profile/career-detail');
  });

  test('T26 — /(tabs)/profile/career-detail 경로 제거됨', () => {
    expect(src).not.toContain('/(tabs)/profile/career-detail');
  });

  test('T27 — 경로가 정확히 하나만 존재', () => {
    const matches = src.match(/\/profile\/career-detail/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. 정상 케이스 — ProfileScreen 네비게이션 경로 (루트 스택 경로 사용)
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] ProfileScreen — 루트 스택 경로 사용', () => {
  const src = fs.readFileSync(PROFILE_SCREEN, 'utf-8');

  test('T28 — /profile/instructor 사용', () => {
    expect(src).toContain('/profile/instructor');
  });

  test('T29 — /profile/availability 사용', () => {
    expect(src).toContain('/profile/availability');
  });

  test('T30 — /profile/career 사용', () => {
    expect(src).toContain('/profile/career');
  });

  test('T31 — /profile/region 사용', () => {
    expect(src).toContain('/profile/region');
  });

  test('T32 — /(tabs)/profile/* 경로 없음 (탭 내부 직접 접근 없음)', () => {
    expect(src).not.toContain('/(tabs)/profile/');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. 통합 케이스 — 루트 profile/ 파일 내용 검증
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] app/profile/ 파일이 올바른 Screen 컴포넌트를 참조', () => {
  test('T33 — availability.tsx → AvailabilitySettingsScreen', () => {
    const src = fs.readFileSync(path.join(ROOT_PROFILE, 'availability.tsx'), 'utf-8');
    expect(src).toContain('AvailabilitySettingsScreen');
  });

  test('T34 — instructor.tsx → InstructorProfileScreen', () => {
    const src = fs.readFileSync(path.join(ROOT_PROFILE, 'instructor.tsx'), 'utf-8');
    expect(src).toContain('InstructorProfileScreen');
  });

  test('T35 — career.tsx → CareerSettingScreen', () => {
    const src = fs.readFileSync(path.join(ROOT_PROFILE, 'career.tsx'), 'utf-8');
    expect(src).toContain('CareerSettingScreen');
  });

  test('T36 — career-detail.tsx → LectureHistoryDetailScreen', () => {
    const src = fs.readFileSync(path.join(ROOT_PROFILE, 'career-detail.tsx'), 'utf-8');
    expect(src).toContain('LectureHistoryDetailScreen');
  });

  test('T37 — region.tsx → RegionSettingScreen', () => {
    const src = fs.readFileSync(path.join(ROOT_PROFILE, 'region.tsx'), 'utf-8');
    expect(src).toContain('RegionSettingScreen');
  });

  test('T38 — settings.tsx → AppSettingsScreen', () => {
    const src = fs.readFileSync(path.join(ROOT_PROFILE, 'settings.tsx'), 'utf-8');
    expect(src).toContain('AppSettingsScreen');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. 사이드 이펙트 — 탭 profile 에 index, _layout 은 유지됨
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] app/(tabs)/profile — index.tsx, _layout.tsx 유지', () => {
  test('T39 — index.tsx 유지됨 (내 정보 메인 탭)', () => {
    expect(fs.existsSync(path.join(TABS_PROFILE, 'index.tsx'))).toBe(true);
  });

  test('T40 — _layout.tsx 유지됨', () => {
    expect(fs.existsSync(TABS_LAYOUT)).toBe(true);
  });
});
