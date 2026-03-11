/**
 * Issue #100: GPS 스마트 알림 엔진 테스트
 *
 * 테스트 범위:
 *  - calculateDistance: Haversine 거리 계산
 *  - isNearVenue: 도착 반경 판단
 *  - getMinutesUntilLesson: 수업까지 남은 분
 *  - shouldSendDepartureAlert: 출발 알림 조건
 *  - shouldSendLateRiskAlert: 지각 위험 알림 조건
 *  - buildNotificationKey: 중복 방지 키 생성
 *  - isAlreadyFired: 중복 체크
 *  - hasVenueCoordinates: 좌표 유효성
 *  - evaluateLessonAlerts: 핵심 엔진 단일 수업 평가
 *  - evaluateAllLessons: 다수 수업 일괄 평가
 */

import {
    calculateDistance,
    isNearVenue,
    getMinutesUntilLesson,
    shouldSendDepartureAlert,
    shouldSendLateRiskAlert,
    buildNotificationKey,
    isAlreadyFired,
    hasVenueCoordinates,
    evaluateLessonAlerts,
    evaluateAllLessons,
    ARRIVAL_RADIUS_METERS,
    DEPARTURE_ALERT_MINUTES,
    LATE_RISK_ALERT_MINUTES,
    type LessonForAlert,
    type CurrentPosition,
} from '../src/services/gpsNotificationEngine';

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

function minutesFromNow(minutes: number, base: Date = new Date()): string {
    return new Date(base.getTime() + minutes * 60000).toISOString();
}

function makeLesson(overrides: Partial<LessonForAlert> = {}): LessonForAlert {
    return {
        lessonId: 'lesson-1',
        startsAt: minutesFromNow(30),
        venueLat: 37.5665,
        venueLng: 126.9780,
        ...overrides,
    };
}

// 서울 국립중앙박물관 근처 좌표
const VENUE: CurrentPosition = { lat: 37.5665, lng: 126.9780 };
// 약 500m 떨어진 위치
const FAR_POS: CurrentPosition = { lat: 37.5710, lng: 126.9780 };
// 약 100m 떨어진 위치 (반경 내)
const NEAR_POS: CurrentPosition = { lat: 37.5674, lng: 126.9780 };

// ─── calculateDistance ────────────────────────────────────────────────────────

describe('calculateDistance', () => {
    it('같은 좌표는 0m 반환', () => {
        expect(calculateDistance(37.5665, 126.978, 37.5665, 126.978)).toBeCloseTo(0, 0);
    });

    it('약 500m 거리를 올바르게 계산', () => {
        const dist = calculateDistance(37.5665, 126.978, 37.5710, 126.978);
        expect(dist).toBeGreaterThan(400);
        expect(dist).toBeLessThan(600);
    });

    it('약 100m 거리를 올바르게 계산', () => {
        const dist = calculateDistance(37.5665, 126.978, 37.5674, 126.978);
        expect(dist).toBeGreaterThan(50);
        expect(dist).toBeLessThan(150);
    });

    it('음수 위도/경도도 처리 가능', () => {
        const dist = calculateDistance(-33.8688, 151.2093, -33.8688, 151.2093);
        expect(dist).toBeCloseTo(0, 0);
    });

    it('대륙간 거리는 수천km 반환', () => {
        // 서울 ~ 뉴욕 약 11,000km
        const dist = calculateDistance(37.5665, 126.978, 40.7128, -74.0060);
        expect(dist).toBeGreaterThan(10000000); // 10,000km
    });

    it('대칭성: 거리(A,B) === 거리(B,A)', () => {
        const d1 = calculateDistance(37.5665, 126.978, 37.5710, 126.978);
        const d2 = calculateDistance(37.5710, 126.978, 37.5665, 126.978);
        expect(d1).toBeCloseTo(d2, 1);
    });
});

// ─── isNearVenue ──────────────────────────────────────────────────────────────

describe('isNearVenue', () => {
    it('반경 내에 있으면 true', () => {
        expect(isNearVenue(NEAR_POS.lat, NEAR_POS.lng, VENUE.lat, VENUE.lng)).toBe(true);
    });

    it('반경 밖이면 false', () => {
        expect(isNearVenue(FAR_POS.lat, FAR_POS.lng, VENUE.lat, VENUE.lng)).toBe(false);
    });

    it('정확히 같은 좌표면 true', () => {
        expect(isNearVenue(VENUE.lat, VENUE.lng, VENUE.lat, VENUE.lng)).toBe(true);
    });

    it('커스텀 threshold 50m: 100m 거리는 false', () => {
        expect(isNearVenue(NEAR_POS.lat, NEAR_POS.lng, VENUE.lat, VENUE.lng, 50)).toBe(false);
    });

    it('커스텀 threshold 1000m: 500m 거리는 true', () => {
        expect(isNearVenue(FAR_POS.lat, FAR_POS.lng, VENUE.lat, VENUE.lng, 1000)).toBe(true);
    });

    it('기본 threshold는 ARRIVAL_RADIUS_METERS 사용', () => {
        // ARRIVAL_RADIUS_METERS=300이면 500m는 false여야 함
        expect(isNearVenue(FAR_POS.lat, FAR_POS.lng, VENUE.lat, VENUE.lng)).toBe(false);
    });
});

