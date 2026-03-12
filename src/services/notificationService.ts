/**
 * notificationService.ts
 * Push 디바이스 등록/해제, 알림 핸들러 설정, 알림 설정 관리 서비스
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { httpClient, type ApiError } from '../api/httpClient';
import type { ApiNotificationSettings, NotificationSettingsUpdate } from '../api/types';

const DEVICE_ID_KEY = 'push_device_id';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// ─── WebSocket 중복 알림 방지 ──────────────────────────────────────────────────

/**
 * WebSocket으로 이미 수신한 이벤트 ID 집합.
 * 포그라운드 Expo Push 핸들러에서 중복 알림을 무시하기 위해 사용합니다.
 * TTL 없이 최대 200개까지만 보관 (순환 방지).
 */
const seenWsEventIds = new Set<string>();
const MAX_SEEN_IDS = 200;

/**
 * WebSocket 수신 시 호출 — 해당 eventId를 "이미 처리됨"으로 표시합니다.
 * notificationService와 chatSocket 사이의 결합 없이 단방향 마킹만 수행합니다.
 */
export function markWsEventSeen(eventId: string): void {
    if (seenWsEventIds.size >= MAX_SEEN_IDS) {
        // 가장 오래된 항목 하나 제거 (Set은 삽입 순서 유지)
        const first = seenWsEventIds.values().next().value;
        if (first !== undefined) seenWsEventIds.delete(first);
    }
    seenWsEventIds.add(eventId);
}

/**
 * 이미 WebSocket으로 처리된 이벤트인지 확인합니다.
 */
export function isWsEventSeen(eventId: string): boolean {
    return seenWsEventIds.has(eventId);
}

const DEFAULT_SETTINGS: ApiNotificationSettings = {
    instructorId: '',
    pushEnabled: true,
    lessonReminder: true,
    paymentNotification: true,
    chatNotification: true,
};

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────

function isApiUnavailableError(e: unknown): boolean {
    const err = e as ApiError | undefined;
    return err?.status === 404 || err?.status === 501;
}

async function getStoredSettings(): Promise<ApiNotificationSettings | null> {
    try {
        const raw = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as ApiNotificationSettings;
    } catch {
        return null;
    }
}

async function setStoredSettings(settings: ApiNotificationSettings): Promise<void> {
    await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

function getPlatform(): 'IOS' | 'ANDROID' {
    return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

async function getPushToken(): Promise<string | null> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: asked } = await Notifications.requestPermissionsAsync();
            if (asked !== 'granted') return null;
        }
        const token = await Notifications.getExpoPushTokenAsync();
        return token.data;
    } catch {
        return null;
    }
}

// ─── 알림 핸들러 설정 ──────────────────────────────────────────────────────────

/**
 * 앱 마운트 시 1회 호출.
 * 포그라운드 알림 표시 및 알림 탭 딥링크 처리를 등록합니다.
 * 반환값: cleanup 함수 (useEffect return 용)
 */
export function setupNotificationHandlers(): () => void {
    // 포그라운드 상태에서도 알림 배너/사운드 표시
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    // 알림 탭 시 타입별 화면 이동
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { type?: string; eventId?: string };

        // WebSocket으로 이미 처리된 이벤트는 무시 (중복 알림 방지)
        if (data?.eventId && isWsEventSeen(data.eventId)) {
            return;
        }

        if (data?.type === 'LESSON_REQUEST') {
            router.replace({ pathname: '/(tabs)/docs', params: { targetTab: '제안' } } as any);
        } else if (data?.type === 'CONTRACT_SENT') {
            router.replace({ pathname: '/(tabs)/docs', params: { targetTab: '계약' } } as any);
        } else if (data?.type === 'SETTLEMENT') {
            router.replace('/(tabs)/income' as any);
        }
    });

    return () => sub.remove();
}

// ─── 디바이스 등록/해제 ────────────────────────────────────────────────────────

/**
 * 로그인 후 push device를 서버에 등록합니다.
 * 권한 거부 시 조용히 null 반환 (앱 사용에는 영향 없음).
 */
export async function registerPushDeviceIfNeeded(): Promise<string | null> {
    const pushToken = await getPushToken();
    if (!pushToken) return null;

    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const deviceName = Constants.deviceName ?? 'Unknown Device';

    try {
        const device = await httpClient.registerPushDevice({
            platform: getPlatform(),
            provider: 'EXPO',
            deviceToken: pushToken,
            appVersion,
            deviceName,
        });
        await SecureStore.setItemAsync(DEVICE_ID_KEY, device.deviceId);
        return device.deviceId;
    } catch {
        return null;
    }
}

/**
 * 로그아웃 시 push device를 서버에서 해제합니다.
 */
export async function deregisterPushDevice(): Promise<void> {
    const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) return;

    try {
        await httpClient.deregisterPushDevice(deviceId);
    } finally {
        await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    }
}

// ─── 알림 설정 ─────────────────────────────────────────────────────────────────

/**
 * 서버에서 알림 설정을 불러옵니다.
 * API 미구현(404/501) 시 로컬 저장값, 없으면 기본값 반환.
 */
export async function fetchNotificationSettings(): Promise<ApiNotificationSettings> {
    try {
        const data = await httpClient.getNotificationSettings();
        await setStoredSettings(data);
        return data;
    } catch (e) {
        if (isApiUnavailableError(e)) {
            const stored = await getStoredSettings();
            if (stored) return stored;
        }
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * 서버에 알림 설정을 저장합니다.
 * API 미구현(404/501) 시 로컬에만 저장.
 */
export async function saveNotificationSettings(
    update: NotificationSettingsUpdate,
): Promise<ApiNotificationSettings> {
    try {
        const updated = await httpClient.updateNotificationSettings(update);
        await setStoredSettings(updated);
        return updated;
    } catch (e) {
        if (isApiUnavailableError(e)) {
            const current = await getStoredSettings();
            const merged: ApiNotificationSettings = {
                ...(current ?? DEFAULT_SETTINGS),
                ...update,
            };
            await setStoredSettings(merged);
            return merged;
        }
        throw e;
    }
}
