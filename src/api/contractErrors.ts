/**
 * 계약 API 에러 코드 및 메시지 매핑.
 * 백엔드가 { code: "CONTRACT_NOT_FOUND" } 형태로 반환한다고 가정.
 */

export const CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND';
export const CONTRACT_ALREADY_SIGNED = 'CONTRACT_ALREADY_SIGNED';
export const SIGN_TOKEN_EXPIRED = 'SIGN_TOKEN_EXPIRED';
export const CONSENT_REQUIRED = 'CONSENT_REQUIRED';
export const FORBIDDEN = 'FORBIDDEN';

export type ContractErrorCode =
  | typeof CONTRACT_NOT_FOUND
  | typeof CONTRACT_ALREADY_SIGNED
  | typeof SIGN_TOKEN_EXPIRED
  | typeof CONSENT_REQUIRED
  | typeof FORBIDDEN
  | string;

const MESSAGES: Record<string, string> = {
  [CONTRACT_NOT_FOUND]: '계약을 찾을 수 없습니다.',
  [CONTRACT_ALREADY_SIGNED]: '이미 서명이 완료된 계약입니다.',
  [SIGN_TOKEN_EXPIRED]: '서명 링크가 만료되었습니다. 다시 요청해 주세요.',
  [CONSENT_REQUIRED]: '동의 항목에 체크해 주세요.',
  [FORBIDDEN]: '권한이 없습니다.',
  CONFLICT: '이미 처리되었거나 중복 요청입니다.',
};

/**
 * 에러 코드에 해당하는 사용자 표시용 한글 메시지를 반환합니다.
 * 백엔드 응답 형식이 바뀌면 이 함수만 수정하면 됩니다.
 */
export function getContractErrorMessage(code: ContractErrorCode | undefined, httpStatus?: number): string {
  if (httpStatus === 409) return MESSAGES.CONFLICT ?? '이미 처리되었거나 중복 요청입니다.';
  if (code && MESSAGES[code]) return MESSAGES[code];
  return code ? `${code}` : '처리 중 오류가 발생했습니다.';
}
