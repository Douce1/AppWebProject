// httpClient: 실제 백엔드 API 호출용 껍데기 구현.
// 엔드포인트 경로는 free-b/docs/mock-api-contract.md 에 정의된 것만 사용합니다.

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import {
  ApiAttendanceEvent,
  ApiAvailabilitySlot,
  ApiChatMessage,
  ApiChatMessageList,
  ApiChatRoom,
  ApiCompany,
  ApiContract,
  ApiContractDetail,
  ApiContractVersion,
  ApiInstructorProfile,
  ApiLesson,
  ApiLessonReport,
  ApiLessonRequest,
  AuthLoginResponse,
  LectureRecordView,
} from './types';
import type { SubmitContractSignaturePayload } from './types';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '../store/authStore';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  deviceApiUrl?: string;
  useMockAuth?: boolean;
};

function normalizeAndroidLocalhost(url: string): string {
  return url
    .replace('://localhost', '://10.0.2.2')
    .replace('://127.0.0.1', '://10.0.2.2');
}

function resolveBaseUrl(): string {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    extra.deviceApiUrl ??
    extra.apiUrl ??
    'http://localhost:3000';

  if (Platform.OS === 'android') {
    return normalizeAndroidLocalhost(configuredUrl);
  }

  return configuredUrl;
}

const BASE_URL = resolveBaseUrl();
const USE_MOCK_AUTH = extra.useMockAuth ?? true;

type ApiError = Error & { code?: string; status?: number };
type AuthFailureHandler = () => void | Promise<void>;

interface RefreshLoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface DemoLoginPayload {
  channel: 'web' | 'app';
  email?: string;
  userId?: string;
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
}

let authFailureHandler: AuthFailureHandler = () => {
  router.replace('/login');
};

export function setAuthFailureHandler(handler: AuthFailureHandler): void {
  authFailureHandler = handler;
}

async function buildApiError(response: Response, path: string): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  const err = new Error(
    body.message ?? body.code ?? `HTTP error ${response.status} for ${path}`,
  ) as ApiError;
  err.code = body.code;
  err.status = response.status;
  return err;
}

async function handleAuthFailure(): Promise<void> {
  await clearTokens();
  await authFailureHandler();
}

async function tryRefreshTokens(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as RefreshLoginResponse;
  if (!data.accessToken || !data.refreshToken) {
    return false;
  }

  await saveTokens(data.accessToken, data.refreshToken);
  return true;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    headers,
    requiresAuth = true,
    retryOnUnauthorized = true,
    ...init
  } = options;

  const requestHeaders = new Headers(headers);
  if (init.body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (response.status === 401 && requiresAuth && retryOnUnauthorized) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return requestJson<T>(path, {
        ...options,
        retryOnUnauthorized: false,
      });
    }

    await handleAuthFailure();
  }

  if (!response.ok) {
    throw await buildApiError(response, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, { method: 'GET' });
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, { method: 'DELETE' });
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
  async loginWithDemoAccount(payload: DemoLoginPayload): Promise<AuthLoginResponse> {
    return requestJson<AuthLoginResponse>('/auth/demo-login', {
      method: 'POST',
      requiresAuth: false,
      retryOnUnauthorized: false,
      body: JSON.stringify(payload),
    });
  },

  async loginWithGoogle(idToken: string): Promise<AuthLoginResponse> {
    if (USE_MOCK_AUTH) {
      return {
        accessToken: `mock-access-token-${idToken.slice(0, 8)}`,
        refreshToken: `mock-refresh-token-${idToken.slice(0, 8)}`,
        user: {
          userId: 'U1',
          email: 'admin@example.com',
          name: 'Demo Admin',
        },
      };
    }

    return requestJson<AuthLoginResponse>('/auth/google', {
      method: 'POST',
      requiresAuth: false,
      retryOnUnauthorized: false,
      body: JSON.stringify({ idToken }),
    });
  },

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

  async getChatMessages(
    roomId: string,
    cursor?: string,
  ): Promise<ApiChatMessageList> {
    const query = cursor ? `?cursor=${cursor}` : '';
    const data = await getJson<{ items: ApiChatMessage[]; nextCursor?: string | null }>(
      `/chat/rooms/${roomId}/messages${query}`,
    );

    return {
      items: data.items,
      nextCursor: data.nextCursor ?? null,
    };
  },

  async sendChatMessage(roomId: string, text: string): Promise<ApiChatMessage> {
    return postJson<ApiChatMessage>(`/chat/rooms/${roomId}/messages`, { text });
  },

  async markRoomAsRead(roomId: string): Promise<void> {
    await postJson<void>(`/chat/rooms/${roomId}/read`);
  },

  async getUnreadCount(): Promise<number> {
    const data = await getJson<{ unreadCount: number }>('/chat/unread-count');
    return data.unreadCount;
  },
};
