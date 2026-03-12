/**
 * Tests for issue #161: 출발 알림 및 ETA 악화 후속 알림 구현
 * Covers: departureAlertService.ts + types.ts + httpClient methods
 *
 * 총 35개 이상 테스트 케이스 (정상/예외/사이드이펙트/통합/회귀)
 */

import {
  createInitialDepartureAlertState,
  isAlertableRiskLevel,
  isHighRiskLevel,
  isEtaDeteriorated,
  evaluateDepartureAlerts,
  evaluateMovementWithoutDeparture,
  applyFiredAlerts,
  updateLastEta,
  buildDepartureAlertMessage,
  type DepartureAlertState,
  type DepartureAlertPayload,
} from '../src/services/departureAlertService';

import type {
  ApiCommuteRisk,
  ApiCommuteAlertPolicy,
  CommuteRiskLevel,
} from '../src/api/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makePolicyEnabled = (): ApiCommuteAlertPolicy => ({
  bufferMinutes: 15,
  lateRiskThresholdMinutes: 10,
  highRiskThresholdMinutes: 5,
  initialDepartureAlertEnabled: true,
  etaDeteriorationFollowupEnabled: true,
  stopAfterDepart: true,
  movementWithoutDepartureAlertEnabled: true,
});

const makePolicyAllDisabled = (): ApiCommuteAlertPolicy => ({
  bufferMinutes: 15,
  lateRiskThresholdMinutes: 10,
  highRiskThresholdMinutes: 5,
  initialDepartureAlertEnabled: false,
  etaDeteriorationFollowupEnabled: false,
  stopAfterDepart: false,
  movementWithoutDepartureAlertEnabled: false,
});

const makeRisk = (riskLevel: CommuteRiskLevel, etaMinutes = 30): ApiCommuteRisk => ({
  riskLevel,
  recommendedAction: '지금 출발하세요',
  etaMinutes,
  distanceMeters: 15000,
  bufferMinutes: 10,
  riskScore: riskLevel === 'LOW' ? 20 : riskLevel === 'MEDIUM' ? 50 : riskLevel === 'HIGH' ? 75 : 90,
});

// ─── 1. createInitialDepartureAlertState ─────────────────────────────────────

describe('createInitialDepartureAlertState', () => {
  test('[정상] 초기 상태는 모든 Set이 비어 있어야 함', () => {
    const state = createInitialDepartureAlertState();
    expect(state.initialAlertFired.size).toBe(0);
    expect(state.etaFollowupFired.size).toBe(0);
    expect(state.movementWithoutDepartFired.size).toBe(0);
    expect(Object.keys(state.lastEtaMinutes).length).toBe(0);
  });

  test('[정상] 두 번 호출해도 독립된 상태를 반환해야 함', () => {
    const a = createInitialDepartureAlertState();
    const b = createInitialDepartureAlertState();
    a.initialAlertFired.add('lesson1');
    expect(b.initialAlertFired.has('lesson1')).toBe(false);
  });
});

// ─── 2. isAlertableRiskLevel ─────────────────────────────────────────────────

describe('isAlertableRiskLevel', () => {
  test('[정상] LOW는 알림 불필요', () => {
    expect(isAlertableRiskLevel('LOW')).toBe(false);
  });

  test('[정상] MEDIUM은 알림 필요', () => {
    expect(isAlertableRiskLevel('MEDIUM')).toBe(true);
  });

  test('[정상] HIGH는 알림 필요', () => {
    expect(isAlertableRiskLevel('HIGH')).toBe(true);
  });

  test('[정상] VERY_HIGH는 알림 필요', () => {
    expect(isAlertableRiskLevel('VERY_HIGH')).toBe(true);
  });
});

// ─── 3. isHighRiskLevel ───────────────────────────────────────────────────────

describe('isHighRiskLevel', () => {
  test('[정상] LOW는 높은 위험 아님', () => {
    expect(isHighRiskLevel('LOW')).toBe(false);
  });

  test('[정상] MEDIUM은 높은 위험 아님', () => {
    expect(isHighRiskLevel('MEDIUM')).toBe(false);
  });

  test('[정상] HIGH는 높은 위험', () => {
    expect(isHighRiskLevel('HIGH')).toBe(true);
  });

  test('[정상] VERY_HIGH는 높은 위험', () => {
    expect(isHighRiskLevel('VERY_HIGH')).toBe(true);
  });
});

