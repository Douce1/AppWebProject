/**
 * gpsNotificationEngine.ts
 *
 * GPS 스마트 알림 엔진: 수업 목적지 좌표, 현재 시간/위치를 기반으로
 * 출발 필요 / 지각 위험 / 도착 반경 진입 등을 판단합니다.
 *
 * 모든 함수는 순수 함수 또는 명시적 의존성을 주입받아 테스트 용이성을 유지합니다.
 */

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** 도착 반경 (미터): 이 범위 안에 들어오면 "도착 가능" 상태로 판단 */
export const ARRIVAL_RADIUS_METERS = 300;

/** 출발 알림 기준 (분): 수업 시작까지 이 시간 이하이면 출발 알림 발송 */
export const DEPARTURE_ALERT_MINUTES = 60;

/** 지각 위험 기준 (분): 수업 시작까지 이 시간 이하이면 지각 위험 알림 */
export const LATE_RISK_ALERT_MINUTES = 15;

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type NotificationAlertType = 'DEPARTURE' | 'ARRIVAL_PROXIMITY' | 'LATE_RISK';

export interface LessonForAlert {
    lessonId: string;
    startsAt: string; // ISO date string
    venueLat?: number | null;
    venueLng?: number | null;
}

export interface CurrentPosition {
    lat: number;
    lng: number;
}

export interface LessonAlertResult {
    lessonId: string;
    alerts: NotificationAlertType[];
}

// ─── 거리 계산 ─────────────────────────────────────────────────────────────────

/**
 * Haversine 공식으로 두 좌표 사이의 거리를 미터 단위로 반환합니다.
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const R = 6371000; // 지구 반지름 (미터)
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * 현재 위치가 목적지 반경 내에 있는지 판단합니다.
 */
export function isNearVenue(
    currentLat: number,
    currentLng: number,
    venueLat: number,
    venueLng: number,
    thresholdMeters: number = ARRIVAL_RADIUS_METERS,
): boolean {
    return calculateDistance(currentLat, currentLng, venueLat, venueLng) <= thresholdMeters;
}

// ─── 시간 기반 판단 ────────────────────────────────────────────────────────────

/**
 * 수업 시작까지 남은 분을 반환합니다. 음수이면 이미 시작했거나 지난 수업.
 */
export function getMinutesUntilLesson(startsAt: string, now: Date = new Date()): number {
    const startMs = new Date(startsAt).getTime();
    const diffMs = startMs - now.getTime();
    return Math.floor(diffMs / 60000);
}

/**
 * 출발 알림이 필요한지 판단합니다.
 * 수업 시작까지 `thresholdMinutes` 이내이면 true.
 */
export function shouldSendDepartureAlert(
    startsAt: string,
    now: Date = new Date(),
    thresholdMinutes: number = DEPARTURE_ALERT_MINUTES,
): boolean {
    const minutes = getMinutesUntilLesson(startsAt, now);
    return minutes > 0 && minutes <= thresholdMinutes;
}

/**
 * 지각 위험 알림이 필요한지 판단합니다.
 * 수업 시작까지 `thresholdMinutes` 이내이면 true.
 */
export function shouldSendLateRiskAlert(
    startsAt: string,
    now: Date = new Date(),
    thresholdMinutes: number = LATE_RISK_ALERT_MINUTES,
): boolean {
    const minutes = getMinutesUntilLesson(startsAt, now);
    return minutes > 0 && minutes <= thresholdMinutes;
}

// ─── 중복 방지 키 ──────────────────────────────────────────────────────────────

/**
 * 같은 수업에 대한 중복 알림을 막기 위한 고유 키를 생성합니다.
 * 형식: `{lessonId}:{alertType}:{YYYY-MM-DD}`
 */
export function buildNotificationKey(
    lessonId: string,
    alertType: NotificationAlertType,
    now: Date = new Date(),
): string {
    const dateStr = now.toISOString().slice(0, 10);
    return `${lessonId}:${alertType}:${dateStr}`;
}

