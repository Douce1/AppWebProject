/**
 * departureAlertService.ts
 *
 * 출발 알림 서비스:
 * - 최초 출발 알림 노출 (riskLevel 기반, 정책 enabled 체크)
 * - ETA 악화 시 추가 알림 1회 (etaDeteriorationFollowupEnabled)
 * - DEPART 이후 출발 알림 중단 (stopAfterDepart)
 * - 출발 미확인 이동 감지 시 보조 알림 (movementWithoutDepartureAlertEnabled)
 *
 * 모든 핵심 함수는 순수 함수로 작성되어 테스트 용이성을 유지합니다.
 */

import type { ApiCommuteRisk, ApiCommuteAlertPolicy, CommuteRiskLevel } from '../api/types';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type DepartureAlertType =
  | 'INITIAL_DEPARTURE'         // 최초 출발 권고 알림
  | 'ETA_DETERIORATION_FOLLOWUP' // ETA 악화 후속 알림
  | 'MOVEMENT_WITHOUT_DEPARTURE'; // 출발 미확인 이동 감지 알림

export interface DepartureAlertState {
  /** lessonId별 최초 출발 알림 발송 여부 */
  initialAlertFired: Set<string>;
  /** lessonId별 ETA 악화 후속 알림 발송 여부 (1회 제한) */
  etaFollowupFired: Set<string>;
  /** lessonId별 출발 미확인 이동 감지 알림 발송 여부 */
  movementWithoutDepartFired: Set<string>;
  /** lessonId별 마지막으로 기록된 ETA (분) */
  lastEtaMinutes: Record<string, number>;
}

export interface DepartureAlertPayload {
  lessonId: string;
  alertType: DepartureAlertType;
  riskLevel?: CommuteRiskLevel;
  etaMinutes?: number;
  recommendedAction?: string;
}

export interface EvaluateDepartureOptions {
  lessonId: string;
  risk: ApiCommuteRisk;
  policy: ApiCommuteAlertPolicy;
  /** 해당 수업이 이미 DEPART 이벤트를 받았는지 여부 */
  hasDeparted: boolean;
  state: DepartureAlertState;
}

export interface EvaluateMovementOptions {
  lessonId: string;
  /** 사용자가 이동 중인지 여부 (속도 또는 위치 변화 기반) */
  isMoving: boolean;
  policy: ApiCommuteAlertPolicy;
  hasDeparted: boolean;
  state: DepartureAlertState;
}

// ─── 초기 상태 ────────────────────────────────────────────────────────────────

export function createInitialDepartureAlertState(): DepartureAlertState {
  return {
    initialAlertFired: new Set(),
    etaFollowupFired: new Set(),
    movementWithoutDepartFired: new Set(),
    lastEtaMinutes: {},
  };
}

// ─── 위험 수준 평가 ────────────────────────────────────────────────────────────

/**
 * riskLevel이 출발 알림을 트리거해야 하는 수준인지 판단합니다.
 * MEDIUM 이상이면 true를 반환합니다.
 */
export function isAlertableRiskLevel(riskLevel: CommuteRiskLevel): boolean {
  return riskLevel === 'MEDIUM' || riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH';
}

/**
 * riskLevel이 높은 위험 수준인지 판단합니다.
 * HIGH 이상이면 true를 반환합니다.
 */
export function isHighRiskLevel(riskLevel: CommuteRiskLevel): boolean {
  return riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH';
}

// ─── ETA 악화 판단 ────────────────────────────────────────────────────────────

/**
 * 새 ETA가 이전 ETA보다 악화되었는지 판단합니다.
 * thresholdMinutes 이상 증가했으면 악화로 간주합니다.
 */
export function isEtaDeteriorated(
  prevEtaMinutes: number,
  newEtaMinutes: number,
  thresholdMinutes: number = 5,
): boolean {
  return newEtaMinutes - prevEtaMinutes >= thresholdMinutes;
}

// ─── 핵심 평가 함수 ───────────────────────────────────────────────────────────

/**
 * 현재 위험도/정책 상태를 기반으로 발송해야 할 출발 알림을 평가합니다.
 *
 * 규칙:
 * 1. hasDeparted + stopAfterDepart = true 이면 출발 알림 없음
 * 2. 최초 알림: initialDepartureAlertEnabled && isAlertableRiskLevel && 미발송
 * 3. ETA 악화 후속 알림: etaDeteriorationFollowupEnabled && ETA 악화 감지 && 1회 제한
 *
 * @returns 발송해야 할 알림 목록 (빈 배열이면 발송 없음)
 */
