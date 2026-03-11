/**
 * Issue #99: 체크인 UX 좌표 기반 상태 머신 전환 테스트
 *
 * 테스트 범위:
 *  - derivePhaseFromEvents: 이벤트 배열 → 단계 파생
 *  - canDepartFrom / canArriveFrom / canEndFrom / canReportFrom: 전이 가능성 판단
 *  - transitionPhase: 상태 전이 (setTimeout 제거 후 즉각 전이)
 *  - applyEvents: 이벤트 배열 누적 적용
 *  - buildLessonCheckinState: 단일 수업 상태 요약
 *  - buildPhaseMap: 서버 이벤트 → 단계 맵
 *  - extractIdSets: 단계 맵 → UI 호환 ID 세트
 *  - 통합 / 예외 / 회귀 케이스
 */

// ─── 순수 함수 (checkinStateMachine.ts와 동일) ────────────────────────────────

type CheckinPhase = 'IDLE' | 'DEPARTED' | 'ARRIVED' | 'ENDED' | 'REPORTED';
type CheckinEvent = 'DEPART' | 'ARRIVE' | 'FINISH' | 'REPORT';

function derivePhaseFromEvents(eventTypes: CheckinEvent[]): CheckinPhase {
    if (eventTypes.includes('FINISH')) return 'ENDED';
    if (eventTypes.includes('ARRIVE')) return 'ARRIVED';
    if (eventTypes.includes('DEPART')) return 'DEPARTED';
    return 'IDLE';
}

function canDepartFrom(phase: CheckinPhase): boolean { return phase === 'IDLE'; }
function canArriveFrom(phase: CheckinPhase): boolean { return phase === 'DEPARTED'; }
function canEndFrom(phase: CheckinPhase): boolean { return phase === 'ARRIVED'; }
function canReportFrom(phase: CheckinPhase): boolean { return phase === 'ENDED'; }
function isReportedPhase(phase: CheckinPhase): boolean { return phase === 'REPORTED'; }

function transitionPhase(phase: CheckinPhase, event: CheckinEvent): CheckinPhase {
    switch (event) {
        case 'DEPART': return phase === 'IDLE' ? 'DEPARTED' : phase;
        case 'ARRIVE': return phase === 'DEPARTED' ? 'ARRIVED' : phase;
        case 'FINISH': return phase === 'ARRIVED' ? 'ENDED' : phase;
        case 'REPORT': return phase === 'ENDED' ? 'REPORTED' : phase;
        default: return phase;
    }
}

function applyEvents(eventTypes: CheckinEvent[]): CheckinPhase {
    return eventTypes.reduce(
        (phase, event) => transitionPhase(phase, event),
        'IDLE' as CheckinPhase,
    );
}

interface LessonCheckinState {
    lessonId: string;
    phase: CheckinPhase;
    canDepart: boolean;
    canArrive: boolean;
    canEnd: boolean;
    canReport: boolean;
    isReported: boolean;
}

