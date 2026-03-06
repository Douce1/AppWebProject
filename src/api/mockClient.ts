// mockClient: free-b service-plan.mock.ts와 동일한 타입/필드명을 사용하는 클라이언트.
// 실제 mock 데이터는 간단한 샘플만 포함하며, shape 계약을 맞추는 것이 목적입니다.

import {
  ApiAttendanceEvent,
  ApiAvailabilitySlot,
  ApiChatMessage,
  ApiChatRoom,
  ApiCompany,
  ApiContract,
  ApiInstructorProfile,
  ApiLesson,
  ApiLessonReport,
  ApiLessonRequest,
  ApiContract,
  ApiContractDetail,
  ApiContractVersion,
  ApiContractSignature,
  ApiAttendanceEvent,
  LectureRecordView,
} from './types';
import type { SubmitContractSignaturePayload } from './types';

// 간단한 샘플 데이터 (shape 검증용)
const MOCK_COMPANY: ApiCompany = {
  companyId: 'C_DEMO_001',
  name: 'Demo Edu Company',
  ownerUserId: 'U_ADMIN_001',
};

const MOCK_INSTRUCTOR: ApiInstructorProfile = {
  instructorId: 'I_001',
  userId: 'U_INS_001',
  name: 'Minsu Park',
  email: 'minsu@example.com',
  phone: '01012345678',
  residenceArea: 'Seoul',
  certificates: ['Youth Instructor Lv1'],
  majorField: 'History Education',
  profileNote: 'Available on weekdays',
  isActive: true,
};

const MOCK_AVAILABILITY: ApiAvailabilitySlot[] = [
  {
    slotId: 'AS_001',
    instructorId: 'I_001',
    availableStartAt: '2026-03-10T00:00:00Z',
    availableEndAt: '2026-03-10T05:00:00Z',
  },
];

const MOCK_LESSONS: ApiLesson[] = [
  {
    lessonId: 'L_001',
    companyId: 'C_DEMO_001',
    requestedInstructorId: 'I_001',
    lectureTitle: 'Prehistoric Age Class',
    region: 'Seoul',
    museum: 'National Museum of Korea',
    guideNotionUrl: 'https://notion.so/demo-guide-1',
    payAmount: 120000,
    studentCount: 24,
    lessonDetails: 'Hands-on workshop with timeline cards',
    deliveryNotes: 'Bring printed worksheet set A',
    startsAt: '2026-03-10T01:00:00Z',
    endsAt: '2026-03-10T03:00:00Z',
    status: 'CONTRACT_SIGNED',
  },
  {
    lessonId: 'L_002',
    companyId: 'C_DEMO_001',
    requestedInstructorId: 'I_001',
    lectureTitle: '고3 EBS 파이널 문풀',
    region: 'Seoul',
    museum: '강남본원 3관',
    guideNotionUrl: 'https://notion.so/demo-guide-2',
    payAmount: 150000,
    studentCount: 30,
    lessonDetails: 'EBS 연계 문항 정리',
    deliveryNotes: '',
    startsAt: '2026-03-15T18:00:00Z',
    endsAt: '2026-03-15T20:00:00Z',
    status: 'CONTRACT_SIGNED',
  },
  {
    lessonId: 'L_003',
    companyId: 'C_DEMO_001',
    requestedInstructorId: 'I_001',
    lectureTitle: '조선시대 생활사',
    region: 'Gyeonggi',
    museum: '경기박물관',
    guideNotionUrl: 'https://notion.so/demo-guide-3',
    payAmount: 100000,
    studentCount: 20,
    lessonDetails: '조선 시대 의식주와 문화',
    deliveryNotes: '',
    startsAt: '2026-02-20T10:00:00Z',
    endsAt: '2026-02-20T12:00:00Z',
    status: 'CONTRACT_SIGNED',
  },
  {
    lessonId: 'L_004',
    companyId: 'C_DEMO_001',
    requestedInstructorId: 'I_001',
    lectureTitle: '근대사 특강',
    region: 'Seoul',
    museum: '국립중앙박물관',
    guideNotionUrl: 'https://notion.so/demo-guide-4',
    payAmount: 130000,
    studentCount: 25,
    lessonDetails: '개항기부터 일제강점기',
    deliveryNotes: '',
    startsAt: '2026-01-08T14:00:00Z',
    endsAt: '2026-01-08T16:00:00Z',
    status: 'CONTRACT_SIGNED',
  },
];

const MOCK_LESSON_REQUESTS: ApiLessonRequest[] = [
  {
    requestId: 'LR_001',
    companyId: 'C_DEMO_001',
    lessonId: 'L_001',
    instructorId: 'I_001',
    status: 'ACCEPTED',
    rejectionReason: null,
    cooldownUntil: null,
    requestedAt: '2026-03-04T01:00:00Z',
    respondedAt: '2026-03-04T01:10:00Z',
  },
];

