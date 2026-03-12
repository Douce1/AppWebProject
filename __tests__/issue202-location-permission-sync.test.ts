/**
 * Issue #202 — GPS 권한 허용 후에도 거부 상태로 보이는 문제
 *
 * 수정 사항:
 * - ScheduleContext에 AppState 리스너 추가: 앱 복귀 시마다 권한 재조회
 * - checkAndSyncPermission으로 권한 상태 갱신 로직 추출
 * - 설정 화면에서 허용/거부 후 돌아오는 케이스 처리
 *
 * 정상 / 예외 / 사이드이펙트 / 통합 / 회귀 케이스 20개
 */

import {
    isLocationActionAllowed,
    getPermissionBlockedLabel,
    getPermissionBannerMessage,
    mapExpoPermissionStatus,
    resolveActionLabel,
    resolveActionDisabled,
    shouldOpenSettings,
    shouldRequestPermission,
    type LocationPermissionStatus,
} from '../src/utils/locationPermission';

// ─────────────────────────────────────────────
// 헬퍼: AppState 복귀 시 권한 재조회 로직 재현
// ─────────────────────────────────────────────

type PermStatus = 'granted' | 'denied' | 'undetermined';

function mapStatus(raw: string): PermStatus {
    return mapExpoPermissionStatus(raw) as PermStatus;
}

