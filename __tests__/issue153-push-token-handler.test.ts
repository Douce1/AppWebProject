/**
 * Issue #153 — 푸시 토큰 등록 및 수신 핸들러 연결 테스트
 * 대상: notificationService.ts (markWsEventSeen, isWsEventSeen, 딥링크 라우팅, 중복 방지)
 */

// ── 모킹 설정 ──────────────────────────────────────────────────────────────────

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
    default: { expoConfig: { version: '1.0.0' }, deviceName: 'Test Device' },
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
    markWsEventSeen,
    isWsEventSeen,
    setupNotificationHandlers,
    registerPushDeviceIfNeeded,
    deregisterPushDevice,
} from '@/src/services/notificationService';

// typed aliases for mocked fns
const mockSetHandler = Notifications.setNotificationHandler as jest.Mock;
const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockGetPerms = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPerms = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockReplace = router.replace as jest.Mock;
const mockSecureGet = SecureStore.getItemAsync as jest.Mock;
const mockSecureSet = SecureStore.setItemAsync as jest.Mock;
const mockSecureDel = SecureStore.deleteItemAsync as jest.Mock;
const mockRegDev = httpClient.registerPushDevice as jest.Mock;
const mockDeregDev = httpClient.deregisterPushDevice as jest.Mock;

// ── 테스트 ─────────────────────────────────────────────────────────────────────

