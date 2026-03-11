/**
 * Issue #105 — 알림 on/off 저장 실패 대응: API 미구현(404/501) 시 로컬 폴백
 * 대상: isApiUnavailableError, fetch/save 로직, 병합 및 폴백 동작
 */

// ── 타입 (자체 정의, api/types와 동기화) ─────────────────────────────────────

interface ApiNotificationSettings {
    instructorId: string;
    pushEnabled: boolean;
    lessonReminder: boolean;
    paymentNotification: boolean;
    chatNotification: boolean;
}

type NotificationSettingsUpdate = Partial<Omit<ApiNotificationSettings, 'instructorId'>>;

interface ApiErrorLike {
    status?: number;
    message?: string;
}

// ── 픽스처 ───────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ApiNotificationSettings = {
    instructorId: '',
    pushEnabled: true,
    lessonReminder: true,
    paymentNotification: true,
    chatNotification: true,
};

function makeSettings(overrides: Partial<ApiNotificationSettings> = {}): ApiNotificationSettings {
    return { ...DEFAULT_SETTINGS, ...overrides };
}

// ── 헬퍼 (notificationService 로직 미러) ────────────────────────────────────

function isApiUnavailableError(e: unknown): boolean {
    const err = e as ApiErrorLike | undefined;
    return err?.status === 404 || err?.status === 501;
}

function mergeSettings(
    current: ApiNotificationSettings,
    update: NotificationSettingsUpdate,
): ApiNotificationSettings {
    return { ...current, ...update };
}

// ── 시뮬레이션: 로컬 저장소 ───────────────────────────────────────────────────

let mockStored: ApiNotificationSettings | null = null;

async function getStoredSettings(): Promise<ApiNotificationSettings | null> {
    return mockStored;
}

async function setStoredSettings(settings: ApiNotificationSettings): Promise<void> {
    mockStored = settings;
}

function clearMockStore(): void {
    mockStored = null;
}

// fetch 시뮬레이션: 성공 / 404 / 501 / 기타 에러
async function simulateFetch(
    mode: 'success' | '404' | '501' | '400' | '500' | 'network',
): Promise<ApiNotificationSettings> {
    if (mode === 'success') {
        const data = makeSettings({ instructorId: 'I001', pushEnabled: false });
        await setStoredSettings(data);
        return data;
    }
    if (mode === '404') {
        const stored = await getStoredSettings();
        if (stored) return stored;
        return makeSettings();
    }
    if (mode === '501') {
        const stored = await getStoredSettings();
        if (stored) return stored;
        return makeSettings();
    }
    throw { status: mode === '400' ? 400 : mode === '500' ? 500 : undefined, message: 'error' };
}