/**
 * 이미 발송된 알림인지 확인합니다.
 */
export function isAlreadyFired(
    key: string,
    firedKeys: ReadonlySet<string>,
): boolean {
    return firedKeys.has(key);
}

// ─── 좌표 없는 수업 Fallback ───────────────────────────────────────────────────

/**
 * 수업에 유효한 목적지 좌표가 있는지 확인합니다.
 */
export function hasVenueCoordinates(lesson: LessonForAlert): boolean {
    return (
        lesson.venueLat != null &&
        lesson.venueLng != null &&
        !isNaN(lesson.venueLat) &&
        !isNaN(lesson.venueLng)
    );
}

// ─── 핵심 엔진 ────────────────────────────────────────────────────────────────

/**
 * 단일 수업에 대해 발송해야 할 알림 목록을 평가합니다.
 *
 * - 좌표가 있는 수업: DEPARTURE, LATE_RISK, ARRIVAL_PROXIMITY 모두 평가
 * - 좌표가 없는 수업: 시간 기반 알림만 평가 (DEPARTURE, LATE_RISK)
 * - 이미 발송된 알림은 제외 (firedKeys 기반 deduplication)
 *
 * @returns 발송해야 할 alert 목록 (이미 발송된 것 제외)
 */
export function evaluateLessonAlerts(
    lesson: LessonForAlert,
    currentPosition: CurrentPosition | null,
    firedKeys: ReadonlySet<string>,
    now: Date = new Date(),
): LessonAlertResult {
    const alerts: NotificationAlertType[] = [];

    const lateRiskKey = buildNotificationKey(lesson.lessonId, 'LATE_RISK', now);
    const departureKey = buildNotificationKey(lesson.lessonId, 'DEPARTURE', now);
    const arrivalKey = buildNotificationKey(lesson.lessonId, 'ARRIVAL_PROXIMITY', now);

    // 지각 위험 (LATE_RISK)은 DEPARTURE보다 더 긴박 — 먼저 체크
    if (shouldSendLateRiskAlert(lesson.startsAt, now) && !isAlreadyFired(lateRiskKey, firedKeys)) {
        alerts.push('LATE_RISK');
    } else if (shouldSendDepartureAlert(lesson.startsAt, now) && !isAlreadyFired(departureKey, firedKeys)) {
        // LATE_RISK에 해당하지 않는 경우에만 DEPARTURE 평가 (중복 방지)
        alerts.push('DEPARTURE');
    }

    // 도착 반경 (좌표 있는 수업만, 이동 관련 시간 창 내에서만 평가)
    // 수업 시작까지 DEPARTURE_ALERT_MINUTES 이내이거나 30분 이내에 시작된 수업만 해당
    const minutesUntil = getMinutesUntilLesson(lesson.startsAt, now);
    const inTravelWindow = minutesUntil <= DEPARTURE_ALERT_MINUTES && minutesUntil > -30;
    if (
        inTravelWindow &&
        hasVenueCoordinates(lesson) &&
        currentPosition != null &&
        !isAlreadyFired(arrivalKey, firedKeys)
    ) {
        const near = isNearVenue(
            currentPosition.lat,
            currentPosition.lng,
            lesson.venueLat!,
            lesson.venueLng!,
        );
        if (near) {
            alerts.push('ARRIVAL_PROXIMITY');
        }
    }

    return { lessonId: lesson.lessonId, alerts };
}

/**
 * 여러 수업을 한 번에 평가하여 전체 알림 결과를 반환합니다.
 * 앱 진입/재개 시 호출합니다.
 */
export function evaluateAllLessons(
    lessons: LessonForAlert[],
    currentPosition: CurrentPosition | null,
    firedKeys: ReadonlySet<string>,
    now: Date = new Date(),
): LessonAlertResult[] {
    return lessons
        .map((lesson) => evaluateLessonAlerts(lesson, currentPosition, firedKeys, now))
        .filter((result) => result.alerts.length > 0);
}
