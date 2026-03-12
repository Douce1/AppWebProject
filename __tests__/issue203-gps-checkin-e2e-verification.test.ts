/**
 * Issue #203 — 실제 GPS 출발/도착/종료 동작 검증
 *
 * 실기기 검증 체크리스트를 재현 가능한 단위 테스트로 정리.
 * 다음 시나리오를 커버합니다:
 *   A. 상태 머신 전이 (IDLE→DEPART→ARRIVE→FINISH→REPORT)
 *   B. 시간 게이팅 (ARRIVE: ±30분, FINISH: 종료 -10분~)
 *   C. GPS 정확도 / 거리 기반 결과 UX (성공/재시도/경고)
 *   D. 권한 게이팅 (granted/denied/undetermined)
 *   E. 전체 플로우 통합 (정상 데모 시나리오)
 *   F. 엣지케이스 / 회귀
 *
 * 총 20개 케이스
 */

import {
    transitionPhase,
    derivePhaseFromEvents,
    applyEvents,
    buildPhaseMap,
    extractIdSets,
    buildLessonCheckinState,
    canDepartFrom,
    canArriveFrom,
    canEndFrom,
    canReportFrom,
    type CheckinPhase,
    type CheckinEvent,
} from '../src/services/checkinStateMachine';

import {
    classifyCheckinResult,
    buildCheckinResultUX,
    describeAccuracy,
    isLowAccuracy,
    isOutOfRange,
    ACCURACY_GOOD_METERS,
    ACCURACY_ACCEPTABLE_METERS,
    ACCURACY_SUSPICIOUS_METERS,
    LOCATION_VALID_RADIUS_METERS,
    type CheckinResultInfo,
} from '../src/utils/checkinResultUX';

import {
    canArriveByTime,
    canFinishByTime,
    parseLessonTime,
    isArrivable,
    isFinishable,
} from '../src/utils/checkinGating';

import {
    isLocationActionAllowed,
    shouldOpenSettings,
    shouldRequestPermission,
    type LocationPermissionStatus,
} from '../src/utils/locationPermission';

// ════════════════════════════════════════════════════════════════════════════
// A. 상태 머신 전이 — 정상 플로우
// ════════════════════════════════════════════════════════════════════════════

