/**
 * checkinGating.ts
 *
 * 체크인 버튼 게이팅 순수 함수 모음
 *
 * ARRIVE 버튼: DEPART 이후 + 수업 시작 -30분 ~ +30분 구간에서만 활성화
 * FINISH 버튼: 종료 예정 -10분 이후 활성화
 */

/** 수업 시작 시각 기준 ARRIVE 가능 여부를 판단합니다. */
export function isArrivable(startsAt: Date, now: Date): boolean {
    const windowStart = new Date(startsAt.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(startsAt.getTime() + 30 * 60 * 1000);
    return now >= windowStart && now <= windowEnd;
}

/** 수업 종료 시각 기준 FINISH 가능 여부를 판단합니다. */
export function isFinishable(endsAt: Date, now: Date): boolean {
    const threshold = new Date(endsAt.getTime() - 10 * 60 * 1000);
    return now >= threshold;
}

/**
 * 날짜 문자열(YYYY-MM-DD)과 시간 문자열(HH:MM)을 합쳐 Date 객체를 반환합니다.
 * 시간 파싱 실패 시 null을 반환합니다.
 */
export function parseLessonTime(date: string, timeStr: string): Date | null {
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    const d = new Date(`${date}T00:00:00`);
    d.setHours(parts[0], parts[1], 0, 0);
    return d;
}

/**
 * 수업 시간 문자열("HH:MM - HH:MM")과 날짜에서 ARRIVE 게이팅 여부를 반환합니다.
 * 파싱 실패 시 false를 반환합니다.
 */
export function canArriveByTime(date: string, time: string, now: Date): boolean {
    if (!date || !time) return false;
    const timeParts = time.split('-');
    if (timeParts.length < 1) return false;
    const startStr = timeParts[0].trim();
    const startsAt = parseLessonTime(date, startStr);
    if (!startsAt) return false;
    return isArrivable(startsAt, now);
}

/**
 * 수업 시간 문자열("HH:MM - HH:MM")과 날짜에서 FINISH 게이팅 여부를 반환합니다.
 * 파싱 실패 시 false를 반환합니다.
 */
export function canFinishByTime(date: string, time: string, now: Date): boolean {
    if (!date || !time) return false;
    const timeParts = time.split('-');
    if (timeParts.length < 2) return false;
    const endStr = timeParts[1].trim();
    const endsAt = parseLessonTime(date, endStr);
    if (!endsAt) return false;
    return isFinishable(endsAt, now);
}
