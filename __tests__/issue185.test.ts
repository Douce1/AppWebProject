/**
 * Issue #185 — open final contract pdf via authenticated fetch instead of direct link
 *
 * 실제 소스 파일(httpClient.ts, contractErrors.ts, DocContractDetailScreen.tsx)을
 * 직접 읽어 인증 포함 fetch 방식과 상태코드별 에러 처리를 검증한다.
 * 소스가 원래대로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getContractErrorMessage,
  PDF_NOT_READY,
  PDF_AUTH_EXPIRED,
  PDF_ACCESS_DENIED,
  PDF_DOWNLOAD_FAILED,
} from '../src/api/contractErrors';

const ROOT = path.resolve(__dirname, '..');
const HTTP_CLIENT = path.join(ROOT, 'src', 'api', 'httpClient.ts');
const CONTRACT_ERRORS = path.join(ROOT, 'src', 'api', 'contractErrors.ts');
const DETAIL_SCREEN = path.join(ROOT, 'src', 'screens', 'DocContractDetailScreen.tsx');

const httpClientSrc = fs.readFileSync(HTTP_CLIENT, 'utf-8');
const contractErrorsSrc = fs.readFileSync(CONTRACT_ERRORS, 'utf-8');
const detailScreenSrc = fs.readFileSync(DETAIL_SCREEN, 'utf-8');

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — httpClient.ts: downloadContractFinalPdf 인증 포함 fetch 사용
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] httpClient — downloadContractFinalPdf 인증 포함 fetch', () => {
  test('T01 — downloadContractFinalPdf 함수가 정의되어 있다', () => {
    expect(httpClientSrc).toContain('downloadContractFinalPdf');
  });

  test('T02 — Authorization Bearer 헤더를 포함한 fetch 요청을 사용한다', () => {
    expect(httpClientSrc).toContain('Authorization: `Bearer ${accessToken}`');
  });

  test('T03 — final-pdf/file 엔드포인트를 호출한다', () => {
    expect(httpClientSrc).toContain('/final-pdf/file');
  });

  test('T04 — accessToken을 getAccessToken()으로 가져온다', () => {
    // downloadContractFinalPdf 함수 내에서 getAccessToken 호출 여부 확인
    const fnStart = httpClientSrc.indexOf('downloadContractFinalPdf');
    const fnEnd = httpClientSrc.indexOf('regenerateContractFinalPdf');
    const fnBody = httpClientSrc.slice(fnStart, fnEnd);
    expect(fnBody).toContain('getAccessToken()');
  });

  test('T05 — arrayBuffer()로 파일 바이너리를 수신한다', () => {
    expect(httpClientSrc).toContain('arrayBuffer()');
  });

  test('T06 — Uint8Array로 바이트 변환 후 파일에 쓴다', () => {
    expect(httpClientSrc).toContain('new Uint8Array(arrayBuffer)');
  });

  test('T07 — expo-file-system의 File과 Paths를 import한다', () => {
    expect(httpClientSrc).toContain("from 'expo-file-system'");
    expect(httpClientSrc).toContain('File');
    expect(httpClientSrc).toContain('Paths');
  });

  test('T08 — 임시 파일 URI를 반환한다 (tempFile.uri)', () => {
    expect(httpClientSrc).toContain('tempFile.uri');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 정상 케이스 — httpClient.ts: 상태코드별 에러 코드 매핑
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] httpClient — 상태코드별 에러 코드 매핑', () => {
  test('T09 — 401 상태코드를 PDF_AUTH_EXPIRED로 매핑한다', () => {
    expect(httpClientSrc).toContain("401: 'PDF_AUTH_EXPIRED'");
  });

  test('T10 — 403 상태코드를 PDF_ACCESS_DENIED로 매핑한다', () => {
    expect(httpClientSrc).toContain("403: 'PDF_ACCESS_DENIED'");
  });

  test('T11 — 404 상태코드를 CONTRACT_NOT_FOUND로 매핑한다', () => {
    expect(httpClientSrc).toContain("404: 'CONTRACT_NOT_FOUND'");
  });

  test('T12 — 409 상태코드를 PDF_NOT_READY로 매핑한다', () => {
    expect(httpClientSrc).toContain("409: 'PDF_NOT_READY'");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 정상 케이스 — contractErrors.ts: PDF 에러 코드 정의
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] contractErrors — PDF 에러 코드 정의 및 메시지', () => {
  test('T13 — PDF_NOT_READY 상수가 정의된다', () => {
    expect(PDF_NOT_READY).toBe('PDF_NOT_READY');
  });

  test('T14 — PDF_AUTH_EXPIRED 상수가 정의된다', () => {
    expect(PDF_AUTH_EXPIRED).toBe('PDF_AUTH_EXPIRED');
  });

  test('T15 — PDF_ACCESS_DENIED 상수가 정의된다', () => {
    expect(PDF_ACCESS_DENIED).toBe('PDF_ACCESS_DENIED');
  });

  test('T16 — PDF_DOWNLOAD_FAILED 상수가 정의된다', () => {
    expect(PDF_DOWNLOAD_FAILED).toBe('PDF_DOWNLOAD_FAILED');
  });

  test('T17 — PDF_NOT_READY 메시지에 "준비" 단어가 포함된다', () => {
    const msg = getContractErrorMessage(PDF_NOT_READY);
    expect(msg).toContain('준비');
  });

  test('T18 — PDF_AUTH_EXPIRED 메시지에 "인증" 단어가 포함된다', () => {
    const msg = getContractErrorMessage(PDF_AUTH_EXPIRED);
    expect(msg).toContain('인증');
  });

  test('T19 — PDF_ACCESS_DENIED 메시지에 "권한" 단어가 포함된다', () => {
    const msg = getContractErrorMessage(PDF_ACCESS_DENIED);
    expect(msg).toContain('권한');
  });

  test('T20 — PDF_DOWNLOAD_FAILED 메시지에 "불러오지" 단어가 포함된다', () => {
    const msg = getContractErrorMessage(PDF_DOWNLOAD_FAILED);
    expect(msg).toContain('불러오지');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 정상 케이스 — DocContractDetailScreen: 상태별 UI 분기
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] DocContractDetailScreen — 상태별 PDF UI 분기', () => {
  test('T21 — FULLY_SIGNED 상태에서 최종 PDF 섹션을 렌더링한다', () => {
    expect(detailScreenSrc).toContain("contract.status === 'FULLY_SIGNED'");
    expect(detailScreenSrc).toContain('최종 PDF');
  });

  test('T22 — READY 상태에서 PDF 열람 버튼을 표시한다', () => {
    expect(detailScreenSrc).toContain("pdfGenerationStatus === 'READY'");
    expect(detailScreenSrc).toContain('PDF 열람');
  });

  test('T23 — PENDING/GENERATING 상태에서 "PDF 생성 중..." 메시지를 표시한다', () => {
    expect(detailScreenSrc).toContain("pdfGenerationStatus === 'PENDING'");
    expect(detailScreenSrc).toContain("pdfGenerationStatus === 'GENERATING'");
    expect(detailScreenSrc).toContain('PDF 생성 중');
  });

  test('T24 — FAILED 상태에서 "PDF 생성에 실패했습니다." 메시지를 표시한다', () => {
    expect(detailScreenSrc).toContain("pdfGenerationStatus === 'FAILED'");
    expect(detailScreenSrc).toContain('PDF 생성에 실패했습니다');
  });

  test('T25 — FAILED 상태에서 다시 생성하기 버튼을 표시한다', () => {
    expect(detailScreenSrc).toContain('다시 생성하기');
  });

  test('T26 — 기본(미생성) 상태에서 "PDF가 아직 생성되지 않았습니다." 메시지를 표시한다', () => {
    expect(detailScreenSrc).toContain('PDF가 아직 생성되지 않았습니다');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 예외 케이스 — DocContractDetailScreen: handleOpenPdf 에러 처리
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] DocContractDetailScreen — handleOpenPdf 상태코드별 에러 처리', () => {
  test('T27 — 401 에러(인증 만료)를 처리한다', () => {
    expect(detailScreenSrc).toContain('PDF_AUTH_EXPIRED');
    expect(detailScreenSrc).toContain('인증 만료');
  });

  test('T28 — 403 에러(접근 불가)를 처리한다', () => {
    expect(detailScreenSrc).toContain('PDF_ACCESS_DENIED');
    expect(detailScreenSrc).toContain('접근 불가');
  });

  test('T29 — 409 에러(PDF 준비 중)를 처리한다', () => {
    expect(detailScreenSrc).toContain('PDF_NOT_READY');
    expect(detailScreenSrc).toContain('PDF 준비 중');
  });

  test('T30 — getContractErrorMessage를 통해 에러 메시지를 생성한다', () => {
    // handleOpenPdf 내에서 getContractErrorMessage 사용 여부 확인
    const fnStart = detailScreenSrc.indexOf('handleOpenPdf');
    const fnEnd = detailScreenSrc.indexOf('handleRegeneratePdf');
    const fnBody = detailScreenSrc.slice(fnStart, fnEnd);
    expect(fnBody).toContain('getContractErrorMessage');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. 회귀 케이스 — 단순 URL 방식 사용 금지
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] 단순 링크/URL 방식 미사용 확인', () => {
  test('T31 — DocContractDetailScreen에서 직접 URL을 fetch하지 않는다 (window.open 없음)', () => {
    expect(detailScreenSrc).not.toContain('window.open');
  });

  test('T32 — downloadContractFinalPdf가 apiClient를 통해 호출된다', () => {
    expect(detailScreenSrc).toContain('apiClient.downloadContractFinalPdf');
  });

  test('T33 — httpClient의 downloadContractFinalPdf는 직접 URL 이동이 아닌 fetch를 사용한다', () => {
    const fnStart = httpClientSrc.indexOf('downloadContractFinalPdf');
    const fnEnd = httpClientSrc.indexOf('regenerateContractFinalPdf');
    const fnBody = httpClientSrc.slice(fnStart, fnEnd);
    expect(fnBody).toContain('fetch(');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. 통합 케이스 — contractErrors.ts export 통합 검증
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] contractErrors.ts — export 통합 검증', () => {
  test('T34 — PDF_NOT_READY가 contractErrors.ts에서 export된다', () => {
    expect(contractErrorsSrc).toContain("export const PDF_NOT_READY");
  });

  test('T35 — PDF_AUTH_EXPIRED가 contractErrors.ts에서 export된다', () => {
    expect(contractErrorsSrc).toContain("export const PDF_AUTH_EXPIRED");
  });

  test('T36 — PDF_ACCESS_DENIED가 contractErrors.ts에서 export된다', () => {
    expect(contractErrorsSrc).toContain("export const PDF_ACCESS_DENIED");
  });

  test('T37 — PDF_DOWNLOAD_FAILED가 contractErrors.ts에서 export된다', () => {
    expect(contractErrorsSrc).toContain("export const PDF_DOWNLOAD_FAILED");
  });

  test('T38 — DocContractDetailScreen이 PDF 에러 코드를 import한다', () => {
    expect(detailScreenSrc).toContain('PDF_NOT_READY');
    expect(detailScreenSrc).toContain('PDF_AUTH_EXPIRED');
    expect(detailScreenSrc).toContain('PDF_ACCESS_DENIED');
  });

  test('T39 — 기존 SIGN_TOKEN_EXPIRED 에러 처리가 유지된다 (회귀)', () => {
    expect(contractErrorsSrc).toContain("export const SIGN_TOKEN_EXPIRED = 'SIGN_TOKEN_EXPIRED'");
    expect(detailScreenSrc).toContain('SIGN_TOKEN_EXPIRED');
  });

  test('T40 — getContractErrorMessage가 알 수 없는 코드에 대해 기본 메시지를 반환한다', () => {
    const msg = getContractErrorMessage(undefined);
    expect(msg).toBe('처리 중 오류가 발생했습니다.');
  });
});