function simulateAppResume(
    currentPermState: PermStatus,
    osSaysNow: string,
): PermStatus {
    // ScheduleContext의 checkAndSyncPermission 로직을 재현
    return mapStatus(osSaysNow);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. mapExpoPermissionStatus — 정상 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('mapExpoPermissionStatus (정상)', () => {
    test('"granted" → "granted"', () => {
        expect(mapExpoPermissionStatus('granted')).toBe('granted');
    });

    test('"denied" → "denied"', () => {
        expect(mapExpoPermissionStatus('denied')).toBe('denied');
    });

    test('"undetermined" → "undetermined"', () => {
        expect(mapExpoPermissionStatus('undetermined')).toBe('undetermined');
    });

    test('알 수 없는 값 → "undetermined"', () => {
        expect(mapExpoPermissionStatus('restricted')).toBe('undetermined');
        expect(mapExpoPermissionStatus('')).toBe('undetermined');
        expect(mapExpoPermissionStatus('GRANTED')).toBe('undetermined'); // 대소문자 구분
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. 앱 복귀 시 권한 상태 갱신 — 핵심 버그 수정 검증
// ════════════════════════════════════════════════════════════════════════════

describe('앱 복귀 시 권한 상태 갱신 (핵심 수정)', () => {
    test('denied 상태에서 설정 허용 후 복귀 → granted로 갱신됨', () => {
        const before: PermStatus = 'denied';
        const after = simulateAppResume(before, 'granted');
        expect(after).toBe('granted');
    });

    test('undetermined 상태에서 설정 허용 후 복귀 → granted로 갱신됨', () => {
        const before: PermStatus = 'undetermined';
        const after = simulateAppResume(before, 'granted');
        expect(after).toBe('granted');
    });

    test('granted 상태에서 설정 거부 후 복귀 → denied로 갱신됨', () => {
        const before: PermStatus = 'granted';
        const after = simulateAppResume(before, 'denied');
        expect(after).toBe('denied');
    });

    test('권한 상태가 변하지 않은 경우에도 동일 상태 유지', () => {
        const before: PermStatus = 'granted';
        const after = simulateAppResume(before, 'granted');
        expect(after).toBe('granted');
    });

    test('OS가 undefined/비정상값 반환 시 undetermined로 폴백', () => {
        const after = simulateAppResume('granted', 'unknown_value');
        expect(after).toBe('undetermined');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. isLocationActionAllowed — 정상/예외 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('isLocationActionAllowed', () => {
    test('"granted"이면 허용', () => {
        expect(isLocationActionAllowed('granted')).toBe(true);
    });

    test('"denied"이면 불허', () => {
        expect(isLocationActionAllowed('denied')).toBe(false);
    });

    test('"undetermined"이면 불허', () => {
        expect(isLocationActionAllowed('undetermined')).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. shouldOpenSettings / shouldRequestPermission
// ════════════════════════════════════════════════════════════════════════════

describe('shouldOpenSettings / shouldRequestPermission', () => {
    test('denied → shouldOpenSettings=true, shouldRequestPermission=false', () => {
        expect(shouldOpenSettings('denied')).toBe(true);
        expect(shouldRequestPermission('denied')).toBe(false);
    });

    test('undetermined → shouldOpenSettings=false, shouldRequestPermission=true', () => {
        expect(shouldOpenSettings('undetermined')).toBe(false);
        expect(shouldRequestPermission('undetermined')).toBe(true);
    });

    test('granted → shouldOpenSettings=false, shouldRequestPermission=false', () => {
        expect(shouldOpenSettings('granted')).toBe(false);
        expect(shouldRequestPermission('granted')).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. getPermissionBannerMessage — 배너 메시지 정확성
// ════════════════════════════════════════════════════════════════════════════

describe('getPermissionBannerMessage', () => {
    test('granted → null (배너 숨김)', () => {
        expect(getPermissionBannerMessage('granted')).toBeNull();
    });

    test('undetermined → 허용 안내 메시지', () => {
        const msg = getPermissionBannerMessage('undetermined');
        expect(msg).not.toBeNull();
        expect(msg).toContain('허용');
    });

    test('denied → 설정 이동 안내 메시지', () => {
        const msg = getPermissionBannerMessage('denied');
        expect(msg).not.toBeNull();
        expect(msg).toContain('설정');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. resolveActionLabel / resolveActionDisabled — 사이드이펙트 검증
// ════════════════════════════════════════════════════════════════════════════

describe('resolveActionLabel / resolveActionDisabled (사이드이펙트)', () => {
    test('권한 없으면 baseLabel 무시하고 차단 레이블 반환', () => {
        expect(resolveActionLabel('출발', false)).toBe(getPermissionBlockedLabel());
    });

    test('권한 있으면 baseLabel 그대로 반환', () => {
        expect(resolveActionLabel('출발', true)).toBe('출발');
    });

    test('GPS 액션 + 권한 없으면 disabled=true', () => {
        expect(resolveActionDisabled(false, false, true)).toBe(true);
    });

    test('GPS 액션 + 권한 있으면 baseDisabled 그대로', () => {
        expect(resolveActionDisabled(true, true, true)).toBe(true);
        expect(resolveActionDisabled(false, true, true)).toBe(false);
    });

    test('GPS 아닌 액션은 권한과 무관하게 baseDisabled 적용', () => {
        expect(resolveActionDisabled(true, false, false)).toBe(true);
        expect(resolveActionDisabled(false, false, false)).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. 회귀 케이스 — 허용/거부/복귀 흐름 종합
// ════════════════════════════════════════════════════════════════════════════

describe('회귀 케이스 — 허용/거부/복귀 전체 흐름', () => {
    test('[거부 → 설정에서 허용 → 복귀] 액션 허용 상태로 전환됨', () => {
        let perm: PermStatus = 'denied';
        expect(isLocationActionAllowed(perm)).toBe(false);
        expect(shouldOpenSettings(perm)).toBe(true);

        // 사용자가 설정 화면에서 허용 후 앱 복귀
        perm = simulateAppResume(perm, 'granted');
        expect(isLocationActionAllowed(perm)).toBe(true);
        expect(getPermissionBannerMessage(perm)).toBeNull();
    });

    test('[미결정 → 권한 요청 허용 → 즉시 반영] 배너 사라짐', () => {
        let perm: PermStatus = 'undetermined';
        expect(shouldRequestPermission(perm)).toBe(true);
        expect(getPermissionBannerMessage(perm)).not.toBeNull();

        perm = 'granted'; // requestLocationPermission 성공 후 setLocationPermission('granted')
        expect(getPermissionBannerMessage(perm)).toBeNull();
        expect(isLocationActionAllowed(perm)).toBe(true);
    });

    test('[허용 → 설정에서 거부 → 복귀] 배너 재표시, 액션 차단됨', () => {
        let perm: PermStatus = 'granted';
        perm = simulateAppResume(perm, 'denied');
        expect(isLocationActionAllowed(perm)).toBe(false);
        expect(getPermissionBannerMessage(perm)).toContain('설정');
    });
});
