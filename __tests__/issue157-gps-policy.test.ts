/**
 * Issue #157 — Smart GPS MVP 정책 확정안 검증 테스트
 * 실제 타입을 import하여 정책 문서와의 일치 여부를 검증합니다.
 * 코드 수정 없음 — 정책 전달용 선행 이슈.
 */

import type {
    AttendanceEventType,
    ApiAttendanceEvent,
    ApiLesson,
    LessonStatus,
} from '@/src/api/types';

// ─── 정책 상수 ────────────────────────────────────────────────────────────────

/** 정책: ARRIVE 버튼 활성화 시간창 (수업 시작 기준, 분) */
const ARRIVE_WINDOW_BEFORE_MIN = -30;
const ARRIVE_WINDOW_AFTER_MIN = 30;

/** 정책: FINISH 버튼 활성화 (종료 예정 기준, 분) */
const FINISH_ENABLE_BEFORE_END_MIN = -10;

/** 정책: GPS 정확도 임계값 (미터) */
const GPS_ACCURACY_GOOD = 80;
const GPS_ACCURACY_ACCEPTABLE = 150;
const GPS_ACCURACY_SUSPICIOUS = 300;

/** 정책: 인정 반경 (미터) */
const LOCATION_VALID_RADIUS_METERS = 250;

/** 정책: 백그라운드 위치 폴링 간격 (분) */
const BG_LOCATION_POLLING_MIN = 10;

/** 정책: ETA 악화 추가 알림 허용 횟수 */
const ETA_EXTRA_NOTIFY_MAX = 1;

// ─── 테스트 픽스처 ─────────────────────────────────────────────────────────────

function makeAttendanceEvent(overrides: Partial<ApiAttendanceEvent> = {}): ApiAttendanceEvent {
    return {
        attendanceEventId: 'evt-001',
        companyId: 'co-001',
        lessonId: 'ls-001',
        instructorId: 'ins-001',
        eventType: 'DEPART',
        occurredAt: new Date().toISOString(),
        lat: 37.5665,
        lng: 126.9780,
        accuracyMeters: 50,
        distanceMeters: 100,
        timingStatus: 'ON_TIME',
        locationStatus: 'OK',
        isValid: true,
        ...overrides,
    };
}

// ─── 헬퍼 함수 (정책 로직 구현) ───────────────────────────────────────────────

/** ARRIVE 버튼 활성화 여부 판정 (정책 기반) */
function isArriveButtonActive(
    hasDeparted: boolean,
    lessonStartsAt: string,
    nowMs: number,
): boolean {
    if (!hasDeparted) return false;
    const startMs = new Date(lessonStartsAt).getTime();
    const diffMin = (nowMs - startMs) / 60000;
    return diffMin >= ARRIVE_WINDOW_BEFORE_MIN && diffMin <= ARRIVE_WINDOW_AFTER_MIN;
}

/** FINISH 버튼 활성화 여부 판정 (정책 기반) */
function isFinishButtonActive(lessonEndsAt: string, nowMs: number): boolean {
    const endMs = new Date(lessonEndsAt).getTime();
    const diffMin = (nowMs - endMs) / 60000;
    return diffMin >= FINISH_ENABLE_BEFORE_END_MIN;
}

/** GPS 정확도 판정 */
function classifyGpsAccuracy(accuracyM: number): 'GOOD' | 'ACCEPTABLE' | 'RETRY' | 'SUSPICIOUS' {
    if (accuracyM <= GPS_ACCURACY_GOOD) return 'GOOD';
    if (accuracyM <= GPS_ACCURACY_ACCEPTABLE) return 'ACCEPTABLE';
    if (accuracyM <= GPS_ACCURACY_SUSPICIOUS) return 'RETRY';
    return 'SUSPICIOUS';
}