// ─── getMinutesUntilLesson ────────────────────────────────────────────────────

describe('getMinutesUntilLesson', () => {
    it('30분 후 수업: 약 30 반환', () => {
        const now = new Date();
        const startsAt = minutesFromNow(30, now);
        expect(getMinutesUntilLesson(startsAt, now)).toBe(30);
    });

    it('이미 지난 수업: 음수 반환', () => {
        const now = new Date();
        const startsAt = minutesFromNow(-10, now);
        expect(getMinutesUntilLesson(startsAt, now)).toBeLessThan(0);
    });

    it('지금 시작하는 수업: 0 반환', () => {
        const now = new Date();
        expect(getMinutesUntilLesson(now.toISOString(), now)).toBe(0);
    });

    it('2시간 후 수업: 120 반환', () => {
        const now = new Date();
        const startsAt = minutesFromNow(120, now);
        expect(getMinutesUntilLesson(startsAt, now)).toBe(120);
    });
});

// ─── shouldSendDepartureAlert ─────────────────────────────────────────────────

describe('shouldSendDepartureAlert', () => {
    it('30분 후 수업: 기본 threshold(60분) 내이므로 true', () => {
        const now = new Date();
        expect(shouldSendDepartureAlert(minutesFromNow(30, now), now)).toBe(true);
    });

    it('90분 후 수업: 기본 threshold(60분) 초과이므로 false', () => {
        const now = new Date();
        expect(shouldSendDepartureAlert(minutesFromNow(90, now), now)).toBe(false);
    });

    it('이미 시작된 수업: false', () => {
        const now = new Date();
        expect(shouldSendDepartureAlert(minutesFromNow(-5, now), now)).toBe(false);
    });

    it('정확히 60분: true (경계값)', () => {
        const now = new Date();
        expect(shouldSendDepartureAlert(minutesFromNow(60, now), now)).toBe(true);
    });

    it('커스텀 threshold 30분: 45분 후 수업은 false', () => {
        const now = new Date();
        expect(shouldSendDepartureAlert(minutesFromNow(45, now), now, 30)).toBe(false);
    });

    it('기본 threshold는 DEPARTURE_ALERT_MINUTES', () => {
        expect(DEPARTURE_ALERT_MINUTES).toBe(60);
    });
});

// ─── shouldSendLateRiskAlert ──────────────────────────────────────────────────

describe('shouldSendLateRiskAlert', () => {
    it('10분 후 수업: 기본 threshold(15분) 내이므로 true', () => {
        const now = new Date();
        expect(shouldSendLateRiskAlert(minutesFromNow(10, now), now)).toBe(true);
    });

    it('20분 후 수업: 기본 threshold(15분) 초과이므로 false', () => {
        const now = new Date();
        expect(shouldSendLateRiskAlert(minutesFromNow(20, now), now)).toBe(false);
    });

    it('이미 시작된 수업: false', () => {
        const now = new Date();
        expect(shouldSendLateRiskAlert(minutesFromNow(-1, now), now)).toBe(false);
    });

    it('정확히 15분: true (경계값)', () => {
        const now = new Date();
        expect(shouldSendLateRiskAlert(minutesFromNow(15, now), now)).toBe(true);
    });

    it('기본 threshold는 LATE_RISK_ALERT_MINUTES', () => {
        expect(LATE_RISK_ALERT_MINUTES).toBe(15);
    });
});

// ─── buildNotificationKey ─────────────────────────────────────────────────────