// ─── 4. isEtaDeteriorated ────────────────────────────────────────────────────

describe('isEtaDeteriorated', () => {
  test('[정상] ETA가 5분 이상 증가하면 악화', () => {
    expect(isEtaDeteriorated(30, 35)).toBe(true);
  });

  test('[정상] ETA가 5분 증가하면 악화 (경계값)', () => {
    expect(isEtaDeteriorated(30, 35, 5)).toBe(true);
  });

  test('[정상] ETA가 4분 증가하면 악화 아님', () => {
    expect(isEtaDeteriorated(30, 34)).toBe(false);
  });

  test('[정상] ETA가 감소하면 악화 아님', () => {
    expect(isEtaDeteriorated(30, 25)).toBe(false);
  });

  test('[정상] ETA가 동일하면 악화 아님', () => {
    expect(isEtaDeteriorated(30, 30)).toBe(false);
  });

  test('[정상] 사용자 정의 threshold 사용', () => {
    expect(isEtaDeteriorated(30, 33, 3)).toBe(true);
  });
});

// ─── 5. evaluateDepartureAlerts - 최초 출발 알림 ─────────────────────────────

describe('evaluateDepartureAlerts - 최초 출발 알림', () => {
  const state = createInitialDepartureAlertState();

  test('[정상] MEDIUM 위험, 미발송 → 최초 알림 반환', () => {
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson1',
      risk: makeRisk('MEDIUM'),
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(true);
  });

  test('[정상] HIGH 위험, 미발송 → 최초 알림 반환', () => {
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson2',
      risk: makeRisk('HIGH'),
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(true);
  });

  test('[정상] LOW 위험 → 최초 알림 없음', () => {
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson3',
      risk: makeRisk('LOW'),
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(false);
  });

  test('[정상] 이미 발송된 경우 최초 알림 없음', () => {
    const firedState: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      initialAlertFired: new Set(['lesson4']),
    };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson4',
      risk: makeRisk('HIGH'),
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state: firedState,
    });
    expect(result.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(false);
  });

  test('[정상] initialDepartureAlertEnabled=false → 알림 없음', () => {
    const policy = { ...makePolicyEnabled(), initialDepartureAlertEnabled: false };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson5',
      risk: makeRisk('HIGH'),
      policy,
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(false);
  });

  test('[정상] hasDeparted=true + stopAfterDepart=true → 알림 없음', () => {
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson6',
      risk: makeRisk('HIGH'),
      policy: makePolicyEnabled(), // stopAfterDepart=true
      hasDeparted: true,
      state,
    });
    expect(result.length).toBe(0);
  });

  test('[정상] hasDeparted=true + stopAfterDepart=false → 알림 발생 가능', () => {
    const policy = { ...makePolicyEnabled(), stopAfterDepart: false };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson7',
      risk: makeRisk('HIGH'),
      policy,
      hasDeparted: true,
      state,
    });
    expect(result.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(true);
  });
});

// ─── 6. evaluateDepartureAlerts - ETA 악화 후속 알림 ─────────────────────────

describe('evaluateDepartureAlerts - ETA 악화 후속 알림', () => {
  test('[정상] 최초 알림 발송 후 ETA 악화 → 후속 알림 반환', () => {
    const state: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      initialAlertFired: new Set(['lesson10']),
      lastEtaMinutes: { lesson10: 30 },
    };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson10',
      risk: makeRisk('HIGH', 40), // ETA 30 → 40 (악화)
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'ETA_DETERIORATION_FOLLOWUP')).toBe(true);
  });

  test('[정상] ETA 악화 후속 알림 이미 발송 → 재발송 없음', () => {
    const state: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      initialAlertFired: new Set(['lesson11']),
      etaFollowupFired: new Set(['lesson11']),
      lastEtaMinutes: { lesson11: 30 },
    };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson11',
      risk: makeRisk('HIGH', 45),
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'ETA_DETERIORATION_FOLLOWUP')).toBe(false);
  });

  test('[정상] ETA 개선되면 후속 알림 없음', () => {
    const state: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      initialAlertFired: new Set(['lesson12']),
      lastEtaMinutes: { lesson12: 40 },
    };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson12',
      risk: makeRisk('HIGH', 35), // ETA 개선
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'ETA_DETERIORATION_FOLLOWUP')).toBe(false);
  });

  test('[정상] etaDeteriorationFollowupEnabled=false → 후속 알림 없음', () => {
    const policy = { ...makePolicyEnabled(), etaDeteriorationFollowupEnabled: false };
    const state: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      initialAlertFired: new Set(['lesson13']),
      lastEtaMinutes: { lesson13: 30 },
    };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson13',
      risk: makeRisk('HIGH', 45),
      policy,
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'ETA_DETERIORATION_FOLLOWUP')).toBe(false);
  });

  test('[정상] lastEtaMinutes 없으면 후속 알림 없음', () => {
    const state: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      initialAlertFired: new Set(['lesson14']),
    };
    const result = evaluateDepartureAlerts({
      lessonId: 'lesson14',
      risk: makeRisk('HIGH', 45),
      policy: makePolicyEnabled(),
      hasDeparted: false,
      state,
    });
    expect(result.some((a) => a.alertType === 'ETA_DETERIORATION_FOLLOWUP')).toBe(false);
  });
});

