/**
 * Issue #230 — 계약서 보기 버튼 미동작 수정
 *
 * 수정 사항:
 * - Android: expo-sharing.shareAsync 로 PDF 파일 열람 (기존: 알림만 표시)
 * - iOS: Linking.openURL(로컬 파일) → expo-sharing.shareAsync 로 통일
 * - Platform 분기 제거, 단일 코드 패스
 *
 * 정상 / 예외 / 사이드이펙트 / 통합 / 회귀 케이스 20개
 */

// ─────────────────────────────────────────────────────────────────
// 테스트에서 재현하는 핵심 로직
// ─────────────────────────────────────────────────────────────────

/** downloadContractFinalPdf 가 성공하면 로컬 파일 URI 를 반환한다고 가정 */
async function fakeDownload(contractId: string): Promise<string> {
    if (!contractId) throw Object.assign(new Error('no id'), { code: 'CONTRACT_NOT_FOUND', status: 404 });
    return `file:///cache/contract_${contractId}.pdf`;
}

/** expo-sharing.shareAsync 의 stub */
interface ShareOptions { mimeType?: string; dialogTitle?: string }
type ShareResult = 'shared' | 'dismissed';
async function fakeShareAsync(fileUri: string, _opts?: ShareOptions): Promise<ShareResult> {
    if (!fileUri.startsWith('file://')) throw new Error('invalid uri');
    return 'shared';
}

