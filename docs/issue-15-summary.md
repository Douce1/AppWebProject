# Issue #15 대조 및 수정 요약

이슈: [app] ScheduleContext → 수업/요청 API 연동 + 체크인 액션

---

## 완료 기준(DoD) 반영

| 완료 기준 | 상태 |
|-----------|------|
| 홈 화면에 실제 수업 목록 표시 | ✅ `getLessons()` → ClassSession 매핑 후 표시 (기존 구현 유지) |
| DEPART/ARRIVE/FINISH 버튼 → 백엔드 체크인 이벤트 기록 | ✅ `checkinByAssignment` 호출, 실패 시 Alert 표시 |
| GPS 위치 포함하여 전송 | ✅ DEPART 기존 GPS 사용. ARRIVE/FINISH에 `getLocationForCheckin()` 추가하여 lat/lng/accuracyMeters·occurredAt 전송 |
| lesson request / checkin 경로가 최신 백엔드 계약과 일치 | ✅ GET `/lesson-requests`, POST `/assignments/:requestId/checkin` 사용 중 (백엔드와 일치) |

---

## 수정 내용

1. **ScheduleContext.tsx**
   - **ARRIVE/FINISH 체크인 시 GPS 포함**: `getLocationForCheckin()` 헬퍼 추가, ARRIVE/FINISH에서도 위치 조회 후 lat/lng/accuracyMeters·occurredAt 전송. 위치 실패 시 0,0으로 전송해 이벤트는 기록.
   - **체크인 실패 시 UI**: DEPART/ARRIVE/FINISH API 실패 시 `Alert.alert('전송 실패', ...)` 표시 후 로컬 상태 변경 없음.
   - **조회 실패 시 UI**: `getLessons()` 실패 시, `getLessonRequests()`/`getAttendanceEvents()` 실패 시 각각 Alert 표시.
   - 미사용 `catch (error)` → `catch` 로 수정 (lint 대응).

2. **httpClient.ts**
   - 경로 변경 없음. 이미 `getLessonRequests()` → `/lesson-requests`, `checkinByAssignment()` → `/assignments/:requestId/checkin` 사용 중.

---

## 테스트

- `npx tsc --noEmit` 통과
- `npx expo lint`: ScheduleContext 관련 에러 0건 (기존 프로젝트 경고만 존재)
