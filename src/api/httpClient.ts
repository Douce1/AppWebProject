// httpClient: 실제 백엔드 API 호출용 껍데기 구현.
// 엔드포인트 경로는 free-b/docs/mock-api-contract.md 에 정의된 것만 사용합니다.

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

const BASE_URL = 'http://localhost:3000';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

// 강의 이력 뷰 변환은 mockClient와 동일한 규칙 사용
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

export const httpClient = {
  async getMe() {
    return getJson<{ userId: string; email: string; name: string }>('/me');
  },

  async getCompany(): Promise<ApiCompany> {
    return getJson<ApiCompany>('/me/company');
  },

  async getInstructorProfile(): Promise<ApiInstructorProfile> {
    // 실제 엔드포인트가 정의되면 '/instructors/me' 등으로 교체
    return getJson<ApiInstructorProfile>('/instructors/me');
  },

  async getAvailability(): Promise<ApiAvailabilitySlot[]> {
    return getJson<ApiAvailabilitySlot[]>('/availability/me');
  },

  async getLessons(): Promise<ApiLesson[]> {
    return getJson<ApiLesson[]>('/lessons');
  },

  async getLessonRequests(): Promise<ApiLessonRequest[]> {
    return getJson<ApiLessonRequest[]>('/lesson-requests');
  },

  async getContracts(): Promise<ApiContract[]> {
    return getJson<ApiContract[]>('/contracts');
  },

  async getAttendanceEvents(): Promise<ApiAttendanceEvent[]> {
    return getJson<ApiAttendanceEvent[]>('/attendance-events');
  },

  async getLessonReports(): Promise<ApiLessonReport[]> {
    return getJson<ApiLessonReport[]>('/lesson-reports');
  },

  async getLectureHistory(): Promise<LectureRecordView[]> {
    const [lessons, reports] = await Promise.all([this.getLessons(), this.getLessonReports()]);
    return toLectureHistoryView(lessons, reports);
  },
};

