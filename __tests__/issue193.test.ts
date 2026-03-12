/**
 * Issue #193 — 계약서 상세 버튼 문구 단순화
 *
 * DocContractDetailScreen 소스 파일을 직접 읽어
 * PDF 관련 버튼·섹션 문구가 단순화되었음을 검증한다.
 * 소스가 원래대로 되돌아가면 테스트가 실패하여 회귀를 방지한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

const src = fs.readFileSync(
  path.join(ROOT, 'src', 'screens', 'DocContractDetailScreen.tsx'),
  'utf-8',
);

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — 변경된 문구 존재 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[정상] 단순화된 PDF 문구 존재', () => {
  test('T01 — sectionTitle이 "계약서 PDF"로 변경됨', () => {
    expect(src).toContain('계약서 PDF');
  });

  test('T02 — 버튼 문구가 "PDF로 저장"으로 변경됨', () => {
    expect(src).toContain('PDF로 저장');
  });

  test('T03 — "PDF로 저장"이 pdfButtonText 스타일 Text 안에 있음', () => {
    expect(src).toMatch(/pdfButtonText[^>]*>.*PDF로 저장/s);
  });

  test('T04 — "계약서 PDF"가 sectionTitle 스타일 Text 안에 있음', () => {
    expect(src).toMatch(/sectionTitle[^>]*>.*계약서 PDF/s);
  });

  test('T05 — handleOpenPdf 핸들러가 여전히 존재함', () => {
    expect(src).toContain('handleOpenPdf');
  });

  test('T06 — pdfButton 스타일이 여전히 존재함', () => {
    expect(src).toContain('pdfButton');
  });

  test('T07 — handleRegeneratePdf 핸들러가 여전히 존재함', () => {
    expect(src).toContain('handleRegeneratePdf');
  });

  test('T08 — "다시 생성하기" 문구가 여전히 존재함 (재생성 버튼 유지)', () => {
    expect(src).toContain('다시 생성하기');
  });

  test('T09 — "PDF 생성 중..." 상태 텍스트가 여전히 존재함', () => {
    expect(src).toContain('PDF 생성 중...');
  });

  test('T10 — FULLY_SIGNED 상태 분기가 여전히 존재함', () => {
    expect(src).toContain("contract.status === 'FULLY_SIGNED'");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 이전 문구 제거 확인
// ══════════════════════════════════════════════════════════════════════════════

describe('[예외] 이전(설명식) 문구가 제거됨', () => {
  test('T11 — 섹션 제목에서 "최종 PDF" 표현 제거됨', () => {
    // sectionTitle 스타일 Text 안에 "최종 PDF" 표현이 없어야 함
    const match = src.match(/sectionTitle[^>]*>([^<]+)</);
    if (match) {
      expect(match[1]).not.toContain('최종 PDF');
    }
    // 전체 소스에서 렌더링 Text로 사용된 "최종 PDF" 없어야 함
    expect(src).not.toMatch(/<Text[^>]*sectionTitle[^>]*>\s*최종 PDF\s*<\/Text>/);
  });

  test('T12 — 버튼 Text로 "PDF 열람" 표현이 pdfButtonText에 없어야 함', () => {
    expect(src).not.toMatch(/pdfButtonText[^>]*>.*PDF 열람/s);
  });

  test('T13 — 소스 전체에서 "최종 PDF" 문자열이 Text 렌더링에 사용되지 않음', () => {
    // 주석/타입 설명은 허용, JSX Text 렌더링 위치에서만 제거됐는지 확인
    const lines = src.split('\n');
    const renderingLines = lines.filter(
      (line) =>
        line.includes('최종 PDF') &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('*') &&
        !line.trim().startsWith('/*'),
    );
    // 렌더링 코드에서 "최종 PDF"가 포함된 줄이 없어야 함
    expect(renderingLines.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 사이드 이펙트 — 서명·에러 흐름 영향 없음
// ══════════════════════════════════════════════════════════════════════════════

describe('[사이드이펙트] 서명 및 에러 흐름 영향 없음', () => {
  test('T14 — 서명하기 버튼 문구 "서명하기" 유지', () => {
    expect(src).toContain('서명하기');
  });

  test('T15 — 계약 서명 모달 제목 "계약 서명" 유지', () => {
    expect(src).toContain('계약 서명');
  });

  test('T16 — "서명 제출" 버튼 문구 유지', () => {
    expect(src).toContain('서명 제출');
  });

  test('T17 — PDF 에러 Alert 제목 "PDF 열람 실패" 유지 (에러 메시지이므로 변경 불필요)', () => {
    expect(src).toContain('PDF 열람 실패');
  });

  test('T18 — "PDF 준비 중" Alert 제목 유지', () => {
    expect(src).toContain('PDF 준비 중');
  });

  test('T19 — downloadContractFinalPdf API 호출 코드 유지', () => {
    expect(src).toContain('downloadContractFinalPdf');
  });

  test('T20 — regenerateContractFinalPdf API 호출 코드 유지', () => {
    expect(src).toContain('regenerateContractFinalPdf');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 통합 케이스 — 화면 구조 무결성
// ══════════════════════════════════════════════════════════════════════════════

describe('[통합] 화면 구조 무결성', () => {
  test('T21 — pdfGenerationStatus === READY 분기 존재', () => {
    expect(src).toContain("pdfGenerationStatus === 'READY'");
  });

  test('T22 — pdfGenerationStatus === PENDING 분기 존재', () => {
    expect(src).toContain("pdfGenerationStatus === 'PENDING'");
  });

  test('T23 — pdfGenerationStatus === FAILED 분기 존재', () => {
    expect(src).toContain("pdfGenerationStatus === 'FAILED'");
  });

  test('T24 — DocContractDetailScreen default export 유지', () => {
    expect(src).toContain('export default function DocContractDetailScreen');
  });

  test('T25 — parseContentJson 유틸 함수 유지', () => {
    expect(src).toContain('parseContentJson');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스 — 기존 기능 텍스트 유지
// ══════════════════════════════════════════════════════════════════════════════

describe('[회귀] 기존 기능 텍스트 유지', () => {
  test('T26 — "체결 완료" 상태 레이블 유지', () => {
    expect(src).toContain('체결 완료');
  });

  test('T27 — "서명 대기" 상태 레이블 유지', () => {
    expect(src).toContain('서명 대기');
  });

  test('T28 — "강사 서명 완료" 상태 레이블 유지', () => {
    expect(src).toContain('강사 서명 완료');
  });

  test('T29 — "서명 현황" 섹션 제목 유지', () => {
    expect(src).toContain('서명 현황');
  });

  test('T30 — "증빙 정보" 섹션 제목 유지', () => {
    expect(src).toContain('증빙 정보');
  });
});