const MOCK_CONTRACTS: ApiContract[] = [
  {
    contractId: 'CT_001',
    companyId: 'C_DEMO_001',
    lessonId: 'L_001',
    instructorId: 'I_001',
    status: 'FULLY_SIGNED',
    currentVersion: 1,
    title: '강남본원 2023 하반기 계약서',
    effectiveFrom: '2023-09-01',
    effectiveTo: '2024-02-28',
  },
  {
    contractId: 'CT_002',
    companyId: 'C_DEMO_001',
    lessonId: 'L_002',
    instructorId: 'I_001',
    status: 'SENT',
    currentVersion: 1,
    title: '강남본원 2026 상반기 계약서',
    effectiveFrom: '2026-03-01',
    effectiveTo: '2026-08-31',
  },
  {
    contractId: 'CT_003',
    companyId: 'C_DEMO_001',
    lessonId: 'L_003',
    instructorId: 'I_001',
    status: 'INSTRUCTOR_SIGNED',
    currentVersion: 1,
    title: '경기박물관 계약서',
    effectiveFrom: '2026-02-01',
    effectiveTo: '2026-06-30',
  },
  {
    contractId: 'CT_004',
    companyId: 'C_DEMO_001',
    lessonId: 'L_004',
    instructorId: 'I_001',
    status: 'VOID',
    currentVersion: 1,
    title: '취소된 계약 (VOID)',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
  },
];

const MOCK_ATTENDANCE_EVENTS: ApiAttendanceEvent[] = [];

const MOCK_LESSON_REPORTS: ApiLessonReport[] = [];

// 계약 상세/버전/서명 Mock (contractId 기준)
const MOCK_CONTRACT_VERSIONS: Record<string, ApiContractVersion> = {
  CT_001: {
    contractId: 'CT_001',
    version: 1,
    contentJson: JSON.stringify({
      sections: [
        { title: '1. 계약 당사자', content: '· 원장: 메가강남본원 원장\n· 강사: 김태완' },
        { title: '2. 강의 및 근무 조건', content: '· 담당 과목: 수학\n· 근무 요일: 월, 수, 금' },
        { title: '3. 정산 및 지급', content: '· 정산 주기: 매월 1회\n· 지급일: 익월 10일' },
      ],
    }),
    documentHashSha256: 'a1b2c3d4e5f6mockhash001',
    documentFileKey: 'contracts/CT_001/v1/document.pdf',
    createdAt: '2023-09-01T00:00:00Z',
  },
  CT_002: {
    contractId: 'CT_002',
    version: 1,
    contentJson: JSON.stringify({
      sections: [
        { title: '1. 계약 당사자', content: '· 원장: 강남본원\n· 강사: (서명 대기)' },
        { title: '2. 강의 및 근무 조건', content: '· 고3 EBS 파이널 문풀 관련 조건' },
      ],
    }),
    documentHashSha256: 'b2c3d4e5f6mockhash002',
    documentFileKey: 'contracts/CT_002/v1/document.pdf',
    createdAt: '2026-03-01T00:00:00Z',
  },
  CT_003: {
    contractId: 'CT_003',
    version: 1,
    contentJson: JSON.stringify({ sections: [{ title: '경기박물관 계약', content: '강사 서명 완료, 관리자 서명 대기' }] }),
    documentHashSha256: 'c3d4e5f6mockhash003',
    documentFileKey: 'contracts/CT_003/v1/document.pdf',
    createdAt: '2026-02-01T00:00:00Z',
  },
  CT_004: {
    contractId: 'CT_004',
    version: 1,
    contentJson: JSON.stringify({ sections: [] }),
    documentHashSha256: 'd4e5f6mockhash004',
    documentFileKey: 'contracts/CT_004/v1/document.pdf',
    createdAt: '2026-01-01T00:00:00Z',
  },
};

/** 서명용 유효 토큰 (CT_002만 서명 대기 상태) */
const VALID_SIGN_TOKEN_CT002 = 'sign-token-valid-ct002';

