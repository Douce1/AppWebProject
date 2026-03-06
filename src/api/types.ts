// API 타입 정의 (free-b service-plan.mock.ts 기반)
// 이 파일의 enum/필드명은 백엔드 문서와 동기화해야 합니다.

export type LessonStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'UPDATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type LessonRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type ContractStatus =
  | 'DRAFT'
  | 'SENT'
  | 'INSTRUCTOR_SIGNED'
  | 'FULLY_SIGNED'
  | 'VOID';

export type AttendanceEventType = 'DEPART' | 'ARRIVE' | 'FINISH';

export interface ApiCompany {
  companyId: string;
  name: string;
  ownerUserId: string;
}

export interface ApiInstructorProfile {
  instructorId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  residenceArea: string;
  certificates: string[];
  majorField: string;
  profileNote: string;
  isActive: boolean;
}

export interface ApiAvailabilitySlot {
  slotId: string;
  instructorId: string;
  availableStartAt: string; // ISO
  availableEndAt: string;   // ISO
}

export interface ApiLesson {
  lessonId: string;
  companyId: string;
  requestedInstructorId: string;
  lectureTitle: string;
  region: string;
  museum: string;
  guideNotionUrl: string;
  payAmount: number;
  studentCount: number;
  lessonDetails: string;
  deliveryNotes: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  status: LessonStatus;
}

export interface ApiLessonRequest {
  requestId: string;
  companyId: string;
  lessonId: string;
  instructorId: string;
  status: LessonRequestStatus;
  rejectionReason: string | null;
  cooldownUntil: string | null;
  requestedAt: string;   // ISO
  respondedAt: string | null; // ISO
}

export interface ApiContract {
  contractId: string;
  companyId: string;
  lessonId: string;
  instructorId: string;
  status: ContractStatus;
  currentVersion: number;
}

export interface ApiAttendanceEvent {
  attendanceEventId: string;
  companyId: string;
  lessonId: string;
  instructorId: string;
  eventType: AttendanceEventType;
  occurredAt: string; // ISO
  lat: number;
  lng: number;
  accuracyMeters: number;
  distanceMeters: number;
  timingStatus: 'ON_TIME' | 'LATE';
  locationStatus: 'OK' | 'SUSPICIOUS';
  isValid: boolean;
}

export interface ApiLessonReport {
  lessonReportId: string;
  companyId: string;
  lessonId: string;
  instructorId: string;
  content: string;
  submittedAt: string; // ISO
}

// MW 앱에서 조회 전용으로 사용하는 강의 이력 뷰 모델
// (ApiLesson + Report 정보를 가공한 형태)
export interface LectureRecordView {
  id: string;
  date: string;          // YYYY-MM-DD (startsAt 기준)
  region: string;
  museum: string;
  title: string;         // lectureTitle
  durationHours: number; // (endsAt - startsAt) 시간 단위
  notes?: string;        // 특이 사항 (lessonDetails/lessonReports 등에서 파생)
}

// ---- Chat API Types (백엔드 free-b 기준) ----

export interface ApiChatRoomMember {
  userId: string;
  role: 'ADMIN' | 'INSTRUCTOR';
  userName: string | null;
  userEmail: string;
  lastReadAt: string | null;
}

export interface ApiChatRoomLastMessage {
  messageId: string;
  messageType: 'TEXT' | 'SYSTEM';
  content: string;
  senderUserId: string;
  sentAt: string; // ISO
}

export interface ApiChatRoom {
  roomId: string;
  companyId: string;
  instructorId: string;
  lessonId: string | null;
  title: string | null;           // 방 이름 (null 가능 → 표시 시 ?? '채팅방')
  status: 'ACTIVE' | 'ARCHIVED';
  lastMessage: ApiChatRoomLastMessage | null;
  unreadCount: number;
  members: ApiChatRoomMember[];
  updatedAt: string;              // ISO — 마지막 업데이트 시간
}

export interface ApiChatMessage {
  messageId: string;
  roomId: string;
  senderUserId: string;           // senderId → senderUserId
  senderName: string | null;
  messageType: 'TEXT' | 'SYSTEM';
  content: string;                // text → content
  sentAt: string;                 // createdAt → sentAt
  // isMine은 앱에서 직접 계산: senderUserId === 현재 로그인 userId
  isMine: boolean;
}
