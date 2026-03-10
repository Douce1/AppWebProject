# Issue #22 체크: 가용시간 API 연동

이슈: [app] 가용시간 API 연동 (조회/저장)  
대조 일시: 소스 기준

---

## ✅ 이슈 작업 항목 vs 현재 소스

| #22 작업 항목 | 소스 상태 | 비고 |
|---------------|-----------|------|
| **httpClient** `getAvailability()` → `GET /availability/me` → `ApiAvailabilitySlot[]` | ✅ 구현됨 | `httpClient.ts` 297–299행 |
| **httpClient** `upsertAvailability(body: { slots })` 추가 → `PUT /availability/me` | ✅ 추가함 | `httpClient.ts` |
| **AvailabilitySettingsScreen** 초기 로드: `getAvailability()` 실 API 호출 | ✅ 구현됨 | 76–113행 `useEffect` |
| **AvailabilitySettingsScreen** 저장: `upsertAvailability({ slots })` 호출 | ✅ 반영됨 | 등록/삭제 모두 apiClient.upsertAvailability 사용 |
| 슬롯 형식 변환: 달력 UI → `availableStartAt`/`availableEndAt` (ISO 8601) | ✅ 구현됨 | `toIso`, `buildPayloadSlots` (232–247행) |
| 전체 교체 저장 방식 (최종 슬롯 배열 전송) | ✅ 구현됨 | `buildPayloadSlots(next)` 로 전체 전송 |

---

## ✅ 완료 기준 vs 현재 소스

| 완료 기준 | 상태 |
|-----------|------|
| 가용시간 저장 후 앱 재진입 시 유지 | ✅ GET 초기 로드로 유지 |
| 빈 슬롯 저장(전체 삭제) 정상 동작 | ✅ 삭제 시 나머지만 `buildPayloadSlots(next)`로 전송 |
| ISO datetime 형식으로 올바르게 전송 | ✅ `toISOString()` 사용 |
| GET 응답 배열 / PUT 요청 `{ slots }` 계약 반영 | ✅ GET 배열, PUT `{ slots }` 사용 |

---

## ❌ 빠진 수정 내용 (이슈 보고 기준)

- 없음. `httpClient.upsertAvailability` 추가 및 화면에서 호출로 반영 완료.
