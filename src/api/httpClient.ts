// httpClient: 실제 백엔드 API 호출용 껍데기 구현.
// 엔드포인트 경로는 free-b/docs/mock-api-contract.md 에 정의된 것만 사용합니다.

import {
  ApiAttendanceEvent,
  ApiAvailabilitySlot,
  ApiChatMessage,
  ApiChatRoom,
  ApiCompany,
  ApiContract,
  ApiContractDetail,
  ApiContractVersion,
  ApiInstructorProfile,
  ApiLesson,
  ApiLessonReport,
  ApiLessonRequest,
  LectureRecordView,
} from './types';
import type { SubmitContractSignaturePayload } from './types';

const BASE_URL = 'http://localhost:3000';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { code?: string };
    const err = new Error(body?.code ?? `HTTP error ${res.status} for ${path}`) as Error & { code?: string; status?: number };
    err.code = body?.code;
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { code?: string };
    const err = new Error(data?.code ?? `HTTP error ${res.status} for ${path}`) as Error & { code?: string; status?: number };
    err.code = data?.code;
    err.status = res.status;
    throw err;
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

  async getContract(contractId: string): Promise<ApiContractDetail> {
    return getJson<ApiContractDetail>(`/contracts/${encodeURIComponent(contractId)}`);
  },

  async getContractVersion(contractId: string, version: number): Promise<ApiContractVersion> {
    return getJson<ApiContractVersion>(`/contracts/${encodeURIComponent(contractId)}/versions/${version}`);
  },

  async submitContractSignature(contractId: string, payload: SubmitContractSignaturePayload): Promise<ApiContractDetail> {
    return postJson<ApiContractDetail>(`/contracts/${encodeURIComponent(contractId)}/sign`, payload);
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

  // ---- Chat ----
  async getChatRooms(): Promise<ApiChatRoom[]> {
    return getJson<ApiChatRoom[]>('/chat/rooms');
  },

  async getChatMessages(roomId: string, cursor?: string): Promise<ApiChatMessage[]> {
    const query = cursor ? `?cursor=${cursor}` : '';
    return getJson<ApiChatMessage[]>(`/chat/rooms/${roomId}/messages${query}`);
  },

  async sendChatMessage(roomId: string, text: string): Promise<ApiChatMessage> {
    const res = await fetch(`${BASE_URL}/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json() as Promise<ApiChatMessage>;
  },

  async markRoomAsRead(roomId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/chat/rooms/${roomId}/read`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  },

  async getUnreadCount(): Promise<number> {
    const data = await getJson<{ count: number }>('/chat/unread-count');
    return data.count;
  },
};

