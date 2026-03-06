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
  /** 상세 표시용 (백엔드에서 내려주면 표시) */
  title?: string;
  effectiveFrom?: string; // ISO date
  effectiveTo?: string;   // ISO date
}

/** 계약 서명자 역할 */
export type ContractSignerRole = 'INSTRUCTOR' | 'OWNER';

/** 계약 버전 (법적 증빙 필드 필수) */
export interface ApiContractVersion {
  contractId: string;
  version: number;
  contentJson: string;
  documentHashSha256: string;
  documentFileKey: string;
  createdAt: string; // ISO
}

/** 계약 서명 1건 (법적 증빙 필드 필수) */
export interface ApiContractSignature {
  contractId: string;
  version: number;
  signerRole: ContractSignerRole;
  consentGiven: boolean;
  consentTextVersion: string;
  signTokenId: string;
  ipHash: string;
  userAgent: string;
  signedAt: string; // ISO
}

/** 계약 상세 응답 (getContract) */
export interface ApiContractDetail {
  contract: ApiContract;
  currentVersion: ApiContractVersion | null;
  signatures: ApiContractSignature[];
  /** 강사가 다음 서명할 때 필요한 토큰 (상태 SENT이고 강사 차례일 때만) */
  signTokenId?: string | null;
}

/** 서명 제출 요청 body */
export interface SubmitContractSignaturePayload {
  consentGiven: boolean;
  consentTextVersion: string;
  signTokenId: string;
  /** 클라이언트에서 채우거나 백엔드가 무시할 수 있음 */
  ipHash?: string;
  userAgent?: string;
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
