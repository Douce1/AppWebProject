// mockClient: free-b service-plan.mock.ts와 동일한 타입/필드명을 사용하는 클라이언트.
// 실제 mock 데이터는 간단한 샘플만 포함하며, shape 계약을 맞추는 것이 목적입니다.

import {
  ApiAvailabilitySlot,
  ApiCompany,
  ApiInstructorProfile,
  ApiLesson,
  ApiLessonReport,
  ApiLessonRequest,
  ApiContract,
  ApiAttendanceEvent,
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
};

