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

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiInstructorProfile {
  instructorId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  residenceArea?: string;
  photoUrl?: string | null;
  /** 백엔드 InstructorEducationDto */
  education?: { schoolName: string; major: string; graduationYear: string } | null;
  /** 백엔드 InstructorCertificationDto[] */
  certifications: { id: string; name: string; year: string }[];
  majorField?: string;
  profileNote?: string;
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
  isExternal?: boolean;
  documentId?: string | null;
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
  /**
   * (이전 버전 호환용) 서버가 여전히 signTokenId를 내려줄 수 있지만,
   * 서명 요청은 항상 reauth를 거쳐 signToken 기반으로 진행한다.
   */
  signTokenId?: string | null;
}

/** reauth 응답: 서명 세션 토큰 */
export interface ApiContractReauthResponse {
  signToken: string;
  expiresAt: string; // ISO
}

/** 서명 제출 요청 body (reauth → signToken 기반) */
export interface SubmitContractSignaturePayload {
  consentGiven: boolean;
  consentTextVersion: string;
  signToken: string;
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

export interface ApiChatMessageList {
  items: ApiChatMessage[];
  nextCursor: string | null;
}

// ---- Settlements API Types ----

export type SettlementStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface ApiSettlement {
  settlementId: string;
  companyId: string;
  instructorId: string;
  lessonId: string;
  month: string;          // "YYYY-MM"
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;    // 세전 지급액
  status: SettlementStatus;
  scheduledPayDate?: string | null;  // ISO date
  paidAt?: string | null;            // ISO date
}

export interface ApiSettlementSummary {
  month: string;          // "YYYY-MM"
  totalGross: number;
  totalHours: number;
  count: number;
  scheduledPayDate?: string | null;
}

// ---- Document Import API Types ----

export interface ApiDocumentDraft {
  lectureTitle: string | null;
  startsAt: string | null;
  endsAt: string | null;
  region: string | null;
  museum: string | null;
  payAmount: number | null;
}

export interface ApiDocument {
  documentId: string;
  imageUrl: string;
  status: 'UPLOADED' | 'DRAFT_READY' | 'CONFIRMED';
  /** 문서 소스 타입 (현재는 외부 문서만 지원) */
  sourceType: 'EXTERNAL_DOCUMENT';
  draft: ApiDocumentDraft | null;
  createdAt: string;
}
