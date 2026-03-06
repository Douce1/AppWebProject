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

// ---- Chat API Types ----

export interface ApiChatRoom {
  roomId: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string; // ISO
  unreadCount: number;
}

export interface ApiChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string; // ISO
  isRead: boolean;
  isMine: boolean;
}