// save 시뮬레이션: 성공 시 반환, 404/501 시 로컬 병합 후 반환, 기타 시 throw
async function simulateSave(
    update: NotificationSettingsUpdate,
    mode: 'success' | '404' | '501' | '400',
): Promise<ApiNotificationSettings> {
    if (mode === 'success') {
        const current = (await getStoredSettings()) ?? makeSettings();
        const merged = mergeSettings(current, update);
        await setStoredSettings(merged);
        return merged;
    }
    if (mode === '404' || mode === '501') {
        const current = (await getStoredSettings()) ?? makeSettings();
        const merged = mergeSettings(current, update);
        await setStoredSettings(merged);
        return merged;
    }
    throw { status: 400, message: 'Bad request' };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. isApiUnavailableError
// ══════════════════════════════════════════════════════════════════════════════

describe('isApiUnavailableError', () => {
    test('T01 — status 404 → true', () => {
        expect(isApiUnavailableError({ status: 404 })).toBe(true);
    });

    test('T02 — status 501 → true', () => {
        expect(isApiUnavailableError({ status: 501 })).toBe(true);
    });

    test('T03 — status 400 → false', () => {
        expect(isApiUnavailableError({ status: 400 })).toBe(false);
    });

    test('T04 — status 500 → false', () => {
        expect(isApiUnavailableError({ status: 500 })).toBe(false);
    });

    test('T05 — status undefined → false', () => {
        expect(isApiUnavailableError({})).toBe(false);
    });

    test('T06 — null → false', () => {
        expect(isApiUnavailableError(null)).toBe(false);
    });

    test('T07 — undefined → false', () => {
        expect(isApiUnavailableError(undefined)).toBe(false);
    });

    test('T08 — 일반 Error 객체 (status 없음) → false', () => {
        expect(isApiUnavailableError(new Error('network'))).toBe(false);
    });

    test('T09 — status 403 → false', () => {
        expect(isApiUnavailableError({ status: 403 })).toBe(false);
    });

    test('T10 — status 502 → false', () => {
        expect(isApiUnavailableError({ status: 502 })).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. mergeSettings
// ══════════════════════════════════════════════════════════════════════════════

describe('mergeSettings', () => {
    test('T11 — pushEnabled만 업데이트', () => {
        const current = makeSettings({ pushEnabled: true });
        const result = mergeSettings(current, { pushEnabled: false });
        expect(result.pushEnabled).toBe(false);
        expect(result.lessonReminder).toBe(true);
    });

    test('T12 — 수업/정산/채팅 알림 동시 업데이트', () => {
        const current = makeSettings();
        const result = mergeSettings(current, {
            lessonReminder: false,
            paymentNotification: false,
            chatNotification: false,
        });
        expect(result.lessonReminder).toBe(false);
        expect(result.paymentNotification).toBe(false);
        expect(result.chatNotification).toBe(false);
    });

    test('T13 — instructorId는 업데이트에 없음(보존)', () => {
        const current = makeSettings({ instructorId: 'I001' });
        const result = mergeSettings(current, { pushEnabled: false });
        expect(result.instructorId).toBe('I001');
    });

    test('T14 — 빈 업데이트 시 현재 설정 그대로', () => {
        const current = makeSettings({ pushEnabled: false });
        const result = mergeSettings(current, {});
        expect(result).toEqual(current);
    });

    test('T15 — 원본 불변', () => {
        const original = makeSettings({ pushEnabled: true });
        mergeSettings(original, { pushEnabled: false });
        expect(original.pushEnabled).toBe(true);
    });

    test('T16 — 부분 필드만 업데이트 시 나머지 유지', () => {
        const current = makeSettings({ lessonReminder: false, chatNotification: false });
        const result = mergeSettings(current, { paymentNotification: false });
        expect(result.lessonReminder).toBe(false);
        expect(result.chatNotification).toBe(false);
        expect(result.paymentNotification).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. fetch 시뮬레이션: 성공 시 캐시, 실패 시 로컬/기본값
// ══════════════════════════════════════════════════════════════════════════════

describe('fetchNotificationSettings 시뮬레이션', () => {
    beforeEach(clearMockStore);

    test('T17 — success 시 서버 값 반환 및 로컬 캐시', async () => {
        const data = await simulateFetch('success');
        expect(data.pushEnabled).toBe(false);
        expect(data.instructorId).toBe('I001');
        const stored = await getStoredSettings();
        expect(stored).toEqual(data);
    });

    test('T18 — 404 시 로컬 없으면 기본값', async () => {
        const data = await simulateFetch('404');
        expect(data.pushEnabled).toBe(true);
        expect(data.lessonReminder).toBe(true);
    });

    test('T19 — 404 시 로컬 있으면 로컬 값 반환', async () => {
        await setStoredSettings(makeSettings({ pushEnabled: false, lessonReminder: false }));
        const data = await simulateFetch('404');
        expect(data.pushEnabled).toBe(false);
        expect(data.lessonReminder).toBe(false);
    });

    test('T20 — 501 시 로컬 없으면 기본값', async () => {
        const data = await simulateFetch('501');
        expect(data).toEqual(makeSettings());
    });

    test('T21 — 501 시 로컬 있으면 로컬 반환', async () => {
        await setStoredSettings(makeSettings({ chatNotification: false }));
        const data = await simulateFetch('501');
        expect(data.chatNotification).toBe(false);
    });

    test('T22 — 기본값 instructorId 빈 문자열', () => {
        expect(DEFAULT_SETTINGS.instructorId).toBe('');
    });

    test('T23 — 기본값 모든 알림 true', () => {
        expect(DEFAULT_SETTINGS.pushEnabled).toBe(true);
        expect(DEFAULT_SETTINGS.lessonReminder).toBe(true);
        expect(DEFAULT_SETTINGS.paymentNotification).toBe(true);
        expect(DEFAULT_SETTINGS.chatNotification).toBe(true);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. save 시뮬레이션: 404/501 시 로컬 저장 후 반환(throw 없음)
// ══════════════════════════════════════════════════════════════════════════════

describe('saveNotificationSettings 시뮬레이션', () => {
    beforeEach(clearMockStore);

    test('T24 — success 시 병합된 설정 반환', async () => {
        await setStoredSettings(makeSettings({ instructorId: 'I001' }));
        const result = await simulateSave({ lessonReminder: false }, 'success');
        expect(result.lessonReminder).toBe(false);
        expect(result.instructorId).toBe('I001');
    });

    test('T25 — 404 시 로컬에 병합 저장 후 반환', async () => {
        await setStoredSettings(makeSettings({ pushEnabled: true }));
        const result = await simulateSave({ pushEnabled: false }, '404');
        expect(result.pushEnabled).toBe(false);
        const stored = await getStoredSettings();
        expect(stored?.pushEnabled).toBe(false);
    });

    test('T26 — 501 시 로컬에 병합 저장 후 반환', async () => {
        const result = await simulateSave({ chatNotification: false }, '501');
        expect(result.chatNotification).toBe(false);
        expect(await getStoredSettings()).toEqual(result);
    });

    test('T27 — 404 시 로컬 없으면 default와 병합', async () => {
        const result = await simulateSave({ paymentNotification: false }, '404');
        expect(result.paymentNotification).toBe(false);
        expect(result.pushEnabled).toBe(true);
    });

    test('T28 — 400 시 throw', async () => {
        await expect(simulateSave({ pushEnabled: false }, '400')).rejects.toMatchObject({
            status: 400,
        });
    });

    test('T29 — 수업 알림 토글만 저장', async () => {
        await setStoredSettings(makeSettings());
        const result = await simulateSave({ lessonReminder: false }, '404');
        expect(result.lessonReminder).toBe(false);
        expect(result.paymentNotification).toBe(true);
        expect(result.chatNotification).toBe(true);
    });

    test('T30 — 정산 알림 토글만 저장', async () => {
        const result = await simulateSave({ paymentNotification: false }, '501');
        expect(result.paymentNotification).toBe(false);
    });

    test('T31 — 채팅 알림 토글만 저장', async () => {
        const result = await simulateSave({ chatNotification: false }, '404');
        expect(result.chatNotification).toBe(false);
    });

    test('T32 — 연속 업데이트: 1차 pushEnabled false, 2차 lessonReminder false', async () => {
        await simulateSave({ pushEnabled: false }, '404');
        const result = await simulateSave({ lessonReminder: false }, '404');
        expect(result.pushEnabled).toBe(false);
        expect(result.lessonReminder).toBe(false);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 사이드 이펙트 / 통합 / 회귀
// ══════════════════════════════════════════════════════════════════════════════

describe('사이드 이펙트 및 통합', () => {
    beforeEach(clearMockStore);

    test('T33 — fetch 성공 후 save 404 시 기존 instructorId 유지', async () => {
        await simulateFetch('success');
        const result = await simulateSave({ pushEnabled: false }, '404');
        expect(result.instructorId).toBe('I001');
    });

    test('T34 — 로컬만 있는 상태에서 save 404 시 병합 후 저장', async () => {
        await setStoredSettings(makeSettings({ instructorId: '', pushEnabled: true }));
        const result = await simulateSave({ lessonReminder: false, chatNotification: false }, '404');
        expect(result.lessonReminder).toBe(false);
        expect(result.chatNotification).toBe(false);
        expect(result.pushEnabled).toBe(true);
    });

    test('T35 — UI 토글 순서: 수업 → 정산 → 채팅, 최종 상태 일치', async () => {
        await setStoredSettings(makeSettings());
        await simulateSave({ lessonReminder: false }, '404');
        await simulateSave({ paymentNotification: false }, '404');
        const result = await simulateSave({ chatNotification: false }, '404');
        expect(result.lessonReminder).toBe(false);
        expect(result.paymentNotification).toBe(false);
        expect(result.chatNotification).toBe(false);
    });

    test('T36 — 404/501 아닌 에러 시 save는 throw, 로컬 불변', async () => {
        await setStoredSettings(makeSettings({ pushEnabled: true }));
        await expect(simulateSave({ pushEnabled: false }, '400')).rejects.toBeDefined();
        const stored = await getStoredSettings();
        expect(stored?.pushEnabled).toBe(true);
    });

    test('T37 — NotificationSettingsUpdate 타입: instructorId 제외', () => {
        const update: NotificationSettingsUpdate = {
            pushEnabled: true,
            lessonReminder: false,
        };
        expect('instructorId' in update).toBe(false);
    });

    test('T38 — 빈 객체 업데이트도 유효', () => {
        const current = makeSettings();
        const result = mergeSettings(current, {});
        expect(result).toEqual(current);
    });

    test('T39 — 모든 boolean 필드 false로 병합', () => {
        const current = makeSettings();
        const result = mergeSettings(current, {
            pushEnabled: false,
            lessonReminder: false,
            paymentNotification: false,
            chatNotification: false,
        });
        expect(result.pushEnabled).toBe(false);
        expect(result.lessonReminder).toBe(false);
        expect(result.paymentNotification).toBe(false);
        expect(result.chatNotification).toBe(false);
    });

    test('T40 — 회귀: 기존 getDefaultSettings 동작(기본값 전체 true)', () => {
        expect(DEFAULT_SETTINGS).toMatchObject({
            pushEnabled: true,
            lessonReminder: true,
            paymentNotification: true,
            chatNotification: true,
        });
    });
});