// ─── 7. evaluateMovementWithoutDeparture ─────────────────────────────────────

describe('evaluateMovementWithoutDeparture', () => {
  const policy = makePolicyEnabled();
  const state = createInitialDepartureAlertState();

  test('[정상] 이동 중 + 미출발 → 보조 알림 발송', () => {
    const result = evaluateMovementWithoutDeparture({
      lessonId: 'lesson20',
      isMoving: true,
      policy,
      hasDeparted: false,
      state,
    });
    expect(result.length).toBe(1);
    expect(result[0].alertType).toBe('MOVEMENT_WITHOUT_DEPARTURE');
  });

  test('[정상] 이동 중이지만 출발 완료 → 알림 없음', () => {
    const result = evaluateMovementWithoutDeparture({
      lessonId: 'lesson21',
      isMoving: true,
      policy,
      hasDeparted: true,
      state,
    });
    expect(result.length).toBe(0);
  });

  test('[정상] 이동 없으면 알림 없음', () => {
    const result = evaluateMovementWithoutDeparture({
      lessonId: 'lesson22',
      isMoving: false,
      policy,
      hasDeparted: false,
      state,
    });
    expect(result.length).toBe(0);
  });

  test('[정상] 이미 발송된 경우 재발송 없음', () => {
    const firedState: DepartureAlertState = {
      ...createInitialDepartureAlertState(),
      movementWithoutDepartFired: new Set(['lesson23']),
    };
    const result = evaluateMovementWithoutDeparture({
      lessonId: 'lesson23',
      isMoving: true,
      policy,
      hasDeparted: false,
      state: firedState,
    });
    expect(result.length).toBe(0);
  });

  test('[정상] movementWithoutDepartureAlertEnabled=false → 알림 없음', () => {
    const disabledPolicy = { ...policy, movementWithoutDepartureAlertEnabled: false };
    const result = evaluateMovementWithoutDeparture({
      lessonId: 'lesson24',
      isMoving: true,
      policy: disabledPolicy,
      hasDeparted: false,
      state,
    });
    expect(result.length).toBe(0);
  });
});

// ─── 8. applyFiredAlerts ─────────────────────────────────────────────────────