function getMockSignatures(contractId: string, version: number, status: string): ApiContractSignature[] {
  const base = {
    contractId,
    version,
    consentGiven: true,
    consentTextVersion: '1.0',
    signTokenId: 'used-token',
    ipHash: 'mock-ip-hash',
    userAgent: 'MockApp/1.0',
    signedAt: '2023-09-01T10:00:00Z',
  };
  if (contractId === 'CT_001' && status === 'FULLY_SIGNED') {
    return [
      { ...base, signerRole: 'INSTRUCTOR', signedAt: '2023-09-01T10:00:00Z' },
      { ...base, signerRole: 'OWNER', signedAt: '2023-09-01T11:00:00Z' },
    ];
  }
  if (contractId === 'CT_002' && status === 'SENT') return [];
  if (contractId === 'CT_003' && status === 'INSTRUCTOR_SIGNED') {
    return [{ ...base, signerRole: 'INSTRUCTOR', signedAt: '2026-02-15T10:00:00Z' }];
  }
  if (contractId === 'CT_004') return [];
  return [];
}

function getContractDetail(contractId: string): ApiContractDetail {
  const contract = MOCK_CONTRACTS.find((c) => c.contractId === contractId);
  if (!contract) {
    const err = new Error('CONTRACT_NOT_FOUND') as Error & { code?: string };
    err.code = 'CONTRACT_NOT_FOUND';
    throw err;
  }
  const currentVersion = MOCK_CONTRACT_VERSIONS[contractId] ?? null;
  const signatures = getMockSignatures(contractId, contract.currentVersion, contract.status);
  let signTokenId: string | null = null;
  if (contract.status === 'SENT' && contractId === 'CT_002') signTokenId = VALID_SIGN_TOKEN_CT002;
  return { contract, currentVersion, signatures, signTokenId };
}
// ---- Chat Mock Data ----
const MOCK_CHAT_ROOMS: ApiChatRoom[] = [
  { roomId: 'room-1', name: '강남본원 회화', lastMessage: '강의 제안에 대해 확인해주세요.', lastMessageAt: new Date().toISOString(), unreadCount: 1 },
  { roomId: 'room-2', name: '종로 어학원', lastMessage: '네 참석 가능합니다!', lastMessageAt: new Date(Date.now() - 86400000).toISOString(), unreadCount: 0 },
  { roomId: 'room-3', name: '분당 수능관', lastMessage: '다음 주 강의 자료 미리 부탁드립니다.', lastMessageAt: new Date(Date.now() - 7200000).toISOString(), unreadCount: 1 },
];

const MOCK_CHAT_MESSAGES: ApiChatMessage[] = [
  { messageId: (Date.now() - 86400000 * 2).toString(), roomId: 'room-2', senderId: 'admin-2', senderName: '종로 어학원', text: '이번 주 금요일 회식 참석 가능하신가요?', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), isRead: true, isMine: false },
  { messageId: (Date.now() - 86400000).toString(), roomId: 'room-2', senderId: 'me', senderName: '나', text: '네 참석 가능합니다!', createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: true, isMine: true },
  { messageId: (Date.now() - 7200000).toString(), roomId: 'room-3', senderId: 'admin-3', senderName: '분당 수능관', text: '다음 주 강의 자료 미리 부탁드립니다.', createdAt: new Date(Date.now() - 7200000).toISOString(), isRead: false, isMine: false },
  { messageId: Date.now().toString(), roomId: 'room-1', senderId: 'admin-1', senderName: '강남본원 회화', text: '강의 제안에 대해 확인해주세요.', createdAt: new Date().toISOString(), isRead: false, isMine: false },
];

// 강의 이력 뷰를 위한 변환 함수
function toLectureHistoryView(lessons: ApiLesson[], reports: ApiLessonReport[]): LectureRecordView[] {
  return lessons.map((lesson) => {
    const startDate = new Date(lesson.startsAt);
    const endDate = new Date(lesson.endsAt);
    const msDiff = endDate.getTime() - startDate.getTime();
    const durationHours = Math.max(msDiff / (1000 * 60 * 60), 0);

    const firstReport = reports.find((r) => r.lessonId === lesson.lessonId);

    return {
      id: lesson.lessonId,
      date: lesson.startsAt.slice(0, 10),
      region: lesson.region,
      museum: lesson.museum,
      title: lesson.lectureTitle,
      durationHours,
      notes: firstReport?.content ?? lesson.lessonDetails,
    };
  });
}

