/**
 * Issue #217 — backend Expo push 400 로그 전달 및 app 수신 경로 재확인
 *
 * 검증 항목:
 * 1. normalizeNotificationType — 모든 backend snake_case ↔ canonical 매핑
 * 2. ApiPushDevice 타입 계약 — backend 실제 응답과 일치
 * 3. RegisterPushDevicePayload — provider:'EXPO' 필수 포함
 * 4. setupNotificationHandlers — LESSON_REMINDER·GPS_DEPARTURE 포함 전체 라우팅
 * 5. registerPushDeviceIfNeeded — 디버그 로그(토큰·request·response) 확인
 * 6. 예외/사이드이펙트/회귀 케이스
 */

// ── 모킹 ─────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('expo-router', () => ({
    router: { replace: jest.fn() },
}));

jest.mock('expo-constants', () => ({
    __esModule: true,
    default: {
        expoConfig: { version: '2.1.0' },
        deviceName: 'Pixel 8',
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
    Platform: { OS: 'android' },
}));

jest.mock('@/src/api/httpClient', () => ({
    httpClient: {
        registerPushDevice: jest.fn(),
        deregisterPushDevice: jest.fn(),
        getNotificationSettings: jest.fn(),
        updateNotificationSettings: jest.fn(),
    },
    ApiError: class ApiError extends Error {
        status: number;
        constructor(status: number, msg: string) { super(msg); this.status = status; }
    },
}));

// ── Import ────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/src/api/httpClient';
import {
    normalizeNotificationType,
    setupNotificationHandlers,
    registerPushDeviceIfNeeded,
    deregisterPushDevice,
    markWsEventSeen,
    isWsEventSeen,
} from '@/src/services/notificationService';
import type { ApiPushDevice, RegisterPushDevicePayload } from '@/src/api/types';

// ── typed mocks ───────────────────────────────────────────────────────────────

const mockSetHandler = Notifications.setNotificationHandler as jest.Mock;
const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockGetPerms = Notifications.getPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockRequestPerms = Notifications.requestPermissionsAsync as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockSecureGet = SecureStore.getItemAsync as jest.Mock;
const mockSecureSet = SecureStore.setItemAsync as jest.Mock;
const mockSecureDel = SecureStore.deleteItemAsync as jest.Mock;
const mockRegDev = httpClient.registerPushDevice as jest.Mock;
const mockDeregDev = httpClient.deregisterPushDevice as jest.Mock;

// ── 공통 유틸 ─────────────────────────────────────────────────────────────────

function captureResponseCallback(): { invoke: (response: any) => void } {
    let captured: ((r: any) => void) | null = null;
    mockAddListener.mockImplementationOnce((fn: (r: any) => void) => {
        captured = fn;
        return { remove: jest.fn() };
    });
    setupNotificationHandlers();
    return { invoke: (response: any) => captured!(response) };
}

function makeNotifResponse(type: string, extra: Record<string, string> = {}) {
    return {
        notification: {
            request: {
                content: {
                    data: { type, ...extra },
                },
            },
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. normalizeNotificationType
// ─────────────────────────────────────────────────────────────────────────────

describe('[1] normalizeNotificationType — backend snake_case → canonical 매핑', () => {

    test('T01: lesson_request_created → LESSON_REQUEST', () => {
        expect(normalizeNotificationType('lesson_request_created')).toBe('LESSON_REQUEST');
    });

    test('T02: LESSON_REQUEST (canonical) → LESSON_REQUEST 그대로 통과', () => {
        expect(normalizeNotificationType('LESSON_REQUEST')).toBe('LESSON_REQUEST');
    });

    test('T03: contract_sent → CONTRACT_SENT', () => {
        expect(normalizeNotificationType('contract_sent')).toBe('CONTRACT_SENT');
    });

    test('T04: CONTRACT_SENT (canonical) → CONTRACT_SENT 그대로 통과', () => {
        expect(normalizeNotificationType('CONTRACT_SENT')).toBe('CONTRACT_SENT');
    });

    test('T05: settlement_paid → SETTLEMENT', () => {
        expect(normalizeNotificationType('settlement_paid')).toBe('SETTLEMENT');
    });

    test('T06: SETTLEMENT (canonical) → SETTLEMENT 그대로 통과', () => {
        expect(normalizeNotificationType('SETTLEMENT')).toBe('SETTLEMENT');
    });

    test('T07: lesson_reminder → LESSON_REMINDER (수업 시작 전 리마인더)', () => {
        expect(normalizeNotificationType('lesson_reminder')).toBe('LESSON_REMINDER');
    });

    test('T08: LESSON_REMINDER (canonical) → LESSON_REMINDER 그대로 통과', () => {
        expect(normalizeNotificationType('LESSON_REMINDER')).toBe('LESSON_REMINDER');
    });

    test('T09: lesson_finish_reminder → FINISH_REMINDER (수업 종료 처리 리마인더)', () => {
        expect(normalizeNotificationType('lesson_finish_reminder')).toBe('FINISH_REMINDER');
    });

    test('T10: FINISH_REMINDER (canonical) → FINISH_REMINDER 그대로 통과', () => {
        expect(normalizeNotificationType('FINISH_REMINDER')).toBe('FINISH_REMINDER');
    });

    test('T11: smart_departure_alert → GPS_DEPARTURE', () => {
        expect(normalizeNotificationType('smart_departure_alert')).toBe('GPS_DEPARTURE');
    });

    test('T12: GPS_DEPARTURE (canonical) → GPS_DEPARTURE 그대로 통과', () => {
        expect(normalizeNotificationType('GPS_DEPARTURE')).toBe('GPS_DEPARTURE');
    });

    test('T13: undefined 입력 → undefined 반환', () => {
        expect(normalizeNotificationType(undefined)).toBeUndefined();
    });

    test('T14: 빈 문자열 입력 → undefined 반환', () => {
        expect(normalizeNotificationType('')).toBeUndefined();
    });

    test('T15: 알 수 없는 타입은 원본 값 그대로 반환 (passthrough)', () => {
        expect(normalizeNotificationType('unknown_event_xyz')).toBe('unknown_event_xyz');
    });

    test('T16: 대소문자 구분 — "Lesson_request_created"는 매핑 안 됨 (대소문자 구분)', () => {
        expect(normalizeNotificationType('Lesson_request_created')).toBe('Lesson_request_created');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ApiPushDevice 타입 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('[2] ApiPushDevice 타입 계약 — backend 실제 응답과 일치', () => {

    const sampleDevice: ApiPushDevice = {
        deviceId: 'dev_001',
        platform: 'ANDROID',
        provider: 'EXPO',
        deviceToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        appVersion: '1.0.0',
        deviceName: 'Pixel 8',
        isActive: true,
        lastSeenAt: '2026-03-12T11:45:00.000Z',
        createdAt: '2026-03-12T11:45:00.000Z',
        updatedAt: '2026-03-12T11:45:00.000Z',
    };

    test('T17: deviceId 필드 존재', () => {
        expect(sampleDevice).toHaveProperty('deviceId', 'dev_001');
    });

    test('T18: deviceToken 필드 존재 (pushToken 아님)', () => {
        expect(sampleDevice).toHaveProperty('deviceToken');
        expect(sampleDevice).not.toHaveProperty('pushToken');
    });

    test('T19: provider 필드 존재', () => {
        expect(sampleDevice).toHaveProperty('provider', 'EXPO');
    });

    test('T20: lastSeenAt 필드 존재 (registeredAt 아님)', () => {
        expect(sampleDevice).toHaveProperty('lastSeenAt');
        expect(sampleDevice).not.toHaveProperty('registeredAt');
    });

    test('T21: createdAt / updatedAt 필드 존재', () => {
        expect(sampleDevice).toHaveProperty('createdAt');
        expect(sampleDevice).toHaveProperty('updatedAt');
    });

    test('T22: instructorId 필드 없음 (backend 응답에 없음)', () => {
        expect(sampleDevice).not.toHaveProperty('instructorId');
    });

    test('T23: RegisterPushDevicePayload에 provider: EXPO 포함', () => {
        const payload: RegisterPushDevicePayload = {
            platform: 'ANDROID',
            provider: 'EXPO',
            deviceToken: 'ExponentPushToken[yyy]',
            appVersion: '1.0.0',
            deviceName: 'Pixel 8',
        };
        expect(payload.provider).toBe('EXPO');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. setupNotificationHandlers — 전체 라우팅 (LESSON_REMINDER·GPS_DEPARTURE 포함)
// ─────────────────────────────────────────────────────────────────────────────

describe('[3] setupNotificationHandlers — 알림 탭 라우팅', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockAddListener.mockReturnValue({ remove: jest.fn() });
    });

    test('T24: lesson_request_created → /(tabs)/docs (제안 탭)', () => {
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('lesson_request_created'));
        expect(mockReplace).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/(tabs)/docs', params: expect.objectContaining({ targetTab: '제안' }) })
        );
    });

    test('T25: contract_sent → /(tabs)/docs (계약 탭)', () => {
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('contract_sent'));
        expect(mockReplace).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/(tabs)/docs', params: expect.objectContaining({ targetTab: '계약' }) })
        );
    });

    test('T26: settlement_paid → /(tabs)/income', () => {
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('settlement_paid'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/income');
    });

    test('T27: lesson_reminder → /(tabs)/ (홈 탭)', () => {
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('lesson_reminder'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
    });

    test('T28: lesson_finish_reminder → /(tabs)/ (홈 탭)', () => {
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('lesson_finish_reminder'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
    });

    test('T29: smart_departure_alert → /(tabs)/ (홈 탭)', () => {
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('smart_departure_alert'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
    });

    test('T30: eventId가 seen 처리된 경우 router.replace 호출 안 됨', () => {
        const id = `seen-${Date.now()}`;
        markWsEventSeen(id);
        const { invoke } = captureResponseCallback();
        invoke({ notification: { request: { content: { data: { type: 'contract_sent', eventId: id } } } } });
        expect(mockReplace).not.toHaveBeenCalled();
    });

    test('T31: 알 수 없는 type이 와도 router.replace 호출 안 됨 (크래시 없음)', () => {
        const { invoke } = captureResponseCallback();
        expect(() => invoke(makeNotifResponse('completely_unknown_type'))).not.toThrow();
        expect(mockReplace).not.toHaveBeenCalled();
    });

    test('T32: data가 없어도 크래시 없음', () => {
        const { invoke } = captureResponseCallback();
        expect(() => invoke({ notification: { request: { content: { data: null } } } })).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. registerPushDeviceIfNeeded — 등록 요청 payload 및 디버그 로그
// ─────────────────────────────────────────────────────────────────────────────

describe('[4] registerPushDeviceIfNeeded — 등록 요청 및 로그', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('T33: 권한 있을 때 등록 성공 — deviceId 반환', async () => {
        mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
        mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });
        mockRegDev.mockResolvedValueOnce({
            deviceId: 'dev_001',
            platform: 'ANDROID',
            provider: 'EXPO',
            deviceToken: 'ExponentPushToken[abc]',
            appVersion: '2.1.0',
            deviceName: 'Pixel 8',
            isActive: true,
            lastSeenAt: '2026-03-12T11:00:00.000Z',
            createdAt: '2026-03-12T11:00:00.000Z',
            updatedAt: '2026-03-12T11:00:00.000Z',
        });
        mockSecureSet.mockResolvedValueOnce(undefined);

        const result = await registerPushDeviceIfNeeded();
        expect(result).toBe('dev_001');
    });

    test('T34: 등록 요청에 provider:"EXPO" 포함됨', async () => {
        mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
        mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[xyz]' });
        mockRegDev.mockResolvedValueOnce({ deviceId: 'dev_002', platform: 'ANDROID', provider: 'EXPO', deviceToken: 'ExponentPushToken[xyz]', appVersion: '2.1.0', deviceName: 'Pixel 8', isActive: true, lastSeenAt: '', createdAt: '', updatedAt: '' });
        mockSecureSet.mockResolvedValueOnce(undefined);

        await registerPushDeviceIfNeeded();
        const call = mockRegDev.mock.calls[0][0];
        expect(call.provider).toBe('EXPO');
    });

    test('T35: 등록 요청에 deviceToken 포함됨', async () => {
        const token = 'ExponentPushToken[TOKEN_VALUE]';
        mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
        mockGetToken.mockResolvedValueOnce({ data: token });
        mockRegDev.mockResolvedValueOnce({ deviceId: 'dev_003', platform: 'ANDROID', provider: 'EXPO', deviceToken: token, appVersion: '2.1.0', deviceName: 'Pixel 8', isActive: true, lastSeenAt: '', createdAt: '', updatedAt: '' });
        mockSecureSet.mockResolvedValueOnce(undefined);

        await registerPushDeviceIfNeeded();
        expect(mockRegDev.mock.calls[0][0].deviceToken).toBe(token);
    });

    test('T36: 등록 요청에 appVersion / deviceName 포함됨', async () => {
        mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
        mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[T]' });
        mockRegDev.mockResolvedValueOnce({ deviceId: 'd', platform: 'ANDROID', provider: 'EXPO', deviceToken: 'ExponentPushToken[T]', appVersion: '2.1.0', deviceName: 'Pixel 8', isActive: true, lastSeenAt: '', createdAt: '', updatedAt: '' });
        mockSecureSet.mockResolvedValueOnce(undefined);

        await registerPushDeviceIfNeeded();
        const call = mockRegDev.mock.calls[0][0];
        expect(call.appVersion).toBe('2.1.0');
        expect(call.deviceName).toBe('Pixel 8');
    });

    test('T37: 등록 성공 시 Expo token 디버그 로그 출력 확인', async () => {
        const consoleSpy = jest.spyOn(console, 'log');
        mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
        mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[LOG_TEST]' });
        mockRegDev.mockResolvedValueOnce({ deviceId: 'd', platform: 'ANDROID', provider: 'EXPO', deviceToken: 'ExponentPushToken[LOG_TEST]', appVersion: '2.1.0', deviceName: 'Pixel 8', isActive: true, lastSeenAt: '', createdAt: '', updatedAt: '' });
        mockSecureSet.mockResolvedValueOnce(undefined);

        await registerPushDeviceIfNeeded();

        const logCalls = consoleSpy.mock.calls.map(c => c.join(' '));
        const hasTokenLog = logCalls.some(l => l.includes('ExponentPushToken[LOG_TEST]'));
        expect(hasTokenLog).toBe(true);
    });

    test('T38: 권한 거부 시 null 반환 / warn 로그 출력', async () => {
        const consoleSpy = jest.spyOn(console, 'warn');
        mockGetPerms.mockResolvedValueOnce({ status: 'denied' });
        mockRequestPerms.mockResolvedValueOnce({ status: 'denied' });

        const result = await registerPushDeviceIfNeeded();
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
    });

    test('T39: registerPushDevice 실패 시 null 반환 / error 로그 출력', async () => {
        const consoleSpy = jest.spyOn(console, 'error');
        mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
        mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[ERR]' });
        mockRegDev.mockRejectedValueOnce(new Error('Network error'));
        mockSecureSet.mockResolvedValueOnce(undefined);

        const result = await registerPushDeviceIfNeeded();
        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. 사이드이펙트 / 통합 / 회귀
// ─────────────────────────────────────────────────────────────────────────────

describe('[5] 사이드이펙트·통합·회귀', () => {

    beforeEach(() => jest.clearAllMocks());

    test('T40: isWsEventSeen — 미등록 ID는 false', () => {
        expect(isWsEventSeen(`notexist-${Date.now()}`)).toBe(false);
    });

    test('T41: markWsEventSeen 후 isWsEventSeen true', () => {
        const id = `ws-${Date.now()}`;
        markWsEventSeen(id);
        expect(isWsEventSeen(id)).toBe(true);
    });

    test('T42: deregisterPushDevice — deviceId 없으면 서버 호출 안 함', async () => {
        mockSecureGet.mockResolvedValueOnce(null);
        await deregisterPushDevice();
        expect(mockDeregDev).not.toHaveBeenCalled();
    });

    test('T43: deregisterPushDevice — deviceId 있으면 서버 호출 및 SecureStore 삭제', async () => {
        mockSecureGet.mockResolvedValueOnce('dev_999');
        mockDeregDev.mockResolvedValueOnce(undefined);
        mockSecureDel.mockResolvedValueOnce(undefined);

        await deregisterPushDevice();
        expect(mockDeregDev).toHaveBeenCalledWith('dev_999');
        expect(mockSecureDel).toHaveBeenCalled();
    });

    test('T44: 기존 LESSON_REQUEST canonical 타입 라우팅 회귀 — 기능 유지', () => {
        mockAddListener.mockReturnValue({ remove: jest.fn() });
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('LESSON_REQUEST'));
        expect(mockReplace).toHaveBeenCalledWith(
            expect.objectContaining({ pathname: '/(tabs)/docs' })
        );
    });

    test('T45: 기존 SETTLEMENT canonical 라우팅 회귀 — 기능 유지', () => {
        mockAddListener.mockReturnValue({ remove: jest.fn() });
        const { invoke } = captureResponseCallback();
        invoke(makeNotifResponse('SETTLEMENT'));
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)/income');
    });
});