describe('applyFiredAlerts', () => {
  test('[정상] INITIAL_DEPARTURE 발송 시 initialAlertFired에 추가', () => {
    const state = createInitialDepartureAlertState();
    const alert: DepartureAlertPayload = {
      lessonId: 'lessonA',
      alertType: 'INITIAL_DEPARTURE',
      etaMinutes: 30,
    };
    const next = applyFiredAlerts(state, [alert]);
    expect(next.initialAlertFired.has('lessonA')).toBe(true);
    expect(next.lastEtaMinutes['lessonA']).toBe(30);
  });

  test('[정상] ETA_DETERIORATION_FOLLOWUP 발송 시 etaFollowupFired에 추가', () => {
    const state = createInitialDepartureAlertState();
    const alert: DepartureAlertPayload = {
      lessonId: 'lessonB',
      alertType: 'ETA_DETERIORATION_FOLLOWUP',
      etaMinutes: 45,
    };
    const next = applyFiredAlerts(state, [alert]);
    expect(next.etaFollowupFired.has('lessonB')).toBe(true);
    expect(next.lastEtaMinutes['lessonB']).toBe(45);
  });

  test('[정상] MOVEMENT_WITHOUT_DEPARTURE 발송 시 movementWithoutDepartFired에 추가', () => {
    const state = createInitialDepartureAlertState();
    const alert: DepartureAlertPayload = {
      lessonId: 'lessonC',
      alertType: 'MOVEMENT_WITHOUT_DEPARTURE',
    };
    const next = applyFiredAlerts(state, [alert]);
    expect(next.movementWithoutDepartFired.has('lessonC')).toBe(true);
  });

  test('[사이드이펙트] 원본 상태를 변경하지 않아야 함', () => {
    const state = createInitialDepartureAlertState();
    const original = new Set(state.initialAlertFired);
    applyFiredAlerts(state, [{ lessonId: 'lessonD', alertType: 'INITIAL_DEPARTURE' }]);
    expect(state.initialAlertFired).toEqual(original);
  });

  test('[정상] 빈 알림 배열 → 상태 변경 없음', () => {
    const state = createInitialDepartureAlertState();
    state.lastEtaMinutes['lessonE'] = 20;
    const next = applyFiredAlerts(state, []);
    expect(next.lastEtaMinutes['lessonE']).toBe(20);
    expect(next.initialAlertFired.size).toBe(0);
  });
});

// ─── 9. updateLastEta ────────────────────────────────────────────────────────

describe('updateLastEta', () => {
  test('[정상] ETA 기록 업데이트', () => {
    const state = createInitialDepartureAlertState();
    const next = updateLastEta(state, 'lessonX', 25);
    expect(next.lastEtaMinutes['lessonX']).toBe(25);
  });

  test('[사이드이펙트] 원본 상태를 변경하지 않아야 함', () => {
    const state = createInitialDepartureAlertState();
    updateLastEta(state, 'lessonY', 30);
    expect(state.lastEtaMinutes['lessonY']).toBeUndefined();
  });

  test('[정상] 기존 ETA 덮어쓰기', () => {
    const state = createInitialDepartureAlertState();
    state.lastEtaMinutes['lessonZ'] = 20;
    const next = updateLastEta(state, 'lessonZ', 35);
    expect(next.lastEtaMinutes['lessonZ']).toBe(35);
  });
});

// ─── 10. buildDepartureAlertMessage ──────────────────────────────────────────

describe('buildDepartureAlertMessage', () => {
  test('[정상] INITIAL_DEPARTURE에 recommendedAction 있으면 그것이 body', () => {
    const msg = buildDepartureAlertMessage({
      lessonId: 'l1',
      alertType: 'INITIAL_DEPARTURE',
      etaMinutes: 30,
      recommendedAction: '지금 즉시 출발하세요!',
    });
    expect(msg.title).toBe('출발하세요!');
    expect(msg.body).toBe('지금 즉시 출발하세요!');
  });

  test('[정상] INITIAL_DEPARTURE에 recommendedAction 없으면 기본 메시지', () => {
    const msg = buildDepartureAlertMessage({
      lessonId: 'l2',
      alertType: 'INITIAL_DEPARTURE',
      etaMinutes: 20,
    });
    expect(msg.body).toContain('20분');
  });

  test('[정상] ETA_DETERIORATION_FOLLOWUP 메시지 포함 ETA', () => {
    const msg = buildDepartureAlertMessage({
      lessonId: 'l3',
      alertType: 'ETA_DETERIORATION_FOLLOWUP',
      etaMinutes: 50,
    });
    expect(msg.title).toContain('늘어났');
    expect(msg.body).toContain('50분');
  });

  test('[정상] MOVEMENT_WITHOUT_DEPARTURE 메시지', () => {
    const msg = buildDepartureAlertMessage({
      lessonId: 'l4',
      alertType: 'MOVEMENT_WITHOUT_DEPARTURE',
    });
    expect(msg.title).toContain('출발 체크인');
    expect(msg.body).toContain('이동이 감지');
  });

  test('[예외] etaMinutes 없으면 ? 표시', () => {
    const msg = buildDepartureAlertMessage({
      lessonId: 'l5',
      alertType: 'INITIAL_DEPARTURE',
    });
    expect(msg.body).toContain('?분');
  });
});

