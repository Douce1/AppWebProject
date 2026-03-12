export const queryKeys = {
  lessons: ['lessons'] as const,
  lessonRequests: ['lesson-requests'] as const,
  contracts: ['contracts'] as const,
  contract: (contractId: string) => ['contract', contractId] as const,
  chatRooms: ['chat-rooms'] as const,
  chatMessages: (roomId: string) => ['chat-messages', roomId] as const,
  unreadCount: ['chat-unread-count'] as const,
  attendanceEvents: ['attendance-events'] as const,
  lessonReports: ['lesson-reports'] as const,
  instructorProfile: ['instructor-profile'] as const,
  signatureAsset: ['signature-asset'] as const,
} as const;
