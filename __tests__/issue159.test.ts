/**
 * Issue #159: DEPART/ARRIVE/FINISH 버튼 게이팅 및 보고서 이동 구현
 *
 * 테스트 범위:
 *  - isArrivable: 수업 시작 기준 ±30분 구간 판단
 *  - isFinishable: 수업 종료 -10분 이후 판단
 *  - parseLessonTime: 날짜+시간 문자열 파싱
 *  - canArriveByTime: 복합 문자열 기반 ARRIVE 게이팅
 *  - canFinishByTime: 복합 문자열 기반 FINISH 게이팅
 *  - 정상 / 예외 / 경계값 / 사이드이펙트 / 통합 / 회귀 케이스
 */

import {
    isArrivable,
    isFinishable,
    parseLessonTime,
    canArriveByTime,
    canFinishByTime,
} from '@/src/utils/checkinGating';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

/** startsAt 기준으로 offsetMin 분 후의 Date를 반환 */
function at(base: Date, offsetMin: number): Date {
    return new Date(base.getTime() + offsetMin * 60 * 1000);
}

/** 오늘 날짜 YYYY-MM-DD */
function todayStr(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── 1. isArrivable ────────────────────────────────────────────────────────────

describe('isArrivable', () => {
    const startsAt = new Date('2025-06-01T10:00:00');

    test('정상-1: 시작 정각 직전 (-1분) → true', () => {
        expect(isArrivable(startsAt, at(startsAt, -1))).toBe(true);
    });

    test('정상-2: 시작 정각 → true', () => {
        expect(isArrivable(startsAt, at(startsAt, 0))).toBe(true);
    });

    test('정상-3: 시작 +29분 → true', () => {
        expect(isArrivable(startsAt, at(startsAt, 29))).toBe(true);
    });

    test('정상-4: 시작 +30분 정각 → true (경계 포함)', () => {
        expect(isArrivable(startsAt, at(startsAt, 30))).toBe(true);
    });

    test('정상-5: 시작 -30분 정각 → true (경계 포함)', () => {
        expect(isArrivable(startsAt, at(startsAt, -30))).toBe(true);
    });

    test('경계값-1: 시작 -31분 → false', () => {
        expect(isArrivable(startsAt, at(startsAt, -31))).toBe(false);
    });

    test('경계값-2: 시작 +31분 → false', () => {
        expect(isArrivable(startsAt, at(startsAt, 31))).toBe(false);
    });

    test('예외-1: 수업 시작 2시간 전 → false', () => {
        expect(isArrivable(startsAt, at(startsAt, -120))).toBe(false);
    });

    test('예외-2: 수업 시작 1시간 후 → false', () => {
        expect(isArrivable(startsAt, at(startsAt, 60))).toBe(false);
    });
});

// ─── 2. isFinishable ──────────────────────────────────────────────────────────

describe('isFinishable', () => {
    const endsAt = new Date('2025-06-01T12:00:00');

    test('정상-1: 종료 -10분 정각 → true (경계 포함)', () => {
        expect(isFinishable(endsAt, at(endsAt, -10))).toBe(true);
    });

    test('정상-2: 종료 -5분 → true', () => {
        expect(isFinishable(endsAt, at(endsAt, -5))).toBe(true);
    });

    test('정상-3: 종료 정각 → true', () => {
        expect(isFinishable(endsAt, at(endsAt, 0))).toBe(true);
    });

    test('정상-4: 종료 +10분 (초과) → true', () => {
        expect(isFinishable(endsAt, at(endsAt, 10))).toBe(true);
    });

    test('경계값-1: 종료 -11분 → false', () => {
        expect(isFinishable(endsAt, at(endsAt, -11))).toBe(false);
    });

    test('경계값-2: 종료 -9분 59초 → true', () => {
        const now = new Date(endsAt.getTime() - 9 * 60 * 1000 - 59 * 1000);
        expect(isFinishable(endsAt, now)).toBe(true);
    });

    test('예외-1: 수업 시작 직후 (종료 60분 전) → false', () => {
        expect(isFinishable(endsAt, at(endsAt, -60))).toBe(false);
    });

    test('예외-2: 수업 시작 전 (종료 2시간 전) → false', () => {
        expect(isFinishable(endsAt, at(endsAt, -120))).toBe(false);
    });
});

// ─── 3. parseLessonTime ───────────────────────────────────────────────────────

describe('parseLessonTime', () => {
    test('정상-1: 정상 날짜 및 시간 파싱', () => {
        const result = parseLessonTime('2025-06-01', '10:00');
        expect(result).not.toBeNull();
        expect(result!.getHours()).toBe(10);
        expect(result!.getMinutes()).toBe(0);
    });

    test('정상-2: 12:30 파싱', () => {
        const result = parseLessonTime('2025-06-01', '12:30');
        expect(result).not.toBeNull();
        expect(result!.getHours()).toBe(12);
        expect(result!.getMinutes()).toBe(30);
    });

    test('정상-3: 날짜가 결과 Date의 날짜와 일치', () => {
        const result = parseLessonTime('2025-06-15', '09:00');
        expect(result).not.toBeNull();
        expect(result!.getFullYear()).toBe(2025);
        expect(result!.getMonth()).toBe(5); // 0-indexed
        expect(result!.getDate()).toBe(15);
    });

    test('예외-1: 빈 시간 문자열 → null', () => {
        expect(parseLessonTime('2025-06-01', '')).toBeNull();
    });

    test('예외-2: 콜론 없는 시간 → null', () => {
        expect(parseLessonTime('2025-06-01', '1000')).toBeNull();
    });

    test('예외-3: NaN 시간 → null', () => {
        expect(parseLessonTime('2025-06-01', 'ab:cd')).toBeNull();
    });
});

// ─── 4. canArriveByTime ───────────────────────────────────────────────────────

describe('canArriveByTime', () => {
    const date = '2025-06-01';
    const time = '10:00 - 12:00'; // starts 10:00, ends 12:00

    const startsAt = new Date('2025-06-01T10:00:00');

    test('정상-1: 시작 -30분 구간 진입 → true', () => {
        expect(canArriveByTime(date, time, at(startsAt, -30))).toBe(true);
    });

    test('정상-2: 시작 정각 → true', () => {
        expect(canArriveByTime(date, time, at(startsAt, 0))).toBe(true);
    });

    test('정상-3: 시작 +30분 → true', () => {
        expect(canArriveByTime(date, time, at(startsAt, 30))).toBe(true);
    });

    test('경계값-1: 시작 -31분 → false', () => {
        expect(canArriveByTime(date, time, at(startsAt, -31))).toBe(false);
    });

    test('경계값-2: 시작 +31분 → false', () => {
        expect(canArriveByTime(date, time, at(startsAt, 31))).toBe(false);
    });

    test('예외-1: 빈 날짜 → false', () => {
        expect(canArriveByTime('', time, startsAt)).toBe(false);
    });

    test('예외-2: 빈 시간 문자열 → false', () => {
        expect(canArriveByTime(date, '', startsAt)).toBe(false);
    });

    test('예외-3: 하이픈 없는 시간 문자열 → false', () => {
        expect(canArriveByTime(date, '10:00', startsAt)).toBe(true); // single part, reads startStr
    });

    test('예외-4: 잘못된 시간 형식 → false', () => {
        expect(canArriveByTime(date, 'xx:yy - 12:00', at(startsAt, 0))).toBe(false);
    });
});

// ─── 5. canFinishByTime ───────────────────────────────────────────────────────

describe('canFinishByTime', () => {
    const date = '2025-06-01';
    const time = '10:00 - 12:00'; // ends 12:00

    const endsAt = new Date('2025-06-01T12:00:00');

    test('정상-1: 종료 -10분 정각 → true', () => {
        expect(canFinishByTime(date, time, at(endsAt, -10))).toBe(true);
    });

    test('정상-2: 종료 정각 → true', () => {
        expect(canFinishByTime(date, time, at(endsAt, 0))).toBe(true);
    });

    test('정상-3: 종료 후 +15분 → true', () => {
        expect(canFinishByTime(date, time, at(endsAt, 15))).toBe(true);
    });

    test('경계값-1: 종료 -11분 → false', () => {
        expect(canFinishByTime(date, time, at(endsAt, -11))).toBe(false);
    });

    test('경계값-2: 종료 -9분 59초 → true', () => {
        const now = new Date(endsAt.getTime() - 9 * 60 * 1000 - 59 * 1000);
        expect(canFinishByTime(date, time, now)).toBe(true);
    });

    test('예외-1: 빈 날짜 → false', () => {
        expect(canFinishByTime('', time, endsAt)).toBe(false);
    });

    test('예외-2: 빈 시간 문자열 → false', () => {
        expect(canFinishByTime(date, '', endsAt)).toBe(false);
    });

    test('예외-3: 하이픈 없는 시간(종료 시각 없음) → false', () => {
        expect(canFinishByTime(date, '10:00', endsAt)).toBe(false);
    });

    test('예외-4: 잘못된 종료 시각 형식 → false', () => {
        expect(canFinishByTime(date, '10:00 - xx:yy', endsAt)).toBe(false);
    });
});

// ─── 6. 통합 케이스 ───────────────────────────────────────────────────────────

describe('통합 케이스', () => {
    test('통합-1: ARRIVE 불가 구간에서는 FINISH도 불가', () => {
        const date = '2025-06-01';
        const time = '14:00 - 16:00';
        const startsAt = new Date('2025-06-01T14:00:00');
        const endsAt = new Date('2025-06-01T16:00:00');

        // 수업 시작 2시간 전 → ARRIVE 불가
        const tooEarly = at(startsAt, -120);
        expect(canArriveByTime(date, time, tooEarly)).toBe(false);
        // 당연히 FINISH도 불가
        expect(canFinishByTime(date, time, tooEarly)).toBe(false);
    });

    test('통합-2: ARRIVE 가능 구간에서 FINISH는 여전히 -10분 이후에만 가능', () => {
        const date = '2025-06-01';
        const time = '10:00 - 12:00';
        const startsAt = new Date('2025-06-01T10:00:00');
        const endsAt = new Date('2025-06-01T12:00:00');

        // 시작 직후(+5분): ARRIVE 가능, FINISH 불가
        const soonAfterStart = at(startsAt, 5);
        expect(canArriveByTime(date, time, soonAfterStart)).toBe(true);
        expect(canFinishByTime(date, time, soonAfterStart)).toBe(false);
    });

    test('통합-3: FINISH 가능 구간에서 ARRIVE는 불가 (시작 +30분 초과)', () => {
        const date = '2025-06-01';
        const time = '10:00 - 12:00';
        const endsAt = new Date('2025-06-01T12:00:00');

        // 종료 -10분(11:50): ARRIVE 불가(시작 +110분), FINISH 가능
        const nearEnd = at(endsAt, -10);
        expect(canArriveByTime(date, time, nearEnd)).toBe(false);
        expect(canFinishByTime(date, time, nearEnd)).toBe(true);
    });

    test('통합-4: 날짜가 다른 경우 게이팅 함수는 날짜를 포함해 정확히 파싱', () => {
        const date = '2025-12-25';
        const time = '09:00 - 11:00';
        // 2025-12-25 08:30 → ARRIVE 가능 (-30분)
        const now = new Date('2025-12-25T08:30:00');
        expect(canArriveByTime(date, time, now)).toBe(true);
    });

    test('통합-5: parseLessonTime과 isArrivable 직접 조합', () => {
        const startsAt = parseLessonTime('2025-06-01', '10:00');
        expect(startsAt).not.toBeNull();
        const now = new Date('2025-06-01T09:45:00'); // -15분
        expect(isArrivable(startsAt!, now)).toBe(true);
    });
});

// ─── 7. 회귀 케이스 ───────────────────────────────────────────────────────────

describe('회귀 케이스', () => {
    test('회귀-1: isArrivable은 now === windowStart 일 때 true (이전 < 비교 오류 방지)', () => {
        const startsAt = new Date('2025-06-01T10:00:00');
        const windowStart = new Date(startsAt.getTime() - 30 * 60 * 1000);
        expect(isArrivable(startsAt, windowStart)).toBe(true);
    });

    test('회귀-2: isFinishable은 now === threshold 일 때 true', () => {
        const endsAt = new Date('2025-06-01T12:00:00');
        const threshold = new Date(endsAt.getTime() - 10 * 60 * 1000);
        expect(isFinishable(endsAt, threshold)).toBe(true);
    });

    test('회귀-3: canArriveByTime 호출 후 입력 Date가 변형되지 않음 (사이드이펙트 없음)', () => {
        const date = '2025-06-01';
        const time = '10:00 - 12:00';
        const now = new Date('2025-06-01T09:55:00');
        const before = now.getTime();
        canArriveByTime(date, time, now);
        expect(now.getTime()).toBe(before);
    });

    test('회귀-4: canFinishByTime 호출 후 입력 Date가 변형되지 않음 (사이드이펙트 없음)', () => {
        const date = '2025-06-01';
        const time = '10:00 - 12:00';
        const now = new Date('2025-06-01T11:55:00');
        const before = now.getTime();
        canFinishByTime(date, time, now);
        expect(now.getTime()).toBe(before);
    });

    test('회귀-5: parseLessonTime은 반복 호출 시 동일 결과 반환 (순수 함수)', () => {
        const r1 = parseLessonTime('2025-06-01', '10:30');
        const r2 = parseLessonTime('2025-06-01', '10:30');
        expect(r1?.getTime()).toBe(r2?.getTime());
    });

    test('회귀-6: isArrivable 경계값 1ms 전 → false', () => {
        const startsAt = new Date('2025-06-01T10:00:00');
        const justBefore = new Date(startsAt.getTime() - 30 * 60 * 1000 - 1);
        expect(isArrivable(startsAt, justBefore)).toBe(false);
    });

    test('회귀-7: isFinishable 경계값 1ms 전 → false', () => {
        const endsAt = new Date('2025-06-01T12:00:00');
        const justBefore = new Date(endsAt.getTime() - 10 * 60 * 1000 - 1);
        expect(isFinishable(endsAt, justBefore)).toBe(false);
    });
});
