# Issue #21 완료 정리

## 이슈 목표
**Profile & Region 화면을 백엔드 API와 연동**  
(커밋 메시지: "integrate Profile & Region screens with backend APIs for Issue #8/#21")

---

## 완료된 작업 (이미 구현된 기능 기준 정리)

### 1. 내 정보(Profile) 화면 백엔드 연동
| 항목 | 내용 |
|------|------|
| **화면** | `ProfileScreen`(내 정보), `InstructorProfileScreen`(강사 프로필 설정) |
| **조회** | `GET /instructors/me` → `apiClient.getInstructorProfile()` |
| **저장** | `PUT /instructors/me` → `putJson('/instructors/me', payload)` |
| **연동 위치** | `src/screens/ProfileScreen.tsx`, `src/screens/InstructorProfileScreen.tsx`, `src/api/httpClient.ts` |

### 2. 희망 지역(Region) 화면 백엔드 연동
| 항목 | 내용 |
|------|------|
| **화면** | `RegionSettingScreen`(희망 지역 설정) |
| **조회** | `GET /instructors/me/preferred-regions` → `apiClient.getPreferredRegions()` |
| **저장** | `PUT /instructors/me/preferred-regions` → `apiClient.updatePreferredRegions(items)` |
| **연동 위치** | `src/screens/RegionSettingScreen.tsx`, `src/api/httpClient.ts` |

---

## 관련 API (백엔드 free-b)
- `GET /instructors/me` — 내 강사 프로필 조회
- `PUT /instructors/me` — 내 강사 프로필 수정
- `GET /instructors/me/preferred-regions` — 내 희망 지역 조회
- `PUT /instructors/me/preferred-regions` — 내 희망 지역 저장 (body: `{ items: string[] }`)

---

## GitHub 이슈 닫을 때 사용할 코멘트

아래 내용을 Issue #21에 댓글로 붙여 넣은 뒤 이슈를 **Close** 하시면 됩니다.

```
## Issue #21 완료

Profile & Region 화면 백엔드 API 연동을 완료했습니다.

### 완료 내용
- **내 정보 / 강사 프로필**: GET·PUT `/instructors/me` 연동 (ProfileScreen, InstructorProfileScreen)
- **희망 지역**: GET·PUT `/instructors/me/preferred-regions` 연동 (RegionSettingScreen)

상세 정리는 `docs/issue-21-completion.md` 에 기록했습니다.
```