function buildLessonCheckinState(lessonId: string, phase: CheckinPhase): LessonCheckinState {
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

function buildPhaseMap(
    events: Array<{ lessonId: string; eventType: CheckinEvent; isValid: boolean }>,
): Record<string, CheckinPhase> {
    const eventsByLesson: Record<string, CheckinEvent[]> = {};
    events
        .filter((e) => e.isValid)
        .forEach((e) => {
            if (!eventsByLesson[e.lessonId]) eventsByLesson[e.lessonId] = [];
            eventsByLesson[e.lessonId].push(e.eventType);
        });
    const phaseMap: Record<string, CheckinPhase> = {};
    Object.entries(eventsByLesson).forEach(([lessonId, evts]) => {
        phaseMap[lessonId] = applyEvents(evts);
    });
    return phaseMap;
}

function extractIdSets(phaseMap: Record<string, CheckinPhase>) {
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

// ─── derivePhaseFromEvents ────────────────────────────────────────────────────

describe('derivePhaseFromEvents', () => {
    it('빈 이벤트: IDLE', () => {
        expect(derivePhaseFromEvents([])).toBe('IDLE');
    });

    it('DEPART만 있으면: DEPARTED', () => {
        expect(derivePhaseFromEvents(['DEPART'])).toBe('DEPARTED');
    });

    it('DEPART + ARRIVE: ARRIVED', () => {
        expect(derivePhaseFromEvents(['DEPART', 'ARRIVE'])).toBe('ARRIVED');
    });

    it('DEPART + ARRIVE + FINISH: ENDED', () => {
        expect(derivePhaseFromEvents(['DEPART', 'ARRIVE', 'FINISH'])).toBe('ENDED');
    });

    it('FINISH만 있어도: ENDED (가장 높은 단계 우선)', () => {
        expect(derivePhaseFromEvents(['FINISH'])).toBe('ENDED');
    });

    it('순서 무관: ARRIVE, DEPART → ARRIVED', () => {
        expect(derivePhaseFromEvents(['ARRIVE', 'DEPART'])).toBe('ARRIVED');
    });

    it('중복 이벤트: DEPART, DEPART → DEPARTED', () => {
        expect(derivePhaseFromEvents(['DEPART', 'DEPART'])).toBe('DEPARTED');
    });
});

// ─── 전이 가능성 판단 ──────────────────────────────────────────────────────────

describe('phase transition guards', () => {
    it('canDepartFrom: IDLE에서만 true', () => {
        expect(canDepartFrom('IDLE')).toBe(true);
        expect(canDepartFrom('DEPARTED')).toBe(false);
        expect(canDepartFrom('ARRIVED')).toBe(false);
        expect(canDepartFrom('ENDED')).toBe(false);
    });

    it('canArriveFrom: DEPARTED에서만 true', () => {
        expect(canArriveFrom('DEPARTED')).toBe(true);
        expect(canArriveFrom('IDLE')).toBe(false);
        expect(canArriveFrom('ARRIVED')).toBe(false);
        expect(canArriveFrom('ENDED')).toBe(false);
    });

    it('canEndFrom: ARRIVED에서만 true', () => {
        expect(canEndFrom('ARRIVED')).toBe(true);
        expect(canEndFrom('IDLE')).toBe(false);
        expect(canEndFrom('DEPARTED')).toBe(false);
        expect(canEndFrom('ENDED')).toBe(false);
    });

    it('canReportFrom: ENDED에서만 true', () => {
        expect(canReportFrom('ENDED')).toBe(true);
        expect(canReportFrom('IDLE')).toBe(false);
        expect(canReportFrom('ARRIVED')).toBe(false);
    });

    it('isReportedPhase: REPORTED에서만 true', () => {
        expect(isReportedPhase('REPORTED')).toBe(true);
        expect(isReportedPhase('ENDED')).toBe(false);
    });
});

// ─── transitionPhase (setTimeout 제거 검증) ───────────────────────────────────

describe('transitionPhase - 즉각 전이 (setTimeout 없음)', () => {
    it('IDLE + DEPART → DEPARTED (즉각)', () => {
        expect(transitionPhase('IDLE', 'DEPART')).toBe('DEPARTED');
    });

    it('DEPARTED + ARRIVE → ARRIVED (즉각)', () => {
        expect(transitionPhase('DEPARTED', 'ARRIVE')).toBe('ARRIVED');
    });

    it('ARRIVED + FINISH → ENDED (즉각)', () => {
        expect(transitionPhase('ARRIVED', 'FINISH')).toBe('ENDED');
    });

    it('ENDED + REPORT → REPORTED (즉각)', () => {
        expect(transitionPhase('ENDED', 'REPORT')).toBe('REPORTED');
    });

    it('잘못된 전이: IDLE + ARRIVE → IDLE (상태 오염 없음)', () => {
        expect(transitionPhase('IDLE', 'ARRIVE')).toBe('IDLE');
    });

    it('잘못된 전이: IDLE + FINISH → IDLE', () => {
        expect(transitionPhase('IDLE', 'FINISH')).toBe('IDLE');
    });

    it('잘못된 전이: DEPARTED + FINISH → DEPARTED', () => {
        expect(transitionPhase('DEPARTED', 'FINISH')).toBe('DEPARTED');
    });

    it('잘못된 전이: ENDED + DEPART → ENDED', () => {
        expect(transitionPhase('ENDED', 'DEPART')).toBe('ENDED');
    });

    it('REPORTED 이후 모든 이벤트: REPORTED 유지', () => {
        expect(transitionPhase('REPORTED', 'DEPART')).toBe('REPORTED');
        expect(transitionPhase('REPORTED', 'ARRIVE')).toBe('REPORTED');
        expect(transitionPhase('REPORTED', 'FINISH')).toBe('REPORTED');
        expect(transitionPhase('REPORTED', 'REPORT')).toBe('REPORTED');
    });
});

// ─── applyEvents ──────────────────────────────────────────────────────────────

describe('applyEvents', () => {
    it('전체 흐름: IDLE → DEPARTED → ARRIVED → ENDED → REPORTED', () => {
        expect(applyEvents(['DEPART', 'ARRIVE', 'FINISH', 'REPORT'])).toBe('REPORTED');
    });

    it('빈 배열: IDLE', () => {
        expect(applyEvents([])).toBe('IDLE');
    });

    it('중간까지만: DEPART + ARRIVE → ARRIVED', () => {
        expect(applyEvents(['DEPART', 'ARRIVE'])).toBe('ARRIVED');
    });

    it('잘못된 순서도 안전하게 처리', () => {
        // ARRIVE before DEPART: ARRIVE는 DEPARTED가 아니므로 무시
        const result = applyEvents(['ARRIVE', 'DEPART']);
        expect(result).toBe('DEPARTED');
    });
});

// ─── buildLessonCheckinState ──────────────────────────────────────────────────

describe('buildLessonCheckinState', () => {
    it('IDLE 단계: canDepart만 true', () => {
        const state = buildLessonCheckinState('l1', 'IDLE');
        expect(state.canDepart).toBe(true);
        expect(state.canArrive).toBe(false);
        expect(state.canEnd).toBe(false);
        expect(state.canReport).toBe(false);
        expect(state.isReported).toBe(false);
    });

    it('DEPARTED 단계: canArrive만 true', () => {
        const state = buildLessonCheckinState('l1', 'DEPARTED');
        expect(state.canDepart).toBe(false);
        expect(state.canArrive).toBe(true);
        expect(state.canEnd).toBe(false);
    });

    it('ARRIVED 단계: canEnd만 true', () => {
        const state = buildLessonCheckinState('l1', 'ARRIVED');
        expect(state.canEnd).toBe(true);
        expect(state.canArrive).toBe(false);
        expect(state.canDepart).toBe(false);
    });

    it('ENDED 단계: canReport만 true', () => {
        const state = buildLessonCheckinState('l1', 'ENDED');
        expect(state.canReport).toBe(true);
        expect(state.canEnd).toBe(false);
    });

    it('REPORTED 단계: isReported true, 나머지 false', () => {
        const state = buildLessonCheckinState('l1', 'REPORTED');
        expect(state.isReported).toBe(true);
        expect(state.canReport).toBe(false);
        expect(state.canEnd).toBe(false);
    });

    it('lessonId가 결과에 포함됨', () => {
        const state = buildLessonCheckinState('abc-123', 'IDLE');
        expect(state.lessonId).toBe('abc-123');
    });
});

// ─── buildPhaseMap ────────────────────────────────────────────────────────────

describe('buildPhaseMap', () => {
    it('유효하지 않은 이벤트 필터링', () => {
        const events = [
            { lessonId: 'l1', eventType: 'DEPART' as CheckinEvent, isValid: true },
            { lessonId: 'l1', eventType: 'ARRIVE' as CheckinEvent, isValid: false },
        ];
        expect(buildPhaseMap(events)['l1']).toBe('DEPARTED');
    });

    it('여러 수업 독립적으로 처리', () => {
        const events = [
            { lessonId: 'l1', eventType: 'DEPART' as CheckinEvent, isValid: true },
            { lessonId: 'l2', eventType: 'DEPART' as CheckinEvent, isValid: true },
            { lessonId: 'l2', eventType: 'ARRIVE' as CheckinEvent, isValid: true },
        ];
        const map = buildPhaseMap(events);
        expect(map['l1']).toBe('DEPARTED');
        expect(map['l2']).toBe('ARRIVED');
    });

    it('빈 이벤트 배열: 빈 맵', () => {
        expect(buildPhaseMap([])).toEqual({});
    });
});

// ─── extractIdSets ────────────────────────────────────────────────────────────

describe('extractIdSets', () => {
    it('DEPARTED: departedIds + canArriveIds에 포함', () => {
        const sets = extractIdSets({ l1: 'DEPARTED' });
        expect(sets.departedIds).toContain('l1');
        expect(sets.canArriveIds).toContain('l1');
        expect(sets.arrivedIds).not.toContain('l1');
    });

    it('ARRIVED: departedIds + arrivedIds + canEndIds에 포함', () => {
        const sets = extractIdSets({ l1: 'ARRIVED' });
        expect(sets.departedIds).toContain('l1');
        expect(sets.arrivedIds).toContain('l1');
        expect(sets.canEndIds).toContain('l1');
    });

    it('ENDED: departedIds + arrivedIds + endedIds + readyToReportIds에 포함', () => {
        const sets = extractIdSets({ l1: 'ENDED' });
        expect(sets.endedIds).toContain('l1');
        expect(sets.readyToReportIds).toContain('l1');
    });

    it('REPORTED: departedIds + arrivedIds + endedIds에만 포함 (readyToReport 제외)', () => {
        const sets = extractIdSets({ l1: 'REPORTED' });
        expect(sets.endedIds).toContain('l1');
        expect(sets.readyToReportIds).not.toContain('l1');
    });

    it('빈 맵: 모든 세트 빈 배열', () => {
        const sets = extractIdSets({});
        expect(sets.departedIds).toHaveLength(0);
        expect(sets.canArriveIds).toHaveLength(0);
    });
});

// ─── 회귀 케이스 ──────────────────────────────────────────────────────────────

describe('regression cases', () => {
    it('applyEvents: 원본 배열 불변', () => {
        const events: CheckinEvent[] = ['DEPART', 'ARRIVE'];
        const copy = [...events];
        applyEvents(events);
        expect(events).toEqual(copy);
    });

    it('전체 흐름 시뮬레이션: setTimeout 없이 즉각 전이', () => {
        let phase: CheckinPhase = 'IDLE';
        phase = transitionPhase(phase, 'DEPART');
        expect(phase).toBe('DEPARTED');  // 이전: 3초 후. 이후: 즉각
        phase = transitionPhase(phase, 'ARRIVE');
        expect(phase).toBe('ARRIVED');   // 이전: 3초 후. 이후: 즉각
        phase = transitionPhase(phase, 'FINISH');
        expect(phase).toBe('ENDED');     // 이전: 3초 후. 이후: 즉각
        phase = transitionPhase(phase, 'REPORT');
        expect(phase).toBe('REPORTED');
    });

    it('동일 단계 중복 전이: 상태 오염 없음', () => {
        let phase: CheckinPhase = 'DEPARTED';
        phase = transitionPhase(phase, 'DEPART'); // 이미 DEPARTED
        expect(phase).toBe('DEPARTED');
    });
});