describe('buildNotificationKey', () => {
    it('lessonId, alertType, 날짜를 포함한 키 생성', () => {
        const now = new Date('2026-03-11T10:00:00Z');
        const key = buildNotificationKey('lesson-1', 'DEPARTURE', now);
        expect(key).toBe('lesson-1:DEPARTURE:2026-03-11');
    });

    it('같은 수업 다른 타입은 다른 키', () => {
        const now = new Date('2026-03-11T10:00:00Z');
        const k1 = buildNotificationKey('lesson-1', 'DEPARTURE', now);
        const k2 = buildNotificationKey('lesson-1', 'LATE_RISK', now);
        expect(k1).not.toBe(k2);
    });

    it('같은 수업 다른 날짜는 다른 키', () => {
        const d1 = new Date('2026-03-11T10:00:00Z');
        const d2 = new Date('2026-03-12T10:00:00Z');
        expect(buildNotificationKey('lesson-1', 'DEPARTURE', d1)).not.toBe(
            buildNotificationKey('lesson-1', 'DEPARTURE', d2),
        );
    });

    it('ARRIVAL_PROXIMITY 타입 키 생성', () => {
        const now = new Date('2026-03-11T10:00:00Z');
        const key = buildNotificationKey('lesson-2', 'ARRIVAL_PROXIMITY', now);
        expect(key).toBe('lesson-2:ARRIVAL_PROXIMITY:2026-03-11');
    });
});

// ─── isAlreadyFired ───────────────────────────────────────────────────────────

describe('isAlreadyFired', () => {
    it('이미 발송된 키이면 true', () => {
        const fired = new Set(['lesson-1:DEPARTURE:2026-03-11']);
        expect(isAlreadyFired('lesson-1:DEPARTURE:2026-03-11', fired)).toBe(true);
    });

    it('발송되지 않은 키이면 false', () => {
        const fired = new Set(['lesson-1:DEPARTURE:2026-03-11']);
        expect(isAlreadyFired('lesson-1:LATE_RISK:2026-03-11', fired)).toBe(false);
    });

    it('빈 Set이면 항상 false', () => {
        expect(isAlreadyFired('any-key', new Set())).toBe(false);
    });
});

// ─── hasVenueCoordinates ──────────────────────────────────────────────────────

describe('hasVenueCoordinates', () => {
    it('유효한 좌표 있으면 true', () => {
        expect(hasVenueCoordinates(makeLesson({ venueLat: 37.5, venueLng: 126.9 }))).toBe(true);
    });

    it('venueLat null이면 false', () => {
        expect(hasVenueCoordinates(makeLesson({ venueLat: null }))).toBe(false);
    });

    it('venueLng null이면 false', () => {
        expect(hasVenueCoordinates(makeLesson({ venueLng: null }))).toBe(false);
    });

    it('둘 다 undefined이면 false', () => {
        expect(hasVenueCoordinates(makeLesson({ venueLat: undefined, venueLng: undefined }))).toBe(false);
    });

    it('NaN 좌표는 false', () => {
        expect(hasVenueCoordinates(makeLesson({ venueLat: NaN, venueLng: 126.9 }))).toBe(false);
    });
});

// ─── evaluateLessonAlerts ─────────────────────────────────────────────────────

describe('evaluateLessonAlerts', () => {
    it('30분 후 수업 + 500m 거리: DEPARTURE 알림 발생 (ARRIVAL_PROXIMITY는 미발생)', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(30, now) });
        const result = evaluateLessonAlerts(lesson, FAR_POS, new Set(), now);
        expect(result.alerts).toContain('DEPARTURE');
        expect(result.alerts).not.toContain('ARRIVAL_PROXIMITY');
    });

    it('10분 후 수업: LATE_RISK 알림 발생, DEPARTURE는 미발생', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(10, now) });
        const result = evaluateLessonAlerts(lesson, FAR_POS, new Set(), now);
        expect(result.alerts).toContain('LATE_RISK');
        expect(result.alerts).not.toContain('DEPARTURE');
    });

    it('30분 후 수업 + 100m 거리: DEPARTURE + ARRIVAL_PROXIMITY 모두 발생', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(30, now) });
        const result = evaluateLessonAlerts(lesson, NEAR_POS, new Set(), now);
        expect(result.alerts).toContain('DEPARTURE');
        expect(result.alerts).toContain('ARRIVAL_PROXIMITY');
    });

    it('이미 발송된 DEPARTURE: 해당 alert 제외', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(30, now) });
        const firedKey = buildNotificationKey('lesson-1', 'DEPARTURE', now);
        const result = evaluateLessonAlerts(lesson, FAR_POS, new Set([firedKey]), now);
        expect(result.alerts).not.toContain('DEPARTURE');
    });

    it('2시간 후 수업: 알림 없음', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(120, now) });
        const result = evaluateLessonAlerts(lesson, NEAR_POS, new Set(), now);
        expect(result.alerts).toHaveLength(0);
    });

    it('좌표 없는 수업 + 반경 내: ARRIVAL_PROXIMITY 미발생', () => {
        const now = new Date();
        const lesson = makeLesson({
            startsAt: minutesFromNow(30, now),
            venueLat: null,
            venueLng: null,
        });
        const result = evaluateLessonAlerts(lesson, NEAR_POS, new Set(), now);
        expect(result.alerts).not.toContain('ARRIVAL_PROXIMITY');
    });

    it('currentPosition이 null이면 ARRIVAL_PROXIMITY 미발생', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(30, now) });
        const result = evaluateLessonAlerts(lesson, null, new Set(), now);
        expect(result.alerts).not.toContain('ARRIVAL_PROXIMITY');
    });

    it('이미 종료된 수업: 알림 없음', () => {
        const now = new Date();
        const lesson = makeLesson({ startsAt: minutesFromNow(-30, now) });
        const result = evaluateLessonAlerts(lesson, NEAR_POS, new Set(), now);
        expect(result.alerts).toHaveLength(0);
    });

    it('lessonId가 결과에 포함됨', () => {
        const now = new Date();
        const lesson = makeLesson({ lessonId: 'abc-123', startsAt: minutesFromNow(30, now) });
        const result = evaluateLessonAlerts(lesson, FAR_POS, new Set(), now);
        expect(result.lessonId).toBe('abc-123');
    });
});