export const mockClient = {
  // auth / me
  async getMe() {
    return {
      userId: 'U_ADMIN_001',
      email: 'admin@example.com',
      name: 'Demo Admin',
    };
  },

  async getCompany(): Promise<ApiCompany> {
    return MOCK_COMPANY;
  },

  async getInstructorProfile(): Promise<ApiInstructorProfile> {
    return MOCK_INSTRUCTOR;
  },

  async getAvailability(): Promise<ApiAvailabilitySlot[]> {
    return MOCK_AVAILABILITY;
  },

  async getLessons(): Promise<ApiLesson[]> {
    return MOCK_LESSONS;
  },

  async getLessonRequests(): Promise<ApiLessonRequest[]> {
    return MOCK_LESSON_REQUESTS;
  },

  async getContracts(): Promise<ApiContract[]> {
    return MOCK_CONTRACTS;
  },

  async getContract(contractId: string): Promise<ApiContractDetail> {
    return getContractDetail(contractId);
  },

  async getContractVersion(contractId: string, version: number): Promise<ApiContractVersion> {
    const v = MOCK_CONTRACT_VERSIONS[contractId];
    if (!v || v.version !== version) {
      const err = new Error('CONTRACT_NOT_FOUND') as Error & { code?: string };
      err.code = 'CONTRACT_NOT_FOUND';
      throw err;
    }
    return v;
  },

  async submitContractSignature(contractId: string, payload: SubmitContractSignaturePayload): Promise<ApiContractDetail> {
    if (!payload.consentGiven) {
      const err = new Error('CONSENT_REQUIRED') as Error & { code?: string };
      err.code = 'CONSENT_REQUIRED';
      throw err;
    }
    const detail = getContractDetail(contractId);
    if (detail.contract.status === 'FULLY_SIGNED') {
      const err = new Error('CONTRACT_ALREADY_SIGNED') as Error & { code?: string };
      err.code = 'CONTRACT_ALREADY_SIGNED';
      throw err;
    }
    if (detail.contract.status === 'SENT' && detail.signTokenId) {
      if (payload.signTokenId !== detail.signTokenId) {
        const err = new Error('SIGN_TOKEN_EXPIRED') as Error & { code?: string };
        err.code = 'SIGN_TOKEN_EXPIRED';
        throw err;
      }
      // 성공: 강사 서명 반영된 상세 반환 (INSTRUCTOR_SIGNED)
      const instructorSignature: ApiContractSignature = {
        contractId,
        version: detail.contract.currentVersion,
        signerRole: 'INSTRUCTOR',
        consentGiven: true,
        consentTextVersion: payload.consentTextVersion,
        signTokenId: payload.signTokenId,
        ipHash: payload.ipHash ?? 'mock-ip-hash',
        userAgent: payload.userAgent ?? 'MockApp/1.0',
        signedAt: new Date().toISOString(),
      };
      return {
        contract: { ...detail.contract, status: 'INSTRUCTOR_SIGNED' },
        currentVersion: detail.currentVersion,
        signatures: [...detail.signatures, instructorSignature],
        signTokenId: null,
      };
    }
    // 이미 강사 서명된 경우 등
    const err = new Error('CONTRACT_ALREADY_SIGNED') as Error & { code?: string };
    err.code = 'CONTRACT_ALREADY_SIGNED';
    throw err;
  },

  async getAttendanceEvents(): Promise<ApiAttendanceEvent[]> {
    return MOCK_ATTENDANCE_EVENTS;
  },

  async getLessonReports(): Promise<ApiLessonReport[]> {
    return MOCK_LESSON_REPORTS;
  },

  // 강의 이력 뷰 (현재는 /lessons, /lesson-reports mock에서 파생)
  async getLectureHistory(): Promise<LectureRecordView[]> {
    return toLectureHistoryView(MOCK_LESSONS, MOCK_LESSON_REPORTS);
  },

  // ---- Chat ----
  async getChatRooms(): Promise<ApiChatRoom[]> {
    return MOCK_CHAT_ROOMS;
  },

  async getChatMessages(roomId: string, _cursor?: string): Promise<ApiChatMessage[]> {
    return MOCK_CHAT_MESSAGES.filter(m => m.roomId === roomId);
  },

  async sendChatMessage(roomId: string, text: string): Promise<ApiChatMessage> {
    const msg: ApiChatMessage = {
      messageId: Date.now().toString(),
      roomId,
      senderId: 'me',
      senderName: '나',
      text,
      createdAt: new Date().toISOString(),
      isRead: true,
      isMine: true,
    };
    MOCK_CHAT_MESSAGES.push(msg);
    // Update room's lastMessage
    const room = MOCK_CHAT_ROOMS.find(r => r.roomId === roomId);
    if (room) {
      room.lastMessage = text;
      room.lastMessageAt = msg.createdAt;
    }
    return msg;
  },

  async markRoomAsRead(roomId: string): Promise<void> {
    MOCK_CHAT_MESSAGES.forEach(m => {
      if (m.roomId === roomId && !m.isMine) m.isRead = true;
    });
    const room = MOCK_CHAT_ROOMS.find(r => r.roomId === roomId);
    if (room) room.unreadCount = 0;
  },

  async getUnreadCount(): Promise<number> {
    return MOCK_CHAT_ROOMS.reduce((sum, r) => sum + r.unreadCount, 0);
  },
};