// ─── 11. 통합 케이스 ─────────────────────────────────────────────────────────

describe('통합: 전체 알림 사이클', () => {
  test('[통합] 최초 알림 발송 → 상태 갱신 → ETA 악화 후속 알림 발송', () => {
    const policy = makePolicyEnabled();
    let state = createInitialDepartureAlertState();
    const lessonId = 'integration-1';

    // 1차: 최초 알림
    const risk1 = makeRisk('HIGH', 30);
    const alerts1 = evaluateDepartureAlerts({ lessonId, risk: risk1, policy, hasDeparted: false, state });
    expect(alerts1.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(true);
    state = applyFiredAlerts(state, alerts1);
    expect(state.initialAlertFired.has(lessonId)).toBe(true);
    expect(state.lastEtaMinutes[lessonId]).toBe(30);

    // 2차: ETA 악화 → 후속 알림
    const risk2 = makeRisk('VERY_HIGH', 40);
    const alerts2 = evaluateDepartureAlerts({ lessonId, risk: risk2, policy, hasDeparted: false, state });
    expect(alerts2.some((a) => a.alertType === 'ETA_DETERIORATION_FOLLOWUP')).toBe(true);
    expect(alerts2.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(false);
    state = applyFiredAlerts(state, alerts2);
    expect(state.etaFollowupFired.has(lessonId)).toBe(true);

    // 3차: 동일 악화 반복 → 재발송 없음
    const risk3 = makeRisk('VERY_HIGH', 55);
    const alerts3 = evaluateDepartureAlerts({ lessonId, risk: risk3, policy, hasDeparted: false, state });
    expect(alerts3.length).toBe(0);
  });

  test('[통합] DEPART 후 stopAfterDepart=true → 이후 알림 없음', () => {
    const policy = makePolicyEnabled(); // stopAfterDepart=true
    const state = createInitialDepartureAlertState();
    const lessonId = 'integration-2';

    const alerts = evaluateDepartureAlerts({
      lessonId,
      risk: makeRisk('HIGH', 35),
      policy,
      hasDeparted: true,
      state,
    });
    expect(alerts.length).toBe(0);
  });

  test('[통합] 이동 감지 + 미출발 → 보조 알림 후 재발송 없음', () => {
    const policy = makePolicyEnabled();
    let state = createInitialDepartureAlertState();
    const lessonId = 'integration-3';

    const alerts1 = evaluateMovementWithoutDeparture({ lessonId, isMoving: true, policy, hasDeparted: false, state });
    expect(alerts1.length).toBe(1);
    state = applyFiredAlerts(state, alerts1);

    const alerts2 = evaluateMovementWithoutDeparture({ lessonId, isMoving: true, policy, hasDeparted: false, state });
    expect(alerts2.length).toBe(0);
  });

  test('[회귀] 모든 정책 비활성 → 어떠한 알림도 없음', () => {
    const policy = makePolicyAllDisabled();
    const state = createInitialDepartureAlertState();

    const depAlerts = evaluateDepartureAlerts({
      lessonId: 'regression-1',
      risk: makeRisk('VERY_HIGH', 60),
      policy,
      hasDeparted: false,
      state,
    });
    const movAlerts = evaluateMovementWithoutDeparture({
      lessonId: 'regression-1',
      isMoving: true,
      policy,
      hasDeparted: false,
      state,
    });

    expect(depAlerts.length).toBe(0);
    expect(movAlerts.length).toBe(0);
  });

  test('[회귀] 알림 상태가 다른 lessonId에 영향을 주지 않음 (격리)', () => {
    const policy = makePolicyEnabled();
    let state = createInitialDepartureAlertState();

    const alerts = evaluateDepartureAlerts({
      lessonId: 'isolation-A',
      risk: makeRisk('HIGH'),
      policy,
      hasDeparted: false,
      state,
    });
    state = applyFiredAlerts(state, alerts);

    // isolation-B는 별도 수업 — 영향 없어야 함
    const alertsB = evaluateDepartureAlerts({
      lessonId: 'isolation-B',
      risk: makeRisk('HIGH'),
      policy,
      hasDeparted: false,
      state,
    });
    expect(alertsB.some((a) => a.alertType === 'INITIAL_DEPARTURE')).toBe(true);
  });
});
