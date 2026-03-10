# Issue #24 대조 및 수정 요약

이슈: [API 연동] 백엔드 스펙 기준으로 프로필/가용시간/희망지역 DTO 정렬

---

## 수정 내용

### 1. 프로필 필드 정렬 (백엔드 DTO 1:1)

- **`src/api/types.ts`** `ApiInstructorProfile` 변경:
  - `bio` 없음 → `profileNote` 유지 (이미 사용 중)
  - `education` 추가: `{ schoolName, major, graduationYear } | null` (객체 구조)
  - `certificates`(string[]) 제거 → `certifications`: `{ id, name, year }[]` (객체 배열)
  - `phone`, `residenceArea`, `majorField`, `profileNote` optional 처리
  - `photoUrl` optional 추가 (백엔드와 동일)

- **`src/screens/InstructorProfileScreen.tsx`**:
  - 프로필 로드 시 `profile as any` 제거, `profile.education`, `profile.certifications`, `profile.residenceArea` 타입 반영

### 2. 희망지역 정렬

- 이미 반영됨: `PUT /instructors/me/preferred-regions` 요청이 `{ items: string[] }` 형태로 통일되어 있음 (`updatePreferredRegions`).

### 3. 가용시간 저장 정렬

- 이미 반영됨: `PUT /availability/me` 전체 교체 방식, 저장 시 최종 슬롯 전체 배열 전송 (`upsertAvailability`, `buildPayloadSlots`).

### 4. 인증 흐름

- 기존 구현 유지: 강사 토큰 기준 `me` 계열 API 호출 (httpClient Bearer 토큰, refresh 연동).

---

## 완료 기준(DoD) 점검

- **/instructors/me 조회/수정**: 타입·화면 정렬 완료. 조회 실패 시 Alert 표시(400/401/404/409 등), 수정 실패 시 Alert 표시.
- **/instructors/me/preferred-regions 조회/수정**: 정상. 조회 실패 시 Alert, 수정 실패 시 Alert.
- **/availability/me 조회/수정**: 정상. 조회 실패 시 Alert, 등록/삭제 실패 시 Alert.
- **400/401/404/409 에러 처리 UI**: 세 화면 모두 조회·저장 실패 시 사용자에게 Alert로 안내. 401은 httpClient에서 refresh 후 실패 시 로그인으로 이동 처리.
- **lint/TypeScript**: `npx tsc --noEmit` 통과, `npx expo lint` 에러 0건.
