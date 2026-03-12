/**
 * Utility functions for location permission gate logic (#158)
 */

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Determines whether GPS-based actions (DEPART/ARRIVE/FINISH) are allowed.
 */
export function isLocationActionAllowed(status: LocationPermissionStatus): boolean {
    return status === 'granted';
}

/**
 * Returns a user-facing label for the action button when permission is blocked.
 */
export function getPermissionBlockedLabel(): string {
    return '위치 권한 필요';
}

/**
 * Returns the banner message based on permission status.
 */
export function getPermissionBannerMessage(status: LocationPermissionStatus): string | null {
    if (status === 'granted') return null;
    if (status === 'undetermined') {
        return '위치 권한을 허용하면 출발/도착/종료 기능을 사용할 수 있습니다. 탭하여 허용';
    }
    return '위치 권한이 거부되었습니다. 탭하여 설정에서 허용하세요';
}

/**
 * Maps an expo-location permission status string to our internal type.
 */
export function mapExpoPermissionStatus(expoStatus: string): LocationPermissionStatus {
    if (expoStatus === 'granted') return 'granted';
    if (expoStatus === 'denied') return 'denied';
    return 'undetermined';
}

/**
 * Determines action label based on current state and permission.
 */
export function resolveActionLabel(
    baseLabel: string,
    isPermissionGranted: boolean,
): string {
    if (!isPermissionGranted) return getPermissionBlockedLabel();
    return baseLabel;
}

/**
 * Determines whether the action button should be disabled.
 * For GPS actions, disabled if permission not granted OR other condition disables it.
 */
export function resolveActionDisabled(
    baseDisabled: boolean,
    isPermissionGranted: boolean,
    isGpsAction: boolean,
): boolean {
    if (isGpsAction && !isPermissionGranted) return true;
    return baseDisabled;
}

/**
 * Returns whether we should show the settings-redirect flow (vs initial request).
 */
export function shouldOpenSettings(status: LocationPermissionStatus): boolean {
    return status === 'denied';
}

/**
 * Returns whether we should request permission (vs open settings).
 */
export function shouldRequestPermission(status: LocationPermissionStatus): boolean {
    return status === 'undetermined';
}
