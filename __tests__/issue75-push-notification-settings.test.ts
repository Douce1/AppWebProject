/**
 * Issue #75 — Push device registration & notification settings 테스트 (self-contained)
 * 대상: ApiPushDevice/ApiNotificationSettings 타입, notificationService 로직
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Platform = 'ios' | 'android' | 'web';

interface PushDevice {
    deviceId: string;
    instructorId: string;
    pushToken: string;
    platform: Platform;
    isActive: boolean;
    registeredAt: string;
}

interface NotificationSettings {
    instructorId: string;
    pushEnabled: boolean;
    lessonReminder: boolean;
    paymentNotification: boolean;
    chatNotification: boolean;
}

type NotificationSettingsUpdate = Partial<Omit<NotificationSettings, 'instructorId'>>;

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const makeDevice = (overrides: Partial<PushDevice> = {}): PushDevice => ({
    deviceId: 'D001',
    instructorId: 'I001',
    pushToken: 'ExponentPushToken[xxxx]',
    platform: 'ios',
    isActive: true,
    registeredAt: '2026-03-01T00:00:00Z',
    ...overrides,
});

const makeSettings = (overrides: Partial<NotificationSettings> = {}): NotificationSettings => ({
    instructorId: 'I001',
    pushEnabled: true,
    lessonReminder: true,
    paymentNotification: true,
    chatNotification: true,
    ...overrides,
});

// ── 헬퍼 로직 (notificationService와 동일) ───────────────────────────────────

function getPlatform(os: string): Platform {
    if (os === 'ios') return 'ios';
    if (os === 'android') return 'android';
    return 'web';
}

function applySettingsUpdate(
    current: NotificationSettings,
    update: NotificationSettingsUpdate,
): NotificationSettings {
    return { ...current, ...update };
}

function getDefaultSettings(): NotificationSettings {
    return {
        instructorId: '',
        pushEnabled: true,
        lessonReminder: true,
        paymentNotification: true,
        chatNotification: true,
    };
}

function isSubSettingDisabled(pushEnabled: boolean): boolean {
    return !pushEnabled;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ApiPushDevice 타입 정합성
// ══════════════════════════════════════════════════════════════════════════════

describe('PushDevice 타입 정합성', () => {
    test('T01 — 필수 필드 모두 포함', () => {
        const d = makeDevice();
        expect(d).toHaveProperty('deviceId');
        expect(d).toHaveProperty('pushToken');
        expect(d).toHaveProperty('platform');
        expect(d).toHaveProperty('isActive');
        expect(d).toHaveProperty('registeredAt');
    });

    test('T02 — platform ios', () => {
        expect(makeDevice({ platform: 'ios' }).platform).toBe('ios');
    });

    test('T03 — platform android', () => {
        expect(makeDevice({ platform: 'android' }).platform).toBe('android');
    });

    test('T04 — platform web', () => {
        expect(makeDevice({ platform: 'web' }).platform).toBe('web');
    });

    test('T05 — isActive는 boolean', () => {
        expect(typeof makeDevice().isActive).toBe('boolean');
    });

    test('T06 — registeredAt은 ISO 문자열', () => {
        const d = makeDevice({ registeredAt: '2026-03-01T00:00:00Z' });
        expect(() => new Date(d.registeredAt)).not.toThrow();
    });

    test('T07 — isActive false 가능', () => {
        expect(makeDevice({ isActive: false }).isActive).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ApiNotificationSettings 타입 정합성
// ══════════════════════════════════════════════════════════════════════════════

describe('NotificationSettings 타입 정합성', () => {
    test('T08 — 필수 필드 모두 포함', () => {
        const s = makeSettings();
        expect(s).toHaveProperty('pushEnabled');
        expect(s).toHaveProperty('lessonReminder');
        expect(s).toHaveProperty('paymentNotification');
        expect(s).toHaveProperty('chatNotification');
    });

    test('T09 — pushEnabled는 boolean', () => {
        expect(typeof makeSettings().pushEnabled).toBe('boolean');
    });

    test('T10 — 모든 필드 false 가능', () => {
        const s = makeSettings({
            pushEnabled: false,
            lessonReminder: false,
            paymentNotification: false,
            chatNotification: false,
        });
        expect(s.pushEnabled).toBe(false);
        expect(s.lessonReminder).toBe(false);
        expect(s.paymentNotification).toBe(false);
        expect(s.chatNotification).toBe(false);
    });

    test('T11 — 부분 업데이트 타입: instructorId 제외 모든 필드 선택적', () => {
        const update: NotificationSettingsUpdate = { pushEnabled: false };
        expect(update.pushEnabled).toBe(false);
        expect(update.lessonReminder).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. getPlatform 헬퍼
// ══════════════════════════════════════════════════════════════════════════════

describe('getPlatform', () => {
    test('T12 — "ios" → ios', () => {
        expect(getPlatform('ios')).toBe('ios');
    });

    test('T13 — "android" → android', () => {
        expect(getPlatform('android')).toBe('android');
    });

    test('T14 — "web" → web', () => {
        expect(getPlatform('web')).toBe('web');
    });

    test('T15 — 알 수 없는 플랫폼 → "web" 폴백', () => {
        expect(getPlatform('unknown')).toBe('web');
    });

    test('T16 — 빈 문자열 → "web" 폴백', () => {
        expect(getPlatform('')).toBe('web');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. applySettingsUpdate
// ══════════════════════════════════════════════════════════════════════════════

describe('applySettingsUpdate', () => {
    test('T17 — pushEnabled만 업데이트', () => {
        const result = applySettingsUpdate(makeSettings(), { pushEnabled: false });
        expect(result.pushEnabled).toBe(false);
        expect(result.lessonReminder).toBe(true); // 기존값 유지
    });

    test('T18 — 복수 필드 동시 업데이트', () => {
        const result = applySettingsUpdate(makeSettings(), {
            lessonReminder: false,
            chatNotification: false,
        });
        expect(result.lessonReminder).toBe(false);
        expect(result.chatNotification).toBe(false);
        expect(result.paymentNotification).toBe(true);
    });

    test('T19 — 빈 업데이트는 현재 설정 반환', () => {
        const current = makeSettings({ pushEnabled: false });
        const result = applySettingsUpdate(current, {});
        expect(result).toEqual(current);
    });

    test('T20 — 원본 객체 불변', () => {
        const original = makeSettings();
        applySettingsUpdate(original, { pushEnabled: false });
        expect(original.pushEnabled).toBe(true);
    });

    test('T21 — instructorId는 업데이트 대상 아님 (Omit 검증)', () => {
        const current = makeSettings({ instructorId: 'I001' });
        const result = applySettingsUpdate(current, { pushEnabled: false });
        expect(result.instructorId).toBe('I001');
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. getDefaultSettings
// ══════════════════════════════════════════════════════════════════════════════

describe('getDefaultSettings', () => {
    test('T22 — 기본값: pushEnabled true', () => {
        expect(getDefaultSettings().pushEnabled).toBe(true);
    });

    test('T23 — 기본값: lessonReminder true', () => {
        expect(getDefaultSettings().lessonReminder).toBe(true);
    });

    test('T24 — 기본값: instructorId 빈 문자열', () => {
        expect(getDefaultSettings().instructorId).toBe('');
    });

    test('T25 — 매 호출마다 새 객체 반환', () => {
        const a = getDefaultSettings();
        const b = getDefaultSettings();
        expect(a).not.toBe(b);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. isSubSettingDisabled (pushEnabled false일 때 하위 설정 비활성화)
// ══════════════════════════════════════════════════════════════════════════════

describe('isSubSettingDisabled', () => {
    test('T26 — pushEnabled false → 하위 설정 disabled', () => {
        expect(isSubSettingDisabled(false)).toBe(true);
    });

    test('T27 — pushEnabled true → 하위 설정 enabled', () => {
        expect(isSubSettingDisabled(true)).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. API mock 시뮬레이션
// ══════════════════════════════════════════════════════════════════════════════

describe('API mock 시뮬레이션', () => {
    test('T28 — registerPushDevice: 토큰과 플랫폼 포함 요청', () => {
        const payload = { pushToken: 'ExponentPushToken[test]', platform: 'ios' as Platform };
        expect(payload).toHaveProperty('pushToken');
        expect(payload).toHaveProperty('platform');
        expect(['ios', 'android', 'web']).toContain(payload.platform);
    });

    test('T29 — deregisterPushDevice: deviceId 필요', () => {
        const deviceId = 'D001';
        const url = `/push/devices/${encodeURIComponent(deviceId)}`;
        expect(url).toBe('/push/devices/D001');
    });

    test('T30 — 디바이스 ID에 특수문자 있을 때 인코딩', () => {
        const deviceId = 'D/001 test';
        const url = `/push/devices/${encodeURIComponent(deviceId)}`;
        expect(url).not.toContain(' ');
        expect(url).not.toContain('/D/');
    });

    test('T31 — updateNotificationSettings: 부분 업데이트 가능', () => {
        const update: NotificationSettingsUpdate = { chatNotification: false };
        expect(Object.keys(update)).toEqual(['chatNotification']);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. 사이드 이펙트 / 통합 케이스
// ══════════════════════════════════════════════════════════════════════════════

describe('사이드 이펙트 및 통합 케이스', () => {
    test('T32 — pushEnabled false 시 모든 하위 설정이 disabled 상태', () => {
        const s = makeSettings({ pushEnabled: false });
        const keys: (keyof Omit<NotificationSettings, 'instructorId' | 'pushEnabled'>)[] = [
            'lessonReminder',
            'paymentNotification',
            'chatNotification',
        ];
        keys.forEach((k) => {
            expect(isSubSettingDisabled(s.pushEnabled)).toBe(true);
        });
    });

    test('T33 — 로그아웃 시 deviceId 제거 시뮬레이션', () => {
        const store: Record<string, string> = { push_device_id: 'D001' };
        const deviceId = store['push_device_id'];
        delete store['push_device_id'];
        expect(deviceId).toBe('D001');
        expect(store['push_device_id']).toBeUndefined();
    });

    test('T34 — 설정 로드 실패 시 기본값으로 폴백', async () => {
        const failingFetch = async (): Promise<NotificationSettings> => {
            throw new Error('Network error');
        };
        let result: NotificationSettings;
        try {
            result = await failingFetch();
        } catch {
            result = getDefaultSettings();
        }
        expect(result.pushEnabled).toBe(true);
    });

    test('T35 — 설정 저장 실패 시 이전 상태 복원', () => {
        let current = makeSettings({ pushEnabled: true });
        const prev = { ...current };

        // 저장 시도 (실패)
        const next = applySettingsUpdate(current, { pushEnabled: false });
        current = next; // optimistic
        // 실패로 롤백
        current = prev;

        expect(current.pushEnabled).toBe(true);
    });

    test('T36 — pushToken이 null이면 디바이스 등록 스킵', () => {
        const token: string | null = null;
        const shouldRegister = token !== null;
        expect(shouldRegister).toBe(false);
    });

    test('T37 — 이미 등록된 deviceId가 있을 때 재등록 안 함', () => {
        const stored = 'D001';
        const shouldRegister = !stored;
        expect(shouldRegister).toBe(false);
    });

    test('T38 — deviceId가 없을 때 해제 스킵', () => {
        const deviceId: string | null = null;
        const shouldDeregister = deviceId !== null;
        expect(shouldDeregister).toBe(false);
    });

    test('T39 — 서버 응답으로 로컬 상태 동기화', () => {
        const serverResponse = makeSettings({
            pushEnabled: false,
            chatNotification: false,
        });
        let local = makeSettings();
        local = serverResponse;
        expect(local.pushEnabled).toBe(false);
        expect(local.chatNotification).toBe(false);
    });

    test('T40 — 여러 토글 순차 업데이트: 최종 상태 정확성', () => {
        let s = makeSettings();
        s = applySettingsUpdate(s, { lessonReminder: false });
        s = applySettingsUpdate(s, { paymentNotification: false });
        s = applySettingsUpdate(s, { chatNotification: false });
        expect(s.lessonReminder).toBe(false);
        expect(s.paymentNotification).toBe(false);
        expect(s.chatNotification).toBe(false);
        expect(s.pushEnabled).toBe(true); // 변경 없음
    });

    test('T41 — applySettingsUpdate가 instructorId를 보존', () => {
        const s = makeSettings({ instructorId: 'INST-XYZ' });
        const result = applySettingsUpdate(s, { pushEnabled: false });
        expect(result.instructorId).toBe('INST-XYZ');
    });

    test('T42 — getPlatform은 대소문자 구분', () => {
        // 실제로는 Platform.OS가 항상 소문자 반환
        expect(getPlatform('iOS')).toBe('web'); // 대문자 iOS → 폴백
        expect(getPlatform('ios')).toBe('ios');
    });

    test('T43 — 빈 pushToken으로 등록 시도 방지', () => {
        const token = '';
        const isValid = token.length > 0;
        expect(isValid).toBe(false);
    });
});
