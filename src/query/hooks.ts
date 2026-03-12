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
  ApiInstructorProfile,
  ApiLesson,
  ApiLessonReport,
  ApiLessonRequest,
  ApiSignatureAsset,
  SubmitContractSignaturePayload,
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

export function useInstructorProfileQuery(
  options?: Omit<UseQueryOptions<ApiInstructorProfile>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.instructorProfile,
    queryFn: () => httpClient.getInstructorProfile(),
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

export function useReauthContractMutation() {
  return useMutation({
    mutationFn: (contractId: string) => httpClient.reauthContract(contractId),
  });
}

export function useSignContractMutation(contractId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitContractSignaturePayload) =>
      httpClient.signContract(contractId!, payload),
    onSuccess: async (updated: ApiContractDetail) => {
      if (!contractId) return;
      queryClient.setQueryData(queryKeys.contract(contractId), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.contract(contractId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contracts }),
      ]);
    },
  });
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

export function useSignatureAssetQuery(
  options?: Omit<UseQueryOptions<ApiSignatureAsset | null>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<ApiSignatureAsset | null>({
    queryKey: queryKeys.signatureAsset,
    queryFn: async () => {
      try {
        return await httpClient.getSignatureAsset();
      } catch (e) {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }
    },
    ...options,
  });
}

export function useUploadSignatureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileUri: string) => httpClient.uploadSignatureAsset(fileUri),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.signatureAsset });
    },
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

export function useUpdateInstructorProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      payload,
      photoUri,
    }: {
      payload: Parameters<typeof httpClient.updateInstructorProfile>[0];
      photoUri?: string;
    }) => {
      const result = await httpClient.updateInstructorProfile(payload);
      if (photoUri) {
        await httpClient.uploadProfilePhoto(photoUri);
      }
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.instructorProfile });
    },
  });
}