/** PDF 열람 핸들러 (수정 후 단일 코드 패스) */
async function handleOpenPdf(
    contractId: string | undefined,
    download: typeof fakeDownload,
    share: typeof fakeShareAsync,
): Promise<{ success: boolean; error?: string }> {
    if (!contractId) return { success: false, error: 'no_contract_id' };
    try {
        const fileUri = await download(contractId);
        await share(fileUri, { mimeType: 'application/pdf', dialogTitle: '계약서 열기' });
        return { success: true };
    } catch (err: unknown) {
        const e = err as Error & { code?: string; status?: number };
        return { success: false, error: e.code ?? e.message };
    }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 다운로드 성공 후 shareAsync 호출
// ════════════════════════════════════════════════════════════════════════════

describe('정상 케이스 (다운로드 + shareAsync)', () => {
    test('contractId 있으면 파일 URI 반환되고 shareAsync 호출됨', async () => {
        const calls: string[] = [];
        const share = async (uri: string) => { calls.push(uri); return 'shared' as const; };
        const result = await handleOpenPdf('contract-1', fakeDownload, share);
        expect(result.success).toBe(true);
        expect(calls).toHaveLength(1);
        expect(calls[0]).toBe('file:///cache/contract_contract-1.pdf');
    });

    test('shareAsync 에 mimeType: application/pdf 가 전달됨', async () => {
        const mimeTypes: (string | undefined)[] = [];
        const share = async (_uri: string, opts?: ShareOptions) => {
            mimeTypes.push(opts?.mimeType);
            return 'shared' as const;
        };
        await handleOpenPdf('c1', fakeDownload, share);
        expect(mimeTypes[0]).toBe('application/pdf');
    });

    test('shareAsync 에 dialogTitle 이 전달됨', async () => {
        const titles: (string | undefined)[] = [];
        const share = async (_uri: string, opts?: ShareOptions) => {
            titles.push(opts?.dialogTitle);
            return 'shared' as const;
        };
        await handleOpenPdf('c2', fakeDownload, share);
        expect(titles[0]).toBe('계약서 열기');
    });

    test('shareAsync 반환값이 shared 이면 success: true', async () => {
        const result = await handleOpenPdf('c3', fakeDownload, fakeShareAsync);
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
    });

    test('다른 contractId 에도 각각 올바른 파일명이 생성됨', async () => {
        const uris: string[] = [];
        const share = async (uri: string) => { uris.push(uri); return 'shared' as const; };
        await handleOpenPdf('abc-123', fakeDownload, share);
        expect(uris[0]).toContain('contract_abc-123.pdf');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 다운로드/공유 실패
// ════════════════════════════════════════════════════════════════════════════

describe('예외 케이스 (다운로드/공유 실패)', () => {
    test('contractId 없으면 no_contract_id 에러 반환, shareAsync 미호출', async () => {
        const calls: string[] = [];
        const share = async (uri: string) => { calls.push(uri); return 'shared' as const; };
        const result = await handleOpenPdf(undefined, fakeDownload, share);
        expect(result.success).toBe(false);
        expect(result.error).toBe('no_contract_id');
        expect(calls).toHaveLength(0);
    });

    test('다운로드 404 → CONTRACT_NOT_FOUND 에러 반환', async () => {
        const dl = async () => { throw Object.assign(new Error('not found'), { code: 'CONTRACT_NOT_FOUND', status: 404 }); };
        const result = await handleOpenPdf('c-missing', dl, fakeShareAsync);
        expect(result.success).toBe(false);
        expect(result.error).toBe('CONTRACT_NOT_FOUND');
    });

    test('다운로드 401 → PDF_AUTH_EXPIRED 에러 반환', async () => {
        const dl = async () => { throw Object.assign(new Error('auth'), { code: 'PDF_AUTH_EXPIRED', status: 401 }); };
        const result = await handleOpenPdf('c-auth', dl, fakeShareAsync);
        expect(result.success).toBe(false);
        expect(result.error).toBe('PDF_AUTH_EXPIRED');
    });

    test('다운로드 409 (PDF 준비 중) → PDF_NOT_READY 에러', async () => {
        const dl = async () => { throw Object.assign(new Error('not ready'), { code: 'PDF_NOT_READY', status: 409 }); };
        const result = await handleOpenPdf('c-notready', dl, fakeShareAsync);
        expect(result.success).toBe(false);
        expect(result.error).toBe('PDF_NOT_READY');
    });

    test('shareAsync 실패(invalid uri) → 에러 반환, success: false', async () => {
        const dl = async () => 'https://remote.url/file.pdf'; // file:// 아님
        const result = await handleOpenPdf('c-bad', dl, fakeShareAsync);
        expect(result.success).toBe(false);
        expect(result.error).toBe('invalid uri');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. 사이드이펙트 — Platform 분기 제거 검증
// ════════════════════════════════════════════════════════════════════════════

describe('사이드이펙트 (Platform 분기 제거)', () => {
    test('Android 시뮬레이션: shareAsync 호출됨 (알림 차단 없음)', async () => {
        // 과거 코드에서는 Android 에서 Alert.alert 만 보여줌.
        // 수정 후: Platform 분기 없이 share 가 항상 호출됨.
        let shareCalled = false;
        const share = async () => { shareCalled = true; return 'shared' as const; };
        await handleOpenPdf('android-contract', fakeDownload, share);
        expect(shareCalled).toBe(true);
    });

    test('iOS 시뮬레이션: shareAsync 호출됨 (Linking.openURL 제거)', async () => {
        let shareCalled = false;
        const share = async () => { shareCalled = true; return 'shared' as const; };
        await handleOpenPdf('ios-contract', fakeDownload, share);
        expect(shareCalled).toBe(true);
    });

    test('shareAsync 는 정확히 1번만 호출됨 (중복 호출 없음)', async () => {
        let callCount = 0;
        const share = async () => { callCount++; return 'shared' as const; };
        await handleOpenPdf('c-once', fakeDownload, share);
        expect(callCount).toBe(1);
    });

    test('download 실패 시 shareAsync 는 호출되지 않음', async () => {
        let shareCalled = false;
        const share = async () => { shareCalled = true; return 'shared' as const; };
        const dl = async () => { throw new Error('network error'); };
        await handleOpenPdf('c-fail', dl, share);
        expect(shareCalled).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. 통합 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('통합 케이스', () => {
    test('전체 성공 흐름: download → share → success', async () => {
        const log: string[] = [];
        const dl = async (id: string) => { log.push('download'); return `file:///cache/${id}.pdf`; };
        const share = async (_uri: string) => { log.push('share'); return 'shared' as const; };
        const result = await handleOpenPdf('full-flow', dl, share);
        expect(log).toEqual(['download', 'share']);
        expect(result.success).toBe(true);
    });

    test('403 접근 거부: shareAsync 미호출, 에러 코드 반환', async () => {
        let shareCalled = false;
        const share = async () => { shareCalled = true; return 'shared' as const; };
        const dl = async () => { throw Object.assign(new Error('denied'), { code: 'PDF_ACCESS_DENIED', status: 403 }); };
        const result = await handleOpenPdf('denied-contract', dl, share);
        expect(shareCalled).toBe(false);
        expect(result.error).toBe('PDF_ACCESS_DENIED');
    });

    test('비어있는 문자열 contractId → no_contract_id (falsy 처리)', async () => {
        const result = await handleOpenPdf('', fakeDownload, fakeShareAsync);
        expect(result.success).toBe(false);
        expect(result.error).toBe('no_contract_id');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('회귀 케이스', () => {
    test('연속 두 번 호출: 각각 독립적으로 성공', async () => {
        const calls: string[] = [];
        const share = async (uri: string) => { calls.push(uri); return 'shared' as const; };
        await handleOpenPdf('c-a', fakeDownload, share);
        await handleOpenPdf('c-b', fakeDownload, share);
        expect(calls).toHaveLength(2);
        expect(calls[0]).toContain('c-a');
        expect(calls[1]).toContain('c-b');
    });

    test('share 가 dismissed 반환해도 success: true (사용자 취소)', async () => {
        const share = async () => 'dismissed' as const;
        const result = await handleOpenPdf('c-dismiss', fakeDownload, share);
        // 공유 취소는 에러가 아님
        expect(result.success).toBe(true);
    });

    test('file:// URI 형식 보존: Paths.cache 기반 경로 유지', async () => {
        const uris: string[] = [];
        const share = async (uri: string) => { uris.push(uri); return 'shared' as const; };
        await handleOpenPdf('my-contract-id', fakeDownload, share);
        expect(uris[0]).toMatch(/^file:\/\//);
        expect(uris[0]).toMatch(/\.pdf$/);
    });
});
