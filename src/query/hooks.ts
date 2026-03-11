import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import type {
  ApiAttendanceEvent,
  ApiChatMessageList,
  ApiChatRoom,
  ApiContract,
  ApiContractDetail,
  ApiLesson,
  ApiLessonReport,
  ApiLessonRequest,
} from '../api/types';
import { queryKeys } from './queryKeys';

export function useLessonsQuery(
  options?: Omit<UseQueryOptions<ApiLesson[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.lessons,
    queryFn: () => httpClient.getLessons(),
    ...options,
  });
}

export function useLessonRequestsQuery(
  options?: Omit<UseQueryOptions<ApiLessonRequest[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.lessonRequests,
    queryFn: () => httpClient.getLessonRequests(),
    ...options,
  });
}

export function useAttendanceEventsQuery(
  options?: Omit<UseQueryOptions<ApiAttendanceEvent[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.attendanceEvents,
    queryFn: () => httpClient.getAttendanceEvents(),
    ...options,
  });
}

export function useLessonReportsQuery(
  options?: Omit<UseQueryOptions<ApiLessonReport[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.lessonReports,
    queryFn: () => httpClient.getLessonReports(),
    ...options,
  });
}

export function useContractsQuery(
  options?: Omit<UseQueryOptions<ApiContract[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.contracts,
    queryFn: () => httpClient.getContracts(),
    ...options,
  });
}

export function useContractDetailQuery(
  contractId: string | undefined,
  options?: Omit<UseQueryOptions<ApiContractDetail>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: contractId ? queryKeys.contract(contractId) : ['contract', 'missing'],
    queryFn: () => httpClient.getContract(contractId!),
    enabled: Boolean(contractId),
    ...options,
  });
}

export function useRespondToRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      rejectionReason,
    }: {
      requestId: string;
      action: 'ACCEPT' | 'REJECT';
      rejectionReason?: string;
    }) => httpClient.respondToRequest(requestId, { action, rejectionReason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.lessonRequests }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contracts }),
      ]);
    },
  });
}

export function useContractsInvalidate() {
  const queryClient = useQueryClient();
  return async (contractId?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.contracts });
    if (contractId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contract(contractId) });
    }
  };
}

export function useChatRoomsQuery(
  options?: Omit<UseQueryOptions<ApiChatRoom[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.chatRooms,
    queryFn: () => httpClient.getChatRooms(),
    ...options,
  });
}

export function useChatMessagesQuery(
  roomId: string | undefined,
  options?: Omit<UseQueryOptions<ApiChatMessageList>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery({
    queryKey: roomId ? queryKeys.chatMessages(roomId) : ['chat-messages', 'missing'],
    queryFn: () => httpClient.getChatMessages(roomId!),
    enabled: Boolean(roomId),
    ...options,
  });
}

export function useUnreadCountQuery(
  options?: Omit<UseQueryOptions<number>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => httpClient.getUnreadCount(),
    ...options,
  });
}
