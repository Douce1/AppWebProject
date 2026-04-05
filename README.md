# Free-B Instructor App

강사들이 수업 요청을 확인하고 수락하며, 전자 계약을 체결하고, 현장에서 위치 기반 체크인까지 처리할 수 있는 모바일 애플리케이션입니다.

관련 저장소: [어드민 웹](https://github.com/hxxlxn-Kxxx/team4-next) · [백엔드 API](https://github.com/kimi26yg/free-b) · [랜딩 페이지](https://github.com/kimi26yg/freebee-landing)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 수업 관리 | 배정된 수업 목록 확인 및 요청 수락/거절 |
| 전자 계약 | 근로 계약서 수신 · 내용 확인 · 서명 처리 |
| 출강 체크인 | 위치 기반 출발/도착 체크인 및 수업 보고서 작성 |
| 실시간 채팅 | Socket.IO 기반 운영자와의 1:1 채팅 |
| 정산 내역 | 수업별 정산 금액 및 지급 상태 확인 |
| 푸시 알림 | 수업 배정·계약 요청 등 주요 이벤트 알림 |

---

## 화면 구성 (IA)

```
강사 앱
├── 내 일정        — 배정된 수업 캘린더·리스트 뷰
├── 가용시간       — 수업 가능 날짜·시간 등록
├── 계약서         — 계약 목록, 서명 대기 · 완료 확인
├── 정산           — 월별 정산 내역 조회
├── 알림           — 수업·계약·채팅 알림 히스토리
└── 프로필         — 내 정보 관리
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | React Native (Expo SDK) |
| Routing | Expo Router (파일 기반 네비게이션) |
| State | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Real-time | Socket.IO Client |
| Auth | JWT (Access/Refresh Token), SecureStore |
| Push | Expo Notifications |

---

## 아키텍처

```
app/
├── app/                  # Expo Router 라우트 (파일 = 화면)
│   ├── (auth)/           # 인증 전 화면 (로그인)
│   └── (tabs)/           # 탭 기반 메인 화면
├── components/           # 재사용 UI 컴포넌트
├── src/
│   ├── api/              # API 클라이언트 (axios)
│   ├── store/            # Zustand 상태 스토어
│   └── hooks/            # 커스텀 훅
└── assets/               # 이미지, 폰트
```

---

## 실행 방법

```bash
cd app

# 의존성 설치
npm install

# Expo 개발 서버 실행
npm run start

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android
```

---

## 환경 변수

`.env` 파일을 `app/` 루트에 생성하세요.

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_API_URL` | 백엔드 API 서버 주소 |

---

## 빌드 (EAS)

```bash
# 프리뷰 빌드 (개발용)
eas build --profile preview --platform ios

# 프로덕션 빌드
eas build --profile production --platform all
```