describe('A. 상태 머신 전이 (정상 데모 플로우)', () => {
    test('IDLE → DEPART 이벤트 → DEPARTED', () => {
        expect(transitionPhase('IDLE', 'DEPART')).toBe('DEPARTED');
    });

    test('DEPARTED → ARRIVE 이벤트 → ARRIVED', () => {
        expect(transitionPhase('DEPARTED', 'ARRIVE')).toBe('ARRIVED');
    });

    test('ARRIVED → FINISH 이벤트 → ENDED', () => {
        expect(transitionPhase('ARRIVED', 'FINISH')).toBe('ENDED');
    });

    test('ENDED → REPORT 이벤트 → REPORTED', () => {
        expect(transitionPhase('ENDED', 'REPORT')).toBe('REPORTED');
    });

    test('전체 이벤트 순서대로 applyEvents하면 REPORTED', () => {
        const events: CheckinEvent[] = ['DEPART', 'ARRIVE', 'FINISH', 'REPORT'];
        expect(applyEvents(events)).toBe('REPORTED');
    });

    test('순서가 어긋난 이벤트는 상태를 변경하지 않음 (IDLE에서 ARRIVE 불가)', () => {
        expect(transitionPhase('IDLE', 'ARRIVE')).toBe('IDLE');
        expect(transitionPhase('IDLE', 'FINISH')).toBe('IDLE');
        expect(transitionPhase('DEPARTED', 'FINISH')).toBe('DEPARTED');
    });

    test('buildPhaseMap: 서버 이벤트 배열 → lessonId별 단계 정확히 파생', () => {
        const events = [
            { lessonId: 'L1', eventType: 'DEPART' as CheckinEvent, isValid: true },
            { lessonId: 'L1', eventType: 'ARRIVE' as CheckinEvent, isValid: true },
            { lessonId: 'L2', eventType: 'DEPART' as CheckinEvent, isValid: true },
            { lessonId: 'L3', eventType: 'DEPART' as CheckinEvent, isValid: false }, // invalid → 무시
        ];
        const map = buildPhaseMap(events);
        expect(map['L1']).toBe('ARRIVED');
        expect(map['L2']).toBe('DEPARTED');
        expect(map['L3']).toBeUndefined(); // isValid=false 무시
    });

    test('extractIdSets: ARRIVED 수업은 canEndIds에 포함', () => {
        const map: Record<string, CheckinPhase> = {
            'L1': 'ARRIVED',
            'L2': 'DEPARTED',
            'L3': 'ENDED',
        };
        const sets = extractIdSets(map);
        expect(sets.canEndIds).toContain('L1');
        expect(sets.canArriveIds).toContain('L2');
        expect(sets.readyToReportIds).toContain('L3');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// B. 시간 게이팅 — ARRIVE/FINISH 버튼 활성화 조건
// ════════════════════════════════════════════════════════════════════════════

describe('B. 시간 게이팅 (ARRIVE ±30분, FINISH 종료 -10분~)', () => {
    const TODAY = '2026-03-13';

    test('수업 시작 30분 전 → ARRIVE 가능', () => {
        // 수업 10:00, 현재 09:31 (29분 전)
        const now = new Date('2026-03-13T09:31:00');
        expect(canArriveByTime(TODAY, '10:00 - 12:00', now)).toBe(true);
    });

    test('수업 시작 31분 전 → ARRIVE 불가 (창 외)', () => {
        const now = new Date('2026-03-13T09:29:00');
        expect(canArriveByTime(TODAY, '10:00 - 12:00', now)).toBe(false);
    });

    test('수업 시작 30분 후 → ARRIVE 가능 (창 내)', () => {
        const now = new Date('2026-03-13T10:29:00');
        expect(canArriveByTime(TODAY, '10:00 - 12:00', now)).toBe(true);
    });

    test('수업 시작 31분 후 → ARRIVE 불가 (창 초과)', () => {
        const now = new Date('2026-03-13T10:31:00');
        expect(canArriveByTime(TODAY, '10:00 - 12:00', now)).toBe(false);
    });

    test('종료 10분 전 → FINISH 가능', () => {
        // 수업 종료 12:00, 현재 11:51
        const now = new Date('2026-03-13T11:51:00');
        expect(canFinishByTime(TODAY, '10:00 - 12:00', now)).toBe(true);
    });

    test('종료 11분 전 → FINISH 불가', () => {
        const now = new Date('2026-03-13T11:49:00');
        expect(canFinishByTime(TODAY, '10:00 - 12:00', now)).toBe(false);
    });

    test('시간 파싱 실패 시 false 반환 (안전 폴백)', () => {
        const now = new Date();
        expect(canArriveByTime(TODAY, '잘못된 형식', now)).toBe(false);
        expect(canFinishByTime(TODAY, '', now)).toBe(false);
        expect(canArriveByTime('', '10:00 - 12:00', now)).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// C. GPS 결과 UX — 성공/재시도/경고 분류
// ════════════════════════════════════════════════════════════════════════════

describe('C. GPS 결과 UX (정확도·거리 기반 분류)', () => {
    const makeInfo = (overrides: Partial<CheckinResultInfo>): CheckinResultInfo => ({
        isValid: true,
        locationStatus: 'OK',
        distanceMeters: 50,
        accuracyMeters: ACCURACY_GOOD_METERS,
        ...overrides,
    });

    test('isValid=true, OK → SUCCESS, canRetry=false', () => {
        const ux = buildCheckinResultUX(makeInfo({}));
        expect(ux.type).toBe('SUCCESS');
        expect(ux.canRetry).toBe(false);
    });

    test('isValid=true, SUSPICIOUS → SUCCESS_WITH_WARNING, canRetry=false', () => {
        const ux = buildCheckinResultUX(makeInfo({ locationStatus: 'SUSPICIOUS' }));
        expect(ux.type).toBe('SUCCESS_WITH_WARNING');
        expect(ux.canRetry).toBe(false);
    });

    test('isValid=false, 거리 초과 → OUT_OF_RANGE, canRetry=true', () => {
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: LOCATION_VALID_RADIUS_METERS + 1,
            accuracyMeters: ACCURACY_GOOD_METERS,
        }));
        expect(ux.type).toBe('OUT_OF_RANGE');
        expect(ux.canRetry).toBe(true);
    });

    test('isValid=false, 정확도 낮음 → LOW_ACCURACY, canRetry=true', () => {
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: 10,
            accuracyMeters: ACCURACY_ACCEPTABLE_METERS + 1,
        }));
        expect(ux.type).toBe('LOW_ACCURACY');
        expect(ux.canRetry).toBe(true);
    });

    test('describeAccuracy: 구간별 설명 문자열 정확', () => {
        expect(describeAccuracy(ACCURACY_GOOD_METERS)).toBe('정확도 좋음');
        expect(describeAccuracy(ACCURACY_ACCEPTABLE_METERS)).toBe('정확도 보통');
        expect(describeAccuracy(ACCURACY_SUSPICIOUS_METERS)).toBe('정확도 낮음');
        expect(describeAccuracy(ACCURACY_SUSPICIOUS_METERS + 1)).toBe('정확도 매우 낮음 (비정상)');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// D. 권한 게이팅 — GPS 액션 허용/차단
// ════════════════════════════════════════════════════════════════════════════

describe('D. 권한 게이팅', () => {
    test('granted → GPS 액션 허용', () => {
        expect(isLocationActionAllowed('granted')).toBe(true);
    });

    test('denied → GPS 액션 차단, 설정 화면으로 유도', () => {
        expect(isLocationActionAllowed('denied')).toBe(false);
        expect(shouldOpenSettings('denied')).toBe(true);
        expect(shouldRequestPermission('denied')).toBe(false);
    });

    test('undetermined → GPS 액션 차단, 권한 요청으로 유도', () => {
        expect(isLocationActionAllowed('undetermined')).toBe(false);
        expect(shouldOpenSettings('undetermined')).toBe(false);
        expect(shouldRequestPermission('undetermined')).toBe(true);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// E. 전체 플로우 통합 — 정상 데모 시나리오
// ════════════════════════════════════════════════════════════════════════════

describe('E. 전체 플로우 통합 (데모 시나리오)', () => {
    test('[데모] 출발→도착→종료→보고서 전체 흐름이 순서대로 진행됨', () => {
        let phase: CheckinPhase = 'IDLE';

        // 출발
        expect(canDepartFrom(phase)).toBe(true);
        phase = transitionPhase(phase, 'DEPART');
        expect(phase).toBe('DEPARTED');

        // 도착 (시간 게이팅 통과 가정)
        expect(canArriveFrom(phase)).toBe(true);
        phase = transitionPhase(phase, 'ARRIVE');
        expect(phase).toBe('ARRIVED');

        // 종료 (시간 게이팅 통과 가정)
        expect(canEndFrom(phase)).toBe(true);
        phase = transitionPhase(phase, 'FINISH');
        expect(phase).toBe('ENDED');

        // 보고서
        expect(canReportFrom(phase)).toBe(true);
        phase = transitionPhase(phase, 'REPORT');
        expect(phase).toBe('REPORTED');
    });

    test('[데모] GPS 성공 시나리오: 250m 이내, 정확도 80m → 재시도 없이 통과', () => {
        const result: CheckinResultInfo = {
            isValid: true,
            locationStatus: 'OK',
            distanceMeters: 100,
            accuracyMeters: 50,
        };
        const ux = buildCheckinResultUX(result);
        expect(ux.canRetry).toBe(false);
        expect(ux.type).toBe('SUCCESS');
    });

    test('[데모] 권한 허용 상태에서 수업 시작 직전 전체 조건 통과', () => {
        const TODAY = '2026-03-13';
        const now = new Date('2026-03-13T09:55:00'); // 10:00 수업, 5분 전

        // 권한 OK
        expect(isLocationActionAllowed('granted')).toBe(true);

        // DEPART: 권한만 있으면 가능 (시간 제한 없음)
        expect(canDepartFrom('IDLE')).toBe(true);

        // ARRIVE: 수업 시작 ±30분 창 확인
        expect(canArriveByTime(TODAY, '10:00 - 12:00', now)).toBe(true);

        // FINISH: 종료 -10분 전까지 대기
        const finishNow = new Date('2026-03-13T11:52:00');
        expect(canFinishByTime(TODAY, '10:00 - 12:00', finishNow)).toBe(true);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// F. 엣지케이스 / 회귀
// ════════════════════════════════════════════════════════════════════════════

describe('F. 엣지케이스 / 회귀', () => {
    test('동일 이벤트 중복 적용 시 단계 불변', () => {
        // 이미 DEPARTED인데 DEPART 다시 오면 변화 없어야 함
        expect(transitionPhase('DEPARTED', 'DEPART')).toBe('DEPARTED');
        expect(transitionPhase('ARRIVED', 'ARRIVE')).toBe('ARRIVED');
    });

    test('isValid=false인 서버 이벤트는 buildPhaseMap에서 무시됨', () => {
        const events = [
            { lessonId: 'X', eventType: 'DEPART' as CheckinEvent, isValid: false },
            { lessonId: 'X', eventType: 'ARRIVE' as CheckinEvent, isValid: false },
        ];
        const map = buildPhaseMap(events);
        expect(map['X']).toBeUndefined(); // invalid 이벤트만 있으면 IDLE (phaseMap에 없음)
    });

    test('buildLessonCheckinState: ARRIVED 수업 요약 정확', () => {
        const state = buildLessonCheckinState('L1', 'ARRIVED');
        expect(state.canDepart).toBe(false);
        expect(state.canArrive).toBe(false);
        expect(state.canEnd).toBe(true);
        expect(state.canReport).toBe(false);
        expect(state.isReported).toBe(false);
    });

    test('derivePhaseFromEvents: 이벤트 배열 → 최종 단계 직접 파생', () => {
        expect(derivePhaseFromEvents(['DEPART', 'ARRIVE', 'FINISH'])).toBe('ENDED');
        expect(derivePhaseFromEvents(['DEPART'])).toBe('DEPARTED');
        expect(derivePhaseFromEvents([])).toBe('IDLE');
    });
});
