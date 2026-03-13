/**
 * Issue #230 — 계약서 보기 버튼 미동작 수정
 *
 * 수정 사항:
 * - Android: expo-sharing(네이티브 빌드 필요) 대신
 *   FileSystem.getContentUriAsync + Linking.openURL 사용 (기존 빌드 호환)
 * - iOS: Linking.openURL(file:// URI) 사용
 * - 기존: Android 하드코딩 Alert 차단, iOS Linking 미동작
 *
 * 정상 / 예외 / 사이드이펙트 / 통합 / 회귀 케이스 20개
 */

// ─────────────────────────────────────────────────────────────────
// 핵심 로직 재현
// ─────────────────────────────────────────────────────────────────

/** downloadContractFinalPdf 스텁 */
async function fakeDownload(contractId: string): Promise<string> {
    if (!contractId) throw Object.assign(new Error('no id'), { code: 'CONTRACT_NOT_FOUND', status: 404 });
    return `file:///cache/contract_${contractId}.pdf`;
}

/** getContentUriAsync 스텁: file:// → content:// */
async function fakeGetContentUri(fileUri: string): Promise<string> {
    if (!fileUri.startsWith('file://')) throw new Error('invalid file uri');
    return fileUri.replace('file://', 'content://');
}

/** Linking.openURL 스텁 */
async function fakeOpenURL(url: string): Promise<void> {
    if (!url) throw new Error('empty url');
}