describe('Issue #153 — 푸시 토큰 등록 및 수신 핸들러 연결', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockAddListener.mockReturnValue({ remove: jest.fn() });
    });

    function captureResponseCallback(): { invoke: (response: any) => void } {
        let captured: ((r: any) => void) | null = null;
        mockAddListener.mockImplementationOnce((fn: (r: any) => void) => {
            captured = fn;
            return { remove: jest.fn() };
        });
        setupNotificationHandlers();
        return {
            invoke: (response: any) => captured!(response),
        };
    }

    // ───── 정상 케이스 ────────────────────────────────────────────────────────

    describe('정상 케이스', () => {
        test('T01: markWsEventSeen은 이벤트 ID를 seen 집합에 추가한다', () => {
            const id = `T01-${Date.now()}`;
            markWsEventSeen(id);
            expect(isWsEventSeen(id)).toBe(true);
        });

        test('T02: 등록하지 않은 ID는 isWsEventSeen이 false를 반환한다', () => {
            expect(isWsEventSeen(`never-${Date.now()}`)).toBe(false);
        });

        test('T03: 여러 이벤트 ID를 독립적으로 등록할 수 있다', () => {
            const p = `T03-${Date.now()}`;
            markWsEventSeen(p + 'a');
            markWsEventSeen(p + 'b');
            markWsEventSeen(p + 'c');
            expect(isWsEventSeen(p + 'a')).toBe(true);
            expect(isWsEventSeen(p + 'b')).toBe(true);
            expect(isWsEventSeen(p + 'c')).toBe(true);
        });

        test('T04: 동일 ID를 중복 등록해도 seen 상태가 유지된다', () => {
            const id = `dup-${Date.now()}`;
            markWsEventSeen(id);
            markWsEventSeen(id);
            expect(isWsEventSeen(id)).toBe(true);
        });

        test('T05: setupNotificationHandlers는 cleanup 함수를 반환한다', () => {
            const cleanup = setupNotificationHandlers();
            expect(typeof cleanup).toBe('function');
        });

        test('T06: setupNotificationHandlers 호출 시 setNotificationHandler가 실행된다', () => {
            setupNotificationHandlers();
            expect(mockSetHandler).toHaveBeenCalledTimes(1);
        });

        test('T07: setupNotificationHandlers 호출 시 addNotificationResponseReceivedListener가 등록된다', () => {
            setupNotificationHandlers();
            expect(mockAddListener).toHaveBeenCalledTimes(1);
        });

        test('T08: cleanup 호출 시 listener가 제거된다', () => {
            const mockRemove = jest.fn();
            mockAddListener.mockReturnValueOnce({ remove: mockRemove });
            const cleanup = setupNotificationHandlers();
            cleanup();
            expect(mockRemove).toHaveBeenCalledTimes(1);
        });

        test('T09: LESSON_REQUEST 탭 시 /(tabs)/docs로 이동', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'LESSON_REQUEST' } } } } });
            expect(mockReplace).toHaveBeenCalledWith(
                expect.objectContaining({ pathname: '/(tabs)/docs' })
            );
        });

        test('T10: CONTRACT_SENT 탭 시 /(tabs)/docs로 이동', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'CONTRACT_SENT' } } } } });
            expect(mockReplace).toHaveBeenCalledWith(
                expect.objectContaining({ pathname: '/(tabs)/docs' })
            );
        });

        test('T11: SETTLEMENT 탭 시 /(tabs)/income으로 이동', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'SETTLEMENT' } } } } });
            expect(mockReplace).toHaveBeenCalledWith('/(tabs)/income');
        });

        test('T12: registerPushDeviceIfNeeded — 권한 있을 때 deviceId 반환', async () => {
            mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
            mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[t]' });
            mockRegDev.mockResolvedValueOnce({ deviceId: 'device-123' });
            mockSecureSet.mockResolvedValueOnce(undefined);

            expect(await registerPushDeviceIfNeeded()).toBe('device-123');
        });

        test('T13: deregisterPushDevice — deviceId 있을 때 서버 해제 호출', async () => {
            mockSecureGet.mockResolvedValueOnce('device-456');
            mockDeregDev.mockResolvedValueOnce(undefined);
            mockSecureDel.mockResolvedValueOnce(undefined);

            await deregisterPushDevice();
            expect(mockDeregDev).toHaveBeenCalledWith('device-456');
        });
    });

    // ───── 예외 케이스 ────────────────────────────────────────────────────────

    describe('예외 케이스', () => {
        test('T14: 특수문자 포함 eventId도 정상 처리된다', () => {
            const id = `T14-!@#$-${Date.now()}`;
            markWsEventSeen(id);
            expect(isWsEventSeen(id)).toBe(true);
        });

        test('T15: UUID 형식 eventId 정상 처리', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            markWsEventSeen(uuid);
            expect(isWsEventSeen(uuid)).toBe(true);
        });

        test('T16: 미등록 ID는 false 반환', () => {
            expect(isWsEventSeen(`missing-${Date.now()}`)).toBe(false);
        });

        test('T17: registerPushDeviceIfNeeded — 권한 거부 시 null 반환', async () => {
            mockGetPerms.mockResolvedValueOnce({ status: 'denied' });
            mockRequestPerms.mockResolvedValueOnce({ status: 'denied' });
            expect(await registerPushDeviceIfNeeded()).toBeNull();
        });

        test('T18: registerPushDeviceIfNeeded — 토큰 획득 실패 시 null 반환', async () => {
            mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
            mockGetToken.mockRejectedValueOnce(new Error('Token error'));
            expect(await registerPushDeviceIfNeeded()).toBeNull();
        });

        test('T19: registerPushDeviceIfNeeded — 서버 등록 실패 시 null 반환', async () => {
            mockGetPerms.mockResolvedValueOnce({ status: 'granted' });
            mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[x]' });
            mockRegDev.mockRejectedValueOnce(new Error('Network error'));
            expect(await registerPushDeviceIfNeeded()).toBeNull();
        });

        test('T20: deregisterPushDevice — deviceId 없으면 서버 호출 안 함', async () => {
            mockSecureGet.mockResolvedValueOnce(null);
            await deregisterPushDevice();
            expect(mockDeregDev).not.toHaveBeenCalled();
        });

        test('T21: 알 수 없는 알림 type은 router.replace를 호출하지 않는다', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'UNKNOWN_TYPE' } } } } });
            expect(mockReplace).not.toHaveBeenCalled();
        });

        test('T22: data가 null인 경우 router.replace를 호출하지 않는다', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: null } } } });
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    // ───── 중복 알림 방지 (WebSocket dedup) ───────────────────────────────────

    describe('사이드 이펙트 — WebSocket 중복 알림 방지', () => {
        test('T23: WebSocket 수신 이벤트가 있으면 push 탭 시 router.replace가 호출되지 않는다', () => {
            const wsId = `ws-${Date.now()}`;
            markWsEventSeen(wsId);
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'LESSON_REQUEST', eventId: wsId } } } } });
            expect(mockReplace).not.toHaveBeenCalled();
        });

        test('T24: eventId가 없는 push 알림은 dedup 없이 정상 라우팅된다', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'SETTLEMENT' } } } } });
            expect(mockReplace).toHaveBeenCalledWith('/(tabs)/income');
        });

        test('T25: markWsEventSeen 전에는 isWsEventSeen이 false다', () => {
            const id = `fresh-${Date.now()}`;
            expect(isWsEventSeen(id)).toBe(false);
            markWsEventSeen(id);
            expect(isWsEventSeen(id)).toBe(true);
        });

        test('T26: 서로 다른 eventId는 독립적으로 관리된다', () => {
            const ts = Date.now();
            const x = `x-${ts}`;
            const y = `y-${ts}-other`;
            markWsEventSeen(x);
            expect(isWsEventSeen(x)).toBe(true);
            expect(isWsEventSeen(y)).toBe(false);
        });

        test('T27: WebSocket으로 본 CONTRACT_SENT 이벤트는 push 탭에서 무시된다', () => {
            const wsId = `contract-${Date.now()}`;
            markWsEventSeen(wsId);
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'CONTRACT_SENT', eventId: wsId } } } } });
            expect(mockReplace).not.toHaveBeenCalled();
        });

        test('T28: WebSocket으로 본 SETTLEMENT 이벤트는 push 탭에서 무시된다', () => {
            const wsId = `settle-${Date.now()}`;
            markWsEventSeen(wsId);
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'SETTLEMENT', eventId: wsId } } } } });
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });

    // ───── 통합 케이스 ────────────────────────────────────────────────────────

    describe('통합 케이스', () => {
        test('T29: LESSON_REQUEST 이동 시 params에 targetTab이 포함된다', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'LESSON_REQUEST' } } } } });
            const arg = mockReplace.mock.calls[0][0];
            expect(arg).toHaveProperty('params.targetTab');
        });

        test('T30: CONTRACT_SENT 이동 시 params에 targetTab이 포함된다', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: { type: 'CONTRACT_SENT' } } } } });
            const arg = mockReplace.mock.calls[0][0];
            expect(arg).toHaveProperty('params.targetTab');
        });

        test('T31: deregisterPushDevice 후 SecureStore에서 deviceId가 삭제된다', async () => {
            mockSecureGet.mockResolvedValueOnce('device-789');
            mockDeregDev.mockResolvedValueOnce(undefined);
            mockSecureDel.mockResolvedValueOnce(undefined);

            await deregisterPushDevice();
            expect(mockSecureDel).toHaveBeenCalledWith('push_device_id');
        });

        test('T32: deregisterPushDevice 서버 실패해도 SecureStore에서 deviceId는 삭제된다', async () => {
            mockSecureGet.mockResolvedValueOnce('device-err');
            mockDeregDev.mockRejectedValueOnce(new Error('Server error'));
            mockSecureDel.mockResolvedValueOnce(undefined);

            // finally 블록에서 삭제가 실행된 후 에러가 전파됨
            await expect(deregisterPushDevice()).rejects.toThrow('Server error');
            expect(mockSecureDel).toHaveBeenCalledWith('push_device_id');
        });

        test('T33: registerPushDeviceIfNeeded — undetermined 후 허용되면 등록 성공', async () => {
            mockGetPerms.mockResolvedValueOnce({ status: 'undetermined' });
            mockRequestPerms.mockResolvedValueOnce({ status: 'granted' });
            mockGetToken.mockResolvedValueOnce({ data: 'ExponentPushToken[new]' });
            mockRegDev.mockResolvedValueOnce({ deviceId: 'device-new-001' });
            mockSecureSet.mockResolvedValueOnce(undefined);

            expect(await registerPushDeviceIfNeeded()).toBe('device-new-001');
        });
    });

    // ───── 회귀 케이스 ────────────────────────────────────────────────────────

    describe('회귀 케이스', () => {
        test('T34: setupNotificationHandlers를 두 번 호출해도 각각 독립적인 cleanup 반환', () => {
            const cleanup1 = setupNotificationHandlers();
            const cleanup2 = setupNotificationHandlers();
            expect(typeof cleanup1).toBe('function');
            expect(typeof cleanup2).toBe('function');
            expect(cleanup1).not.toBe(cleanup2);
        });

        test('T35: markWsEventSeen은 기존 이벤트 조회에 영향을 주지 않는다', () => {
            const stable = `stable-${Date.now()}`;
            markWsEventSeen(stable);
            markWsEventSeen(`other-${Date.now()}`);
            expect(isWsEventSeen(stable)).toBe(true);
        });

        test('T36: 알림 type이 undefined인 경우 router.replace를 호출하지 않는다', () => {
            const { invoke } = captureResponseCallback();
            invoke({ notification: { request: { content: { data: {} } } } });
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });
});