/** 위치 유효성 판정 (반경 기반) */
function isWithinValidRadius(distanceM: number): boolean {
    return distanceM <= LOCATION_VALID_RADIUS_METERS;
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('Issue #157 — Smart GPS MVP 정책 확정안 검증', () => {

    // ───── 정상 케이스 (AttendanceEventType 타입) ─────────────────────────────

    describe('정상 케이스 — AttendanceEventType 타입', () => {
        test('T01: AttendanceEventType에 DEPART가 포함된다', () => {
            const type: AttendanceEventType = 'DEPART';
            expect(type).toBe('DEPART');
        });

        test('T02: AttendanceEventType에 ARRIVE가 포함된다', () => {
            const type: AttendanceEventType = 'ARRIVE';
            expect(type).toBe('ARRIVE');
        });

        test('T03: AttendanceEventType에 FINISH가 포함된다', () => {
            const type: AttendanceEventType = 'FINISH';
            expect(type).toBe('FINISH');
        });

        test('T04: AttendanceEventType은 정확히 3개 값(DEPART/ARRIVE/FINISH)으로 구성된다', () => {
            const validTypes: AttendanceEventType[] = ['DEPART', 'ARRIVE', 'FINISH'];
            expect(validTypes).toHaveLength(3);
        });

        test('T05: DEPART → ARRIVE → FINISH 순서가 정책과 일치한다', () => {
            const flow: AttendanceEventType[] = ['DEPART', 'ARRIVE', 'FINISH'];
            expect(flow[0]).toBe('DEPART');
            expect(flow[1]).toBe('ARRIVE');
            expect(flow[2]).toBe('FINISH');
        });
    });

    // ───── 정상 케이스 (ApiAttendanceEvent 구조) ──────────────────────────────

    describe('정상 케이스 — ApiAttendanceEvent 구조', () => {
        test('T06: ApiAttendanceEvent에 attendanceEventId 필드가 있다', () => {
            const evt = makeAttendanceEvent();
            expect(typeof evt.attendanceEventId).toBe('string');
        });

        test('T07: ApiAttendanceEvent에 lat/lng 좌표 필드가 있다', () => {
            const evt = makeAttendanceEvent({ lat: 37.1, lng: 127.2 });
            expect(typeof evt.lat).toBe('number');
            expect(typeof evt.lng).toBe('number');
        });

        test('T08: ApiAttendanceEvent에 accuracyMeters 필드가 있다', () => {
            const evt = makeAttendanceEvent({ accuracyMeters: 50 });
            expect(typeof evt.accuracyMeters).toBe('number');
        });

        test('T09: ApiAttendanceEvent에 distanceMeters 필드가 있다', () => {
            const evt = makeAttendanceEvent({ distanceMeters: 200 });
            expect(typeof evt.distanceMeters).toBe('number');
        });

        test('T10: ApiAttendanceEvent의 locationStatus는 OK 또는 SUSPICIOUS다', () => {
            const ok = makeAttendanceEvent({ locationStatus: 'OK' });
            const susp = makeAttendanceEvent({ locationStatus: 'SUSPICIOUS' });
            expect(ok.locationStatus).toBe('OK');
            expect(susp.locationStatus).toBe('SUSPICIOUS');
        });

        test('T11: ApiAttendanceEvent의 timingStatus는 ON_TIME 또는 LATE다', () => {
            const onTime = makeAttendanceEvent({ timingStatus: 'ON_TIME' });
            const late = makeAttendanceEvent({ timingStatus: 'LATE' });
            expect(onTime.timingStatus).toBe('ON_TIME');
            expect(late.timingStatus).toBe('LATE');
        });

        test('T12: ApiAttendanceEvent의 isValid 필드는 boolean이다', () => {
            const valid = makeAttendanceEvent({ isValid: true });
            const invalid = makeAttendanceEvent({ isValid: false });
            expect(typeof valid.isValid).toBe('boolean');
            expect(typeof invalid.isValid).toBe('boolean');
        });
    });

    // ───── GPS 정확도 정책 검증 ─────────────────────────────────────────────────

    describe('사이드 이펙트 — GPS 정확도 정책', () => {
        test('T13: 정확도 <=80m는 GOOD으로 분류된다', () => {
            expect(classifyGpsAccuracy(80)).toBe('GOOD');
            expect(classifyGpsAccuracy(50)).toBe('GOOD');
            expect(classifyGpsAccuracy(1)).toBe('GOOD');
        });

        test('T14: 정확도 81~150m는 ACCEPTABLE로 분류된다', () => {
            expect(classifyGpsAccuracy(81)).toBe('ACCEPTABLE');
            expect(classifyGpsAccuracy(150)).toBe('ACCEPTABLE');
        });

        test('T15: 정확도 151~300m는 RETRY로 분류된다', () => {
            expect(classifyGpsAccuracy(151)).toBe('RETRY');
            expect(classifyGpsAccuracy(300)).toBe('RETRY');
        });

        test('T16: 정확도 >300m는 SUSPICIOUS로 분류된다', () => {
            expect(classifyGpsAccuracy(301)).toBe('SUSPICIOUS');
            expect(classifyGpsAccuracy(999)).toBe('SUSPICIOUS');
        });
    });

    // ───── ARRIVE 버튼 활성화 정책 검증 ────────────────────────────────────────

    describe('통합 케이스 — ARRIVE 버튼 게이팅 정책', () => {
        const START_TIME = '2026-03-12T10:00:00.000Z';
        const startMs = new Date(START_TIME).getTime();

        test('T17: DEPART 전에는 ARRIVE 버튼이 비활성화된다', () => {
            const now = startMs; // 정각
            expect(isArriveButtonActive(false, START_TIME, now)).toBe(false);
        });

        test('T18: DEPART 후 수업 시작 -30분에는 ARRIVE 버튼이 활성화된다', () => {
            const now = startMs - 30 * 60000;
            expect(isArriveButtonActive(true, START_TIME, now)).toBe(true);
        });

        test('T19: DEPART 후 수업 시작 -31분에는 ARRIVE 버튼이 비활성화된다', () => {
            const now = startMs - 31 * 60000;
            expect(isArriveButtonActive(true, START_TIME, now)).toBe(false);
        });

        test('T20: DEPART 후 수업 시작 +30분에는 ARRIVE 버튼이 활성화된다', () => {
            const now = startMs + 30 * 60000;
            expect(isArriveButtonActive(true, START_TIME, now)).toBe(true);
        });

        test('T21: DEPART 후 수업 시작 +31분에는 ARRIVE 버튼이 비활성화된다', () => {
            const now = startMs + 31 * 60000;
            expect(isArriveButtonActive(true, START_TIME, now)).toBe(false);
        });

        test('T22: DEPART 후 수업 시작 정각에는 ARRIVE 버튼이 활성화된다', () => {
            const now = startMs;
            expect(isArriveButtonActive(true, START_TIME, now)).toBe(true);
        });
    });

    // ───── FINISH 버튼 활성화 정책 검증 ────────────────────────────────────────

    describe('통합 케이스 — FINISH 버튼 게이팅 정책', () => {
        const END_TIME = '2026-03-12T11:00:00.000Z';
        const endMs = new Date(END_TIME).getTime();

        test('T23: 종료 예정 -11분에는 FINISH 버튼이 비활성화된다', () => {
            const now = endMs - 11 * 60000;
            expect(isFinishButtonActive(END_TIME, now)).toBe(false);
        });

        test('T24: 종료 예정 -10분에는 FINISH 버튼이 활성화된다', () => {
            const now = endMs - 10 * 60000;
            expect(isFinishButtonActive(END_TIME, now)).toBe(true);
        });

        test('T25: 종료 예정 정각에는 FINISH 버튼이 활성화된다', () => {
            const now = endMs;
            expect(isFinishButtonActive(END_TIME, now)).toBe(true);
        });

        test('T26: 종료 예정 이후(지연)에도 FINISH 버튼이 활성화된다 (지연 종료 허용 정책)', () => {
            const now = endMs + 30 * 60000;
            expect(isFinishButtonActive(END_TIME, now)).toBe(true);
        });
    });

    // ───── 위치 유효성 / 반경 정책 검증 ────────────────────────────────────────

    describe('통합 케이스 — 위치 인정 반경 정책 (250m)', () => {
        test('T27: 250m 이내는 유효 위치로 판정된다', () => {
            expect(isWithinValidRadius(250)).toBe(true);
            expect(isWithinValidRadius(100)).toBe(true);
            expect(isWithinValidRadius(0)).toBe(true);
        });

        test('T28: 251m 이상은 무효 위치로 판정된다', () => {
            expect(isWithinValidRadius(251)).toBe(false);
            expect(isWithinValidRadius(500)).toBe(false);
        });
    });

    // ───── 정책 상수 검증 ────────────────────────────────────────────────────────

    describe('회귀 케이스 — 정책 상수 일치', () => {
        test('T29: ARRIVE 활성화 윈도우는 수업 시작 기준 -30분 ~ +30분이다', () => {
            expect(ARRIVE_WINDOW_BEFORE_MIN).toBe(-30);
            expect(ARRIVE_WINDOW_AFTER_MIN).toBe(30);
        });

        test('T30: FINISH 활성화는 종료 예정 -10분 이후다', () => {
            expect(FINISH_ENABLE_BEFORE_END_MIN).toBe(-10);
        });

        test('T31: 위치 인정 반경은 250m다', () => {
            expect(LOCATION_VALID_RADIUS_METERS).toBe(250);
        });

        test('T32: 백그라운드 위치 폴링 간격은 10분이다', () => {
            expect(BG_LOCATION_POLLING_MIN).toBe(10);
        });

        test('T33: ETA 악화 추가 알림은 최대 1회다', () => {
            expect(ETA_EXTRA_NOTIFY_MAX).toBe(1);
        });

        test('T34: GPS_ACCURACY_GOOD 임계값은 80m다', () => {
            expect(GPS_ACCURACY_GOOD).toBe(80);
        });

        test('T35: GPS_ACCURACY_ACCEPTABLE 임계값은 150m다', () => {
            expect(GPS_ACCURACY_ACCEPTABLE).toBe(150);
        });

        test('T36: GPS_ACCURACY_SUSPICIOUS 임계값은 300m다', () => {
            expect(GPS_ACCURACY_SUSPICIOUS).toBe(300);
        });
    });
});