// ─── evaluateAllLessons ───────────────────────────────────────────────────────

describe('evaluateAllLessons', () => {
    it('알림 없는 수업은 결과에서 제외', () => {
        const now = new Date();
        const lessons = [
            makeLesson({ lessonId: 'l1', startsAt: minutesFromNow(30, now) }),
            makeLesson({ lessonId: 'l2', startsAt: minutesFromNow(200, now) }), // 알림 없음
        ];
        const results = evaluateAllLessons(lessons, FAR_POS, new Set(), now);
        expect(results.some((r) => r.lessonId === 'l2')).toBe(false);
        expect(results.some((r) => r.lessonId === 'l1')).toBe(true);
    });

    it('빈 수업 배열: 빈 결과 반환', () => {
        const now = new Date();
        expect(evaluateAllLessons([], NEAR_POS, new Set(), now)).toHaveLength(0);
    });

    it('여러 수업 모두 알림 필요: 모두 반환', () => {
        const now = new Date();
        const lessons = [
            makeLesson({ lessonId: 'l1', startsAt: minutesFromNow(30, now) }),
            makeLesson({ lessonId: 'l2', startsAt: minutesFromNow(10, now) }),
        ];
        const results = evaluateAllLessons(lessons, FAR_POS, new Set(), now);
        expect(results).toHaveLength(2);
    });

    it('null currentPosition: ARRIVAL_PROXIMITY 없이 시간 기반 알림만', () => {
        const now = new Date();
        const lessons = [makeLesson({ startsAt: minutesFromNow(30, now) })];
        const results = evaluateAllLessons(lessons, null, new Set(), now);
        expect(results[0].alerts).not.toContain('ARRIVAL_PROXIMITY');
        expect(results[0].alerts).toContain('DEPARTURE');
    });
});

// ─── 회귀/사이드이펙트 케이스 ─────────────────────────────────────────────────

describe('regression and side effect cases', () => {
    it('evaluateAllLessons: 원본 lessons 배열을 변경하지 않음', () => {
        const now = new Date();
        const lessons = [makeLesson({ lessonId: 'l1', startsAt: minutesFromNow(30, now) })];
        const copy = [...lessons];
        evaluateAllLessons(lessons, FAR_POS, new Set(), now);
        expect(lessons).toHaveLength(copy.length);
        expect(lessons[0].lessonId).toBe(copy[0].lessonId);
    });

    it('buildNotificationKey: 특수문자 lessonId도 정상 처리', () => {
        const key = buildNotificationKey('lesson/id-1:test', 'DEPARTURE', new Date('2026-03-11T00:00:00Z'));
        expect(key).toBe('lesson/id-1:test:DEPARTURE:2026-03-11');
    });

    it('calculateDistance: 위도 범위 극한값 처리', () => {
        // 북극(90,0) ~ 남극(-90,0) ≈ 20,000km
        const dist = calculateDistance(90, 0, -90, 0);
        expect(dist).toBeGreaterThan(19000000);
    });

    it('DEPARTURE_ALERT_MINUTES 상수가 양수', () => {
        expect(DEPARTURE_ALERT_MINUTES).toBeGreaterThan(0);
    });

    it('LATE_RISK_ALERT_MINUTES < DEPARTURE_ALERT_MINUTES (지각위험 < 출발알림)', () => {
        expect(LATE_RISK_ALERT_MINUTES).toBeLessThan(DEPARTURE_ALERT_MINUTES);
    });
});