/** handleOpenPdf 재현 (수정 후 로직) */
async function handleOpenPdf(
    contractId: string | undefined,
    platform: 'android' | 'ios',
    download: typeof fakeDownload,
    getContentUri: typeof fakeGetContentUri,
    openURL: typeof fakeOpenURL,
): Promise<{ success: boolean; error?: string }> {
    if (!contractId) return { success: false, error: 'no_contract_id' };
    try {
        const fileUri = await download(contractId);
        if (platform === 'android') {
            const contentUri = await getContentUri(fileUri);
            await openURL(contentUri);
        } else {
            await openURL(fileUri);
        }
        return { success: true };
    } catch (err: unknown) {
        const e = err as Error & { code?: string; status?: number };
        return { success: false, error: e.code ?? e.message };
    }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — Android getContentUri + openURL
// ════════════════════════════════════════════════════════════════════════════

describe('정상 케이스 (Android — getContentUri + Linking.openURL)', () => {
    test('Android: 다운로드 → getContentUri → openURL 순서 실행', async () => {
        const log: string[] = [];
        const dl = async (id: string) => { log.push('download'); return `file:///cache/${id}.pdf`; };
        const getUri = async (u: string) => { log.push('contentUri'); return u.replace('file://', 'content://'); };
        const open = async () => { log.push('open'); };
        await handleOpenPdf('c1', 'android', dl, getUri, open);
        expect(log).toEqual(['download', 'contentUri', 'open']);
    });

    test('Android: openURL에 content:// URI가 전달됨', async () => {
        const urls: string[] = [];
        const open = async (url: string) => { urls.push(url); };
        await handleOpenPdf('c2', 'android', fakeDownload, fakeGetContentUri, open);
        expect(urls[0]).toMatch(/^content:\/\//);
    });

    test('Android: success: true 반환', async () => {
        const result = await handleOpenPdf('c3', 'android', fakeDownload, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('iOS: getContentUri 호출 없이 file:// URI 직접 openURL', async () => {
        const getUriCalls: string[] = [];
        const urls: string[] = [];
        const getUri = async (u: string) => { getUriCalls.push(u); return u; };
        const open = async (url: string) => { urls.push(url); };
        await handleOpenPdf('c4', 'ios', fakeDownload, getUri, open);
        expect(getUriCalls).toHaveLength(0);
        expect(urls[0]).toMatch(/^file:\/\//);
    });

    test('iOS: success: true 반환', async () => {
        const result = await handleOpenPdf('c5', 'ios', fakeDownload, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(true);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 다운로드 / URI 변환 실패
// ════════════════════════════════════════════════════════════════════════════

describe('예외 케이스', () => {
    test('contractId 없으면 no_contract_id, download 미호출', async () => {
        let called = false;
        const dl = async (id: string) => { called = true; return `file:///cache/${id}.pdf`; };
        const result = await handleOpenPdf(undefined, 'android', dl, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(false);
        expect(result.error).toBe('no_contract_id');
        expect(called).toBe(false);
    });

    test('빈 문자열 contractId → no_contract_id', async () => {
        const result = await handleOpenPdf('', 'android', fakeDownload, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(false);
        expect(result.error).toBe('no_contract_id');
    });

    test('download 404 → CONTRACT_NOT_FOUND', async () => {
        const dl = async () => { throw Object.assign(new Error('not found'), { code: 'CONTRACT_NOT_FOUND', status: 404 }); };
        const result = await handleOpenPdf('missing', 'android', dl, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(false);
        expect(result.error).toBe('CONTRACT_NOT_FOUND');
    });

    test('download 401 → PDF_AUTH_EXPIRED', async () => {
        const dl = async () => { throw Object.assign(new Error('auth'), { code: 'PDF_AUTH_EXPIRED', status: 401 }); };
        const result = await handleOpenPdf('auth-fail', 'android', dl, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(false);
        expect(result.error).toBe('PDF_AUTH_EXPIRED');
    });

    test('download 409 → PDF_NOT_READY', async () => {
        const dl = async () => { throw Object.assign(new Error('not ready'), { code: 'PDF_NOT_READY', status: 409 }); };
        const result = await handleOpenPdf('not-ready', 'android', dl, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(false);
        expect(result.error).toBe('PDF_NOT_READY');
    });

    test('getContentUri 실패 → openURL 미호출', async () => {
        let opened = false;
        const getUri = async () => { throw new Error('uri error'); };
        const open = async () => { opened = true; };
        await handleOpenPdf('c', 'android', fakeDownload, getUri, open);
        expect(opened).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. 사이드이펙트 — 이전 Android 차단 제거 검증
// ════════════════════════════════════════════════════════════════════════════

describe('사이드이펙트 (Android 차단 제거 검증)', () => {
    test('Android: openURL이 반드시 호출됨 (Alert.alert 차단 없음)', async () => {
        let opened = false;
        const open = async () => { opened = true; };
        await handleOpenPdf('android-c', 'android', fakeDownload, fakeGetContentUri, open);
        expect(opened).toBe(true);
    });

    test('Android: content:// URI 형식 — file:// 아님', async () => {
        const urls: string[] = [];
        const open = async (url: string) => { urls.push(url); };
        await handleOpenPdf('and2', 'android', fakeDownload, fakeGetContentUri, open);
        expect(urls[0]).not.toMatch(/^file:\/\//);
        expect(urls[0]).toMatch(/^content:\/\//);
    });

    test('iOS: file:// URI 형식 유지', async () => {
        const urls: string[] = [];
        const open = async (url: string) => { urls.push(url); };
        await handleOpenPdf('ios1', 'ios', fakeDownload, fakeGetContentUri, open);
        expect(urls[0]).toMatch(/^file:\/\//);
    });

    test('download 실패 시 getContentUri/openURL 모두 미호출', async () => {
        const calls: string[] = [];
        const dl = async () => { throw new Error('net'); };
        const getUri = async (u: string) => { calls.push('getUri'); return u; };
        const open = async () => { calls.push('open'); };
        await handleOpenPdf('fail', 'android', dl, getUri, open);
        expect(calls).toHaveLength(0);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. 통합 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('통합 케이스', () => {
    test('Android 전체 흐름: file:// → content:// → open → success', async () => {
        const result = await handleOpenPdf('full-android', 'android', fakeDownload, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(true);
    });

    test('iOS 전체 흐름: file:// → open(직접) → success', async () => {
        const result = await handleOpenPdf('full-ios', 'ios', fakeDownload, fakeGetContentUri, fakeOpenURL);
        expect(result.success).toBe(true);
    });

    test('403 접근 거부: openURL 미호출', async () => {
        let opened = false;
        const open = async () => { opened = true; };
        const dl = async () => { throw Object.assign(new Error('denied'), { code: 'PDF_ACCESS_DENIED', status: 403 }); };
        await handleOpenPdf('denied', 'android', dl, fakeGetContentUri, open);
        expect(opened).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('회귀 케이스', () => {
    test('연속 두 번 호출: 각각 독립적으로 성공', async () => {
        const urls: string[] = [];
        const open = async (url: string) => { urls.push(url); };
        await handleOpenPdf('r1', 'android', fakeDownload, fakeGetContentUri, open);
        await handleOpenPdf('r2', 'android', fakeDownload, fakeGetContentUri, open);
        expect(urls).toHaveLength(2);
        expect(urls[0]).toContain('r1');
        expect(urls[1]).toContain('r2');
    });

    test('PDF 파일명에 contractId 포함 (캐시 식별 가능)', async () => {
        const urls: string[] = [];
        const open = async (url: string) => { urls.push(url); };
        await handleOpenPdf('my-id-123', 'android', fakeDownload, fakeGetContentUri, open);
        expect(urls[0]).toContain('my-id-123');
    });

    test('getContentUri에 file:// URI가 정확히 전달됨', async () => {
        const received: string[] = [];
        const getUri = async (u: string) => { received.push(u); return u.replace('file://', 'content://'); };
        await handleOpenPdf('uri-check', 'android', fakeDownload, getUri, fakeOpenURL);
        expect(received[0]).toMatch(/^file:\/\//);
        expect(received[0]).toMatch(/\.pdf$/);
    });
});