export function evaluateDepartureAlerts(
  options: EvaluateDepartureOptions,
): DepartureAlertPayload[] {
  const { lessonId, risk, policy, hasDeparted, state } = options;
  const results: DepartureAlertPayload[] = [];

  // DEPART 이후 출발 알림 중단
  if (hasDeparted && policy.stopAfterDepart) {
    return results;
  }

  // 1. 최초 출발 알림
  if (
    policy.initialDepartureAlertEnabled &&
    isAlertableRiskLevel(risk.riskLevel) &&
    !state.initialAlertFired.has(lessonId)
  ) {
    results.push({
      lessonId,
      alertType: 'INITIAL_DEPARTURE',
      riskLevel: risk.riskLevel,
      etaMinutes: risk.etaMinutes,
      recommendedAction: risk.recommendedAction,
    });
  }

  // 2. ETA 악화 후속 알림 (최초 알림이 이미 발송됐거나 현재 발송 예정인 경우에만 유효)
  const initialAlreadyFired = state.initialAlertFired.has(lessonId);
  const initialWillFire = results.some((r) => r.alertType === 'INITIAL_DEPARTURE');
  const hasInitialContext = initialAlreadyFired || initialWillFire;

  if (
    hasInitialContext &&
    policy.etaDeteriorationFollowupEnabled &&
    !state.etaFollowupFired.has(lessonId)
  ) {
    const prevEta = state.lastEtaMinutes[lessonId];
    if (prevEta !== undefined && isEtaDeteriorated(prevEta, risk.etaMinutes)) {
      results.push({
        lessonId,
        alertType: 'ETA_DETERIORATION_FOLLOWUP',
        riskLevel: risk.riskLevel,
        etaMinutes: risk.etaMinutes,
        recommendedAction: risk.recommendedAction,
      });
    }
  }

  return results;
}

/**
 * 출발 미확인 이동 감지 알림을 평가합니다.
 *
 * 규칙:
 * - movementWithoutDepartureAlertEnabled && isMoving && !hasDeparted && 미발송
 *
 * @returns 발송해야 할 알림 목록 (빈 배열이면 발송 없음)
 */
export function evaluateMovementWithoutDeparture(
  options: EvaluateMovementOptions,
): DepartureAlertPayload[] {
  const { lessonId, isMoving, policy, hasDeparted, state } = options;

  if (
    policy.movementWithoutDepartureAlertEnabled &&
    isMoving &&
    !hasDeparted &&
    !state.movementWithoutDepartFired.has(lessonId)
  ) {
    return [{ lessonId, alertType: 'MOVEMENT_WITHOUT_DEPARTURE' }];
  }

  return [];
}

// ─── 상태 업데이트 헬퍼 ────────────────────────────────────────────────────────

/**
 * 발송 완료된 알림들을 상태에 반영하여 새 상태를 반환합니다.
 * 원본 상태를 변경하지 않고 새 Set/Record를 생성합니다.
 */
export function applyFiredAlerts(
  state: DepartureAlertState,
  fired: DepartureAlertPayload[],
): DepartureAlertState {
  const initialAlertFired = new Set(state.initialAlertFired);
  const etaFollowupFired = new Set(state.etaFollowupFired);
  const movementWithoutDepartFired = new Set(state.movementWithoutDepartFired);
  const lastEtaMinutes = { ...state.lastEtaMinutes };

  for (const alert of fired) {
    if (alert.alertType === 'INITIAL_DEPARTURE') {
      initialAlertFired.add(alert.lessonId);
      if (alert.etaMinutes !== undefined) {
        lastEtaMinutes[alert.lessonId] = alert.etaMinutes;
      }
    } else if (alert.alertType === 'ETA_DETERIORATION_FOLLOWUP') {
      etaFollowupFired.add(alert.lessonId);
      if (alert.etaMinutes !== undefined) {
        lastEtaMinutes[alert.lessonId] = alert.etaMinutes;
      }
    } else if (alert.alertType === 'MOVEMENT_WITHOUT_DEPARTURE') {
      movementWithoutDepartFired.add(alert.lessonId);
    }
  }

  return { initialAlertFired, etaFollowupFired, movementWithoutDepartFired, lastEtaMinutes };
}

/**
 * ETA 기록만 업데이트합니다 (알림 발송 없이 ETA를 추적할 때 사용).
 */
export function updateLastEta(
  state: DepartureAlertState,
  lessonId: string,
  etaMinutes: number,
): DepartureAlertState {
  return {
    ...state,
    lastEtaMinutes: { ...state.lastEtaMinutes, [lessonId]: etaMinutes },
  };
}

// ─── 알림 메시지 빌더 ─────────────────────────────────────────────────────────

/**
 * 알림 타입과 위험 정보로 사용자에게 표시할 제목/내용을 생성합니다.
 */
export function buildDepartureAlertMessage(alert: DepartureAlertPayload): {
  title: string;
  body: string;
} {
  switch (alert.alertType) {
    case 'INITIAL_DEPARTURE':
      return {
        title: '출발하세요!',
        body: alert.recommendedAction
          ? alert.recommendedAction
          : `예상 도착 ${alert.etaMinutes ?? '?'}분 — 지금 출발하세요.`,
      };
    case 'ETA_DETERIORATION_FOLLOWUP':
      return {
        title: '도착 시간이 늘어났습니다',
        body: `현재 예상 도착까지 ${alert.etaMinutes ?? '?'}분이 필요합니다. 서둘러 출발하세요.`,
      };
    case 'MOVEMENT_WITHOUT_DEPARTURE':
      return {
        title: '출발 체크인을 잊으셨나요?',
        body: '이동이 감지되었지만 출발 체크인이 등록되지 않았습니다. 출발을 등록해주세요.',
      };
    default:
      return { title: '출발 알림', body: '' };
  }
}
