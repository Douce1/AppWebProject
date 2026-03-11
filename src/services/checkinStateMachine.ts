/**
 * checkinStateMachine.ts
 *
 * 체크인 상태 머신 (순수 함수)
 *
 * 이전: setTimeout 기반 임시 전환 (출발→3초→도착가능, 도착→3초→종료가능)
 * 이후: 이벤트 배열 / 상태에서 직접 파생, GPS 알림 엔진과 연결 가능한 구조
 */

// ─── 타입 ─────────────────────────────────────────────────────────────────────

/** 단일 수업의 체크인 단계 */
export type CheckinPhase =
    | 'IDLE'       // 아직 아무 행동 없음
    | 'DEPARTED'   // 출발 완료
    | 'ARRIVED'    // 도착 완료 (강의 진행 중)
    | 'ENDED'      // 강의 종료 완료
    | 'REPORTED';  // 보고서 제출 완료

/** 상태 전이를 일으키는 이벤트 */
export type CheckinEvent = 'DEPART' | 'ARRIVE' | 'FINISH' | 'REPORT';

/** 수업별 체크인 상태 요약 */
export interface LessonCheckinState {
    lessonId: string;
    phase: CheckinPhase;
    canDepart: boolean;
    canArrive: boolean;
    canEnd: boolean;
    canReport: boolean;
    isReported: boolean;
}

// ─── 상태 파생 ─────────────────────────────────────────────────────────────────

/**
 * 이벤트 목록에서 현재 체크인 단계를 파생합니다.
 * 이벤트 배열은 시간 순서대로 정렬된 것으로 가정합니다.
 */
export function derivePhaseFromEvents(eventTypes: CheckinEvent[]): CheckinPhase {
    if (eventTypes.includes('FINISH')) return 'ENDED';
    if (eventTypes.includes('ARRIVE')) return 'ARRIVED';
    if (eventTypes.includes('DEPART')) return 'DEPARTED';
    return 'IDLE';
}

// ─── 전이 가능성 판단 ──────────────────────────────────────────────────────────

export function canDepartFrom(phase: CheckinPhase): boolean {
    return phase === 'IDLE';
}

export function canArriveFrom(phase: CheckinPhase): boolean {
    return phase === 'DEPARTED';
}

export function canEndFrom(phase: CheckinPhase): boolean {
    return phase === 'ARRIVED';
}

export function canReportFrom(phase: CheckinPhase): boolean {
    return phase === 'ENDED';
}

export function isReportedPhase(phase: CheckinPhase): boolean {
    return phase === 'REPORTED';
}

// ─── 상태 전이 ─────────────────────────────────────────────────────────────────

/**
 * 현재 단계에서 이벤트를 적용하여 다음 단계를 반환합니다.
 * 유효하지 않은 전이는 현재 단계를 그대로 반환합니다. (상태 오염 없음)
 */
export function transitionPhase(
    phase: CheckinPhase,
    event: CheckinEvent,
): CheckinPhase {
    switch (event) {
        case 'DEPART':
            return phase === 'IDLE' ? 'DEPARTED' : phase;
        case 'ARRIVE':
            return phase === 'DEPARTED' ? 'ARRIVED' : phase;
        case 'FINISH':
            return phase === 'ARRIVED' ? 'ENDED' : phase;
        case 'REPORT':
            return phase === 'ENDED' ? 'REPORTED' : phase;
        default:
            return phase;
    }
}

/**
 * 이벤트 배열에 새 이벤트를 적용하여 최종 단계를 반환합니다.
 */
export function applyEvents(eventTypes: CheckinEvent[]): CheckinPhase {
    return eventTypes.reduce(
        (phase, event) => transitionPhase(phase, event),
        'IDLE' as CheckinPhase,
    );
}

// ─── 상태 요약 생성 ────────────────────────────────────────────────────────────

/**
 * 단일 수업의 전체 체크인 상태 요약을 생성합니다.
 */
export function buildLessonCheckinState(
    lessonId: string,
    phase: CheckinPhase,
): LessonCheckinState {
    return {
        lessonId,
        phase,
        canDepart: canDepartFrom(phase),
        canArrive: canArriveFrom(phase),
        canEnd: canEndFrom(phase),
        canReport: canReportFrom(phase),
        isReported: isReportedPhase(phase),
    };
}

// ─── 다수 수업 상태 파생 ───────────────────────────────────────────────────────

/**
 * 서버에서 받은 이벤트 목록으로 lessonId별 단계를 파생합니다.
 */
export function buildPhaseMap(
    events: Array<{ lessonId: string; eventType: CheckinEvent; isValid: boolean }>,
): Record<string, CheckinPhase> {
    const eventsByLesson: Record<string, CheckinEvent[]> = {};

    events
        .filter((e) => e.isValid)
        .forEach((e) => {
            if (!eventsByLesson[e.lessonId]) {
                eventsByLesson[e.lessonId] = [];
            }
            eventsByLesson[e.lessonId].push(e.eventType);
        });

    const phaseMap: Record<string, CheckinPhase> = {};
    Object.entries(eventsByLesson).forEach(([lessonId, evts]) => {
        phaseMap[lessonId] = applyEvents(evts);
    });
    return phaseMap;
}

/**
 * phaseMap에서 각 상태별 lessonId 배열을 추출합니다.
 * ScheduleContext의 여러 boolean set들을 대체합니다.
 */
export function extractIdSets(phaseMap: Record<string, CheckinPhase>): {
    departedIds: string[];
    arrivedIds: string[];
    endedIds: string[];
    canArriveIds: string[];
    canEndIds: string[];
    readyToReportIds: string[];
} {
    const departedIds: string[] = [];
    const arrivedIds: string[] = [];
    const endedIds: string[] = [];
    const canArriveIds: string[] = [];
    const canEndIds: string[] = [];
    const readyToReportIds: string[] = [];

    Object.entries(phaseMap).forEach(([id, phase]) => {
        if (phase === 'DEPARTED') { departedIds.push(id); canArriveIds.push(id); }
        if (phase === 'ARRIVED') { departedIds.push(id); arrivedIds.push(id); canEndIds.push(id); }
        if (phase === 'ENDED') { departedIds.push(id); arrivedIds.push(id); endedIds.push(id); readyToReportIds.push(id); }
        if (phase === 'REPORTED') { departedIds.push(id); arrivedIds.push(id); endedIds.push(id); }
    });

    return { departedIds, arrivedIds, endedIds, canArriveIds, canEndIds, readyToReportIds };
}
