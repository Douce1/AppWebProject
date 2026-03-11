/**
 * notificationService.ts
 * Push 디바이스 등록/해제 및 알림 설정 관리 서비스 (MVP)
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { httpClient, type ApiError } from '../api/httpClient';
import type { ApiNotificationSettings, NotificationSettingsUpdate } from '../api/types';

const DEVICE_ID_KEY = 'push_device_id';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

/** 푸시 토큰을 가져옵니다. expo-notifications가 없는 환경에서는 null 반환 */
async function getPushToken(): Promise<string | null> {
    try {
        // expo-notifications가 설치돼 있으면 동적으로 로드
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Notifications = require('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: asked } = await Notifications.requestPermissionsAsync();
            if (asked !== 'granted') return null;
        }
        const token = await Notifications.getExpoPushTokenAsync();
        return token.data as string;
    } catch {
        return null;
    }
}

const DEFAULT_SETTINGS: ApiNotificationSettings = {
    instructorId: '',
    pushEnabled: true,
    lessonReminder: true,
    paymentNotification: true,
    chatNotification: true,
};

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

function getPlatform(): 'ios' | 'android' | 'web' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'web';
}

/**
 * 로그인 후 push device를 서버에 등록합니다.
 * 이미 등록된 deviceId가 있으면 재등록하지 않습니다.
 */
export async function registerPushDeviceIfNeeded(): Promise<string | null> {
    const pushToken = await getPushToken();
    if (!pushToken) return null;

    try {
        const device = await httpClient.registerPushDevice({
            pushToken,
            platform: getPlatform(),
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

/**
 * 서버에서 알림 설정을 불러옵니다.
 * API 미구현(404/501) 시 로컬 저장값 반환, 없으면 기본값(전체 활성) 반환.
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
 * API 미구현(404/501) 시 로컬에만 저장 후 병합된 설정 반환하여 "저장 실패" 미표시.
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
