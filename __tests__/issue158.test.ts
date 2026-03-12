/**
 * Tests for issue #158: 위치 권한 게이트 및 설정 복구 플로우
 * Covers: locationPermission.ts utility + ScheduleContext permission logic
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

// ────────────────────────────────────────────────────────────────
// isLocationActionAllowed
// ────────────────────────────────────────────────────────────────
describe('isLocationActionAllowed', () => {
    test('returns true when status is granted', () => {
        expect(isLocationActionAllowed('granted')).toBe(true);
    });

    test('returns false when status is denied', () => {
        expect(isLocationActionAllowed('denied')).toBe(false);
    });

    test('returns false when status is undetermined', () => {
        expect(isLocationActionAllowed('undetermined')).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────
// getPermissionBlockedLabel
// ────────────────────────────────────────────────────────────────
describe('getPermissionBlockedLabel', () => {
    test('returns Korean label for permission blocked', () => {
        const label = getPermissionBlockedLabel();
        expect(label).toBe('위치 권한 필요');
    });

    test('label is a non-empty string', () => {
        expect(getPermissionBlockedLabel().length).toBeGreaterThan(0);
    });
});

// ────────────────────────────────────────────────────────────────
// getPermissionBannerMessage
// ────────────────────────────────────────────────────────────────
describe('getPermissionBannerMessage', () => {
    test('returns null when permission is granted', () => {
        expect(getPermissionBannerMessage('granted')).toBeNull();
    });

    test('returns undetermined message when status is undetermined', () => {
        const msg = getPermissionBannerMessage('undetermined');
        expect(msg).not.toBeNull();
        expect(msg).toContain('탭하여 허용');
    });

    test('returns denied message when status is denied', () => {
        const msg = getPermissionBannerMessage('denied');
        expect(msg).not.toBeNull();
        expect(msg).toContain('설정');
    });

    test('undetermined message mentions feature availability', () => {
        const msg = getPermissionBannerMessage('undetermined');
        expect(msg).toContain('출발');
    });

    test('denied message does not contain undetermined wording', () => {
        const msg = getPermissionBannerMessage('denied');
        expect(msg).not.toContain('탭하여 허용');
    });
});

// ────────────────────────────────────────────────────────────────
// mapExpoPermissionStatus
// ────────────────────────────────────────────────────────────────
describe('mapExpoPermissionStatus', () => {
    test('maps "granted" string to granted', () => {
        expect(mapExpoPermissionStatus('granted')).toBe('granted');
    });

    test('maps "denied" string to denied', () => {
        expect(mapExpoPermissionStatus('denied')).toBe('denied');
    });

    test('maps unknown string to undetermined', () => {
        expect(mapExpoPermissionStatus('unknown')).toBe('undetermined');
    });

    test('maps empty string to undetermined', () => {
        expect(mapExpoPermissionStatus('')).toBe('undetermined');
    });

    test('maps "restricted" (iOS) to undetermined', () => {
        expect(mapExpoPermissionStatus('restricted')).toBe('undetermined');
    });
});

// ────────────────────────────────────────────────────────────────
// resolveActionLabel
// ────────────────────────────────────────────────────────────────
describe('resolveActionLabel', () => {
    test('returns base label when permission is granted', () => {
        expect(resolveActionLabel('출발', true)).toBe('출발');
    });

    test('returns blocked label when permission not granted', () => {
        expect(resolveActionLabel('출발', false)).toBe('위치 권한 필요');
    });

    test('returns base label "도착 확인" when granted', () => {
        expect(resolveActionLabel('도착 확인', true)).toBe('도착 확인');
    });

    test('returns blocked label for arrive action when denied', () => {
        expect(resolveActionLabel('도착 확인', false)).toBe('위치 권한 필요');
    });

    test('returns base label "강의 종료" when granted', () => {
        expect(resolveActionLabel('강의 종료', true)).toBe('강의 종료');
    });

    test('returns blocked label for finish action when denied', () => {
        expect(resolveActionLabel('강의 종료', false)).toBe('위치 권한 필요');
    });
});

// ────────────────────────────────────────────────────────────────
// resolveActionDisabled
// ────────────────────────────────────────────────────────────────
describe('resolveActionDisabled', () => {
    test('GPS action disabled when permission not granted', () => {
        expect(resolveActionDisabled(false, false, true)).toBe(true);
    });

    test('GPS action enabled when permission granted and base not disabled', () => {
        expect(resolveActionDisabled(false, true, true)).toBe(false);
    });

    test('Non-GPS action follows base disabled only (not granted)', () => {
        expect(resolveActionDisabled(false, false, false)).toBe(false);
    });

    test('Non-GPS action disabled by base flag', () => {
        expect(resolveActionDisabled(true, true, false)).toBe(true);
    });

    test('GPS action disabled when both base disabled and permission not granted', () => {
        expect(resolveActionDisabled(true, false, true)).toBe(true);
    });

    test('GPS action with granted but base disabled stays disabled', () => {
        expect(resolveActionDisabled(true, true, true)).toBe(true);
    });

    test('Non-GPS action not affected by permission', () => {
        // Even if permission is not granted, non-GPS action unaffected
        expect(resolveActionDisabled(false, false, false)).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────
// shouldOpenSettings
// ────────────────────────────────────────────────────────────────
describe('shouldOpenSettings', () => {
    test('returns true when status is denied', () => {
        expect(shouldOpenSettings('denied')).toBe(true);
    });

    test('returns false when status is undetermined', () => {
        expect(shouldOpenSettings('undetermined')).toBe(false);
    });

    test('returns false when status is granted', () => {
        expect(shouldOpenSettings('granted')).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────
// shouldRequestPermission
// ────────────────────────────────────────────────────────────────
describe('shouldRequestPermission', () => {
    test('returns true when status is undetermined', () => {
        expect(shouldRequestPermission('undetermined')).toBe(true);
    });

    test('returns false when status is denied', () => {
        expect(shouldRequestPermission('denied')).toBe(false);
    });

    test('returns false when status is granted', () => {
        expect(shouldRequestPermission('granted')).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────
// Integration / combination tests
// ────────────────────────────────────────────────────────────────
describe('Permission gate integration', () => {
    const statuses: LocationPermissionStatus[] = ['granted', 'denied', 'undetermined'];

    test('banner message and action allowed are consistent (granted has null banner and allows action)', () => {
        const msg = getPermissionBannerMessage('granted');
        const allowed = isLocationActionAllowed('granted');
        expect(msg).toBeNull();
        expect(allowed).toBe(true);
    });

    test('denied status: banner shown, settings flow triggered, action blocked', () => {
        const msg = getPermissionBannerMessage('denied');
        const allowed = isLocationActionAllowed('denied');
        const openSettings = shouldOpenSettings('denied');
        const requestPerm = shouldRequestPermission('denied');
        expect(msg).not.toBeNull();
        expect(allowed).toBe(false);
        expect(openSettings).toBe(true);
        expect(requestPerm).toBe(false);
    });

    test('undetermined status: banner shown, request permission, no open settings', () => {
        const msg = getPermissionBannerMessage('undetermined');
        const allowed = isLocationActionAllowed('undetermined');
        const openSettings = shouldOpenSettings('undetermined');
        const requestPerm = shouldRequestPermission('undetermined');
        expect(msg).not.toBeNull();
        expect(allowed).toBe(false);
        expect(openSettings).toBe(false);
        expect(requestPerm).toBe(true);
    });

    test('resolveActionLabel returns blocked label for all non-granted statuses', () => {
        (['denied', 'undetermined'] as LocationPermissionStatus[]).forEach(status => {
            const allowed = isLocationActionAllowed(status);
            const label = resolveActionLabel('출발', allowed);
            expect(label).toBe('위치 권한 필요');
        });
    });

    test('mapExpoPermissionStatus followed by isLocationActionAllowed is consistent', () => {
        expect(isLocationActionAllowed(mapExpoPermissionStatus('granted'))).toBe(true);
        expect(isLocationActionAllowed(mapExpoPermissionStatus('denied'))).toBe(false);
        expect(isLocationActionAllowed(mapExpoPermissionStatus('other'))).toBe(false);
    });

    test('All non-granted statuses disable GPS action button', () => {
        (['denied', 'undetermined'] as LocationPermissionStatus[]).forEach(status => {
            const granted = isLocationActionAllowed(status);
            expect(resolveActionDisabled(false, granted, true)).toBe(true);
        });
    });
});
