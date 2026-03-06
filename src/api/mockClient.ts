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
  LectureRecordView,
} from './types';

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
  },
];

const MOCK_ATTENDANCE_EVENTS: ApiAttendanceEvent[] = [];

const MOCK_LESSON_REPORTS: ApiLessonReport[] = [];

// ---- Chat Mock Data ----
const MOCK_CHAT_ROOMS: ApiChatRoom[] = [
  {
    roomId: 'room-1', companyId: 'C_DEMO_001', instructorId: 'I_001', lessonId: null,
    title: '강남본원 회화', status: 'ACTIVE',
    lastMessage: { messageId: 'msg-r1', messageType: 'TEXT', content: '강의 제안에 대해 확인해주세요.', senderUserId: 'admin-1', sentAt: new Date().toISOString() },
    unreadCount: 1, members: [], updatedAt: new Date().toISOString(),
  },
  {
    roomId: 'room-2', companyId: 'C_DEMO_002', instructorId: 'I_001', lessonId: null,
    title: '종로 어학원', status: 'ACTIVE',
    lastMessage: { messageId: 'msg-r2', messageType: 'TEXT', content: '네 참석 가능합니다!', senderUserId: 'me', sentAt: new Date(Date.now() - 86400000).toISOString() },
    unreadCount: 0, members: [], updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    roomId: 'room-3', companyId: 'C_DEMO_003', instructorId: 'I_001', lessonId: null,
    title: '분당 수능관', status: 'ACTIVE',
    lastMessage: { messageId: 'msg-r3', messageType: 'TEXT', content: '다음 주 강의 자료 미리 부탁드립니다.', senderUserId: 'admin-3', sentAt: new Date(Date.now() - 7200000).toISOString() },
    unreadCount: 1, members: [], updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const MOCK_CHAT_MESSAGES: ApiChatMessage[] = [
  { messageId: (Date.now() - 86400000 * 2).toString(), roomId: 'room-2', senderUserId: 'admin-2', senderName: '종로 어학원', messageType: 'TEXT', content: '이번 주 금요일 회식 참석 가능하신가요?', sentAt: new Date(Date.now() - 86400000 * 2).toISOString(), isMine: false },
  { messageId: (Date.now() - 86400000).toString(), roomId: 'room-2', senderUserId: 'me', senderName: '나', messageType: 'TEXT', content: '네 참석 가능합니다!', sentAt: new Date(Date.now() - 86400000).toISOString(), isMine: true },
  { messageId: (Date.now() - 7200000).toString(), roomId: 'room-3', senderUserId: 'admin-3', senderName: '분당 수능관', messageType: 'TEXT', content: '다음 주 강의 자료 미리 부탁드립니다.', sentAt: new Date(Date.now() - 7200000).toISOString(), isMine: false },
  { messageId: Date.now().toString(), roomId: 'room-1', senderUserId: 'admin-1', senderName: '강남본원 회화', messageType: 'TEXT', content: '강의 제안에 대해 확인해주세요.', sentAt: new Date().toISOString(), isMine: false },
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

  async sendChatMessage(roomId: string, content: string): Promise<ApiChatMessage> {
    const sentAt = new Date().toISOString();
    const msg: ApiChatMessage = {
      messageId: Date.now().toString(),
      roomId,
      senderUserId: 'me',
      senderName: '나',
      messageType: 'TEXT',
      content,
      sentAt,
      isMine: true,
    };
    MOCK_CHAT_MESSAGES.push(msg);
    // Update room's lastMessage (object)
    const room = MOCK_CHAT_ROOMS.find(r => r.roomId === roomId);
    if (room) {
      room.lastMessage = { messageId: msg.messageId, messageType: 'TEXT', content, senderUserId: 'me', sentAt };
      room.updatedAt = sentAt;
    }
    return msg;
  },

  async markRoomAsRead(roomId: string): Promise<void> {
    // 백엔드에 isRead가 없으므로 mock에서는 unreadCount만 0 처리
    const room = MOCK_CHAT_ROOMS.find(r => r.roomId === roomId);
    if (room) room.unreadCount = 0;
  },

  async getUnreadCount(): Promise<number> {
    return MOCK_CHAT_ROOMS.reduce((sum, r) => sum + r.unreadCount, 0);
  },
};

