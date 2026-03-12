/**
 * Utility functions for arrival/finish retry UX and suspicious guidance (#162)
 *
 * Processes ApiAttendanceEvent responses to determine user-facing messages
 * for retry, low accuracy, suspicious location, and finish-reminder flows.
 */

/** GPS accuracy thresholds (metres) — aligned with GPS policy doc (#157) */
export const ACCURACY_GOOD_METERS = 80;
export const ACCURACY_ACCEPTABLE_METERS = 150;
export const ACCURACY_SUSPICIOUS_METERS = 300;

/** Radius within which a checkin is considered valid (metres) */
export const LOCATION_VALID_RADIUS_METERS = 250;

/** LocationStatus values from the API */
export type LocationStatus = 'OK' | 'SUSPICIOUS' | 'OUT_OF_RANGE';

export interface CheckinResultInfo {
    isValid: boolean;
    locationStatus: string; // 'OK' | 'SUSPICIOUS' (from API)
    distanceMeters: number;
    accuracyMeters: number;
}

export type CheckinResultUXType =
    | 'SUCCESS'
    | 'OUT_OF_RANGE'
    | 'LOW_ACCURACY'
    | 'SUSPICIOUS'
    | 'SUCCESS_WITH_WARNING';

export interface CheckinResultUX {
    type: CheckinResultUXType;
    title: string;
    message: string;
    canRetry: boolean;
}

/**
 * Classify a checkin result into a UX type.
 *
 * Priority:
 * 1. Invalid + out-of-range → OUT_OF_RANGE (retry)
 * 2. Invalid + low accuracy → LOW_ACCURACY (retry)
 * 3. Valid + suspicious → SUCCESS_WITH_WARNING
 * 4. Invalid + suspicious → SUSPICIOUS (retry)
 * 5. Valid → SUCCESS
 */
export function classifyCheckinResult(info: CheckinResultInfo): CheckinResultUXType {
    const { isValid, locationStatus, distanceMeters, accuracyMeters } = info;

    if (!isValid) {
        if (distanceMeters > LOCATION_VALID_RADIUS_METERS && accuracyMeters <= ACCURACY_ACCEPTABLE_METERS) {
            return 'OUT_OF_RANGE';
        }
        if (accuracyMeters > ACCURACY_ACCEPTABLE_METERS) {
            return 'LOW_ACCURACY';
        }
        if (locationStatus === 'SUSPICIOUS') {
            return 'SUSPICIOUS';
        }
        return 'OUT_OF_RANGE';
    }

    if (locationStatus === 'SUSPICIOUS') {
        return 'SUCCESS_WITH_WARNING';
    }

    return 'SUCCESS';
}

/**
 * Build full UX object (title, message, canRetry) from a checkin result.
 */
export function buildCheckinResultUX(info: CheckinResultInfo): CheckinResultUX {
    const type = classifyCheckinResult(info);

    switch (type) {
        case 'OUT_OF_RANGE':
            return {
                type,
                title: '도착 위치 범위 초과',
                message: `현재 위치가 수업 장소에서 ${Math.round(info.distanceMeters)}m 떨어져 있습니다. 장소에 더 가까이 이동한 후 다시 시도해주세요.`,
                canRetry: true,
            };

        case 'LOW_ACCURACY':
            return {
                type,
                title: 'GPS 정확도 낮음',
                message: `현재 GPS 정확도가 낮습니다 (약 ${Math.round(info.accuracyMeters)}m). 실외로 이동하거나 잠시 기다린 후 다시 시도해주세요.`,
                canRetry: true,
            };

        case 'SUSPICIOUS':
            return {
                type,
                title: '위치 확인 불가',
                message: `위치 정보가 불안정합니다 (${Math.round(info.distanceMeters)}m). 실내에 있는 경우 실외로 이동 후 다시 시도해주세요.`,
                canRetry: true,
            };

        case 'SUCCESS_WITH_WARNING':
            return {
                type,
                title: '도착 완료 (참고 안내)',
                message: `도착이 등록되었습니다. 다만 GPS 신호가 불안정하여 위치가 정확하지 않을 수 있습니다 (${Math.round(info.distanceMeters)}m). 문제가 있을 경우 관리자에게 문의하세요.`,
                canRetry: false,
            };

        case 'SUCCESS':
        default:
            return {
                type: 'SUCCESS',
                title: '완료',
                message: '정상적으로 처리되었습니다.',
                canRetry: false,
            };
    }
}

/**
 * Returns the user-facing accuracy description string.
 */
export function describeAccuracy(accuracyMeters: number): string {
    if (accuracyMeters <= ACCURACY_GOOD_METERS) return '정확도 좋음';
    if (accuracyMeters <= ACCURACY_ACCEPTABLE_METERS) return '정확도 보통';
    if (accuracyMeters <= ACCURACY_SUSPICIOUS_METERS) return '정확도 낮음';
    return '정확도 매우 낮음 (비정상)';
}

/**
 * Returns true if the accuracy is low enough to warrant a retry recommendation.
 */
export function isLowAccuracy(accuracyMeters: number): boolean {
    return accuracyMeters > ACCURACY_ACCEPTABLE_METERS;
}

/**
 * Returns true if the distance indicates the user is outside the valid radius.
 */
export function isOutOfRange(distanceMeters: number): boolean {
    return distanceMeters > LOCATION_VALID_RADIUS_METERS;
}

/**
 * Returns true if the location is suspicious (very far or accuracy extremely poor).
 */
export function isSuspicious(distanceMeters: number, accuracyMeters: number): boolean {
    return distanceMeters > ACCURACY_SUSPICIOUS_METERS || accuracyMeters > ACCURACY_SUSPICIOUS_METERS;
}

/**
 * Build the finish-reminder notification UX message.
 * Called when a push notification for finish-reminder is received.
 */
export function buildFinishReminderMessage(lessonTitle: string): string {
    return `'${lessonTitle}' 강의 종료 처리가 아직 완료되지 않았습니다. 지금 바로 종료 처리를 진행해주세요.`;
}

/**
 * Build the finish-reminder notification title.
 */
export function buildFinishReminderTitle(): string {
    return '강의 종료 처리 필요';
}
