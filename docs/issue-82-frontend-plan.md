# 이슈 #82 프론트 구현 제안: 월간 출강 불가 제출 플로우

## 이슈 #82 요약

- **목표**: 강사가 특정 월에 대해 "이번 달 출강 불가"를 앱에서 제출할 수 있게 하기.
- **연동 API**
  - `GET /availability/me/month-submission` — 월별 제출 상태 조회
  - `PUT /availability/me/month-submission` — 월별 불가/가능 제출
- **기대 UX**
  - 특정 월의 현재 제출 상태 조회
  - "이번 달 출강 불가" 버튼(또는 동등 UX)
  - 다시 가능으로 전환 가능, 기존 slot 제출과 충돌 없이 동작

---

## 1. API 스펙 가정 (백엔드 확인 필요)

백엔드 free-b #29 실제 스펙에 맞춰 조정하면 됩니다.

| 메서드 | 경로 | 요청 | 응답 가정 |
|--------|------|------|-----------|
| GET | `/availability/me/month-submission` | 쿼리 `?yearMonth=YYYY-MM` (선택) | `{ yearMonth: string, unavailable: boolean }` 또는 `{ items: Array<{ yearMonth, unavailable }> }` |
| PUT | `/availability/me/month-submission` | Body `{ yearMonth: "YYYY-MM", unavailable: boolean }` | 동일 DTO 또는 204 |

- **조회**: 특정 월만 쓰는 경우 `GET ...?yearMonth=2025-03` 형태를 가정.
- **제출**: `unavailable: true` → 해당 월 전체 불가, `unavailable: false` → 불가 해제(다시 가능).

---

## 2. 구현 방향 (프론트)

### 2-1. API 레이어 (`src/api/`)

**타입 (`types.ts`)**

- 월간 제출 상태용 타입 추가.
- 예시 (백엔드 필드명에 맞게 수정):

```ts
// 월간 출강 불가 제출 상태 (GET 응답)
export interface MonthSubmissionStatus {
  yearMonth: string; // "YYYY-MM"
  unavailable: boolean;
}

// PUT 요청 body
export interface PutMonthSubmissionBody {
  yearMonth: string;
  unavailable: boolean;
}
```

**httpClient**

- `getMonthSubmission(yearMonth: string): Promise<MonthSubmissionStatus>`
  - `GET /availability/me/month-submission?yearMonth=YYYY-MM`
- `putMonthSubmission(body: PutMonthSubmissionBody): Promise<MonthSubmissionStatus | void>`
  - `PUT /availability/me/month-submission`, body: `{ yearMonth, unavailable }`

응답이 배열이면 `getMonthSubmission`에서 해당 `yearMonth` 한 건만 반환하거나, 화면에서 "현재 월"만 쓰도록 처리하면 됨.

### 2-2. 진입점·화면: 가용시간 설정 화면에 블록 추가

**위치**: `AvailabilitySettingsScreen.tsx` 상단(캘린더보다 위) 또는 "가능 날짜 선택" 섹션 바로 위.

- **"이번 달 출강 불가" 전용 블록** 하나 두는 것을 권장.
  - 제목: 예) "이번 달 출강 가능 여부"
  - 현재 월 표시: 예) "2025년 3월"
  - 상태 문구:
    - 제출 전/미제출: "아직 제출하지 않았습니다." 또는 "이번 달 출강 가능으로 둘 수 있습니다."
    - 불가 제출됨: "이번 달 출강 불가로 제출했습니다."
  - 버튼 1개 (토글):
    - 현재 `unavailable === false` 또는 미제출 → **"이번 달 출강 불가로 제출"**
    - 현재 `unavailable === true` → **"다시 출강 가능으로 변경"**

**상태 로직**

- `focusedMonth` 또는 `selectedYearMonth`를 `YYYY-MM`으로 1개 두고(기본값: 오늘 기준 현재 월).
- 화면 마운트 시·월 변경 시 `getMonthSubmission(selectedYearMonth)` 호출해 상태 표시.
- 버튼 클릭 시:
  - "불가로 제출" → `putMonthSubmission({ yearMonth, unavailable: true })`
  - "다시 가능으로" → `putMonthSubmission({ yearMonth, unavailable: false })`
- 성공 시:
  - `getMonthSubmission(selectedYearMonth)` 다시 호출해 UI 갱신.
  - 필요하면 `getAvailability()`도 다시 호출해 기존 slot 목록과 일관성 유지 (이슈에서 "slot 제출과 충돌 없이" 요구).

**월 선택**

- 1차 구현: "현재 월"만 지원해도 됨 (오늘 기준 `YYYY-MM`).
- 이후 확장: Picker나 캘린더에서 월을 바꾸면 `selectedYearMonth`만 바꾸고 같은 `getMonthSubmission`/`putMonthSubmission` 재사용.

### 2-3. 문구·완료/취소 UX

- **제출 완료**: Alert "이번 달 출강 불가로 제출했습니다." / "다시 출강 가능으로 변경했습니다."
- **실패**: Alert "제출에 실패했습니다. 다시 시도해주세요." (에러 시)
- **취소**: "다시 출강 가능으로 변경" 전에 확인 Alert 한 번 넣어도 됨. 예: "이번 달을 다시 출강 가능으로 변경하시겠어요?"

### 2-4. 기존 slot 흐름과의 관계

- 월간 불가 제출은 "해당 월 전체 불가" 의미로 두고, slot 일괄 설정은 그대로 유지.
- 동작은 백엔드 정책에 따름. 프론트는:
  - PUT 후 같은 월에 대해 `getMonthSubmission` + (선택) `getAvailability()` 재조회로 일관된 상태만 보여주면 됨.
  - 같은 화면에서 "등록된 가능시간"과 "이번 달 출강 불가"가 함께 보여도 됨. (백엔드가 월 불가 시 slot을 숨기거나 무시하면, 재조회 후에는 그에 맞게만 보이면 됨.)

---

## 3. 작업 체크리스트

| 순서 | 작업 | 비고 |
|------|------|------|
| 1 | 백엔드 Swagger/문서로 GET·PUT 경로, 쿼리, body, 응답 필드 확인 | `yearMonth` 형식, `unavailable` 여부 등 |
| 2 | `types.ts`에 `MonthSubmissionStatus`, `PutMonthSubmissionBody` 추가 | 필드명을 백엔드에 맞춤 |
| 3 | `httpClient`에 `getMonthSubmission`, `putMonthSubmission` 추가 | |
| 4 | `AvailabilitySettingsScreen` 상단에 "이번 달 출강 가능 여부" 블록 추가 | 현재 월만 지원해도 됨 |
| 5 | 상태 조회(마운트·월 변경 시), 버튼 토글(PUT) 및 성공/실패 Alert 구현 | |
| 6 | PUT 성공 후 `getMonthSubmission`(필요 시 `getAvailability`) 재호출로 UI 갱신 | |
| 7 | 문구 정리 및 "다시 가능으로 변경" 시 확인 Alert 추가 | |

---

## 4. 완료 조건 (이슈 기준)

- 앱에서 월 단위 "명시적 불가" 제출이 가능하다.
- 백엔드 응답을 기준으로 해당 월의 제출 상태가 안정적으로 표시된다.
- 기존 slot 제출 흐름과 충돌 없이 동작한다 (재조회로 상태 일치).

이안대로 진행하면 #82 요구사항을 프론트에서 만족시킬 수 있습니다. 백엔드 실제 스펙만 반영해 타입·경로·쿼리만 조정하면 됩니다.
