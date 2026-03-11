import {
    useQueries,
    useQueryClient,
} from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiChatMessage, ApiChatRoom } from '../api/types';
import { apiClient } from '../api/apiClient';
import {
    useChatRoomsQuery,
    useInstructorProfileQuery,
    useUnreadCountQuery,
} from '../query/hooks';
import { queryKeys } from '../query/queryKeys';
import { ChatMessagePayload, chatSocket } from '../services/chatSocket';
import { getAccessToken } from '../store/authStore';

interface ChatContextType {
    chatRooms: ApiChatRoom[];
    getMessages: (roomId: string) => ApiChatMessage[];
    sendMessage: (roomId: string, text: string) => void;
    markAsRead: (roomId: string) => void;
    unreadCount: number;
    unreadMessages: ApiChatMessage[];
    isConnected: boolean;
}

const ChatContext = createContext<ChatContextType>({
    chatRooms: [],
    getMessages: () => [],
    sendMessage: () => { },
    markAsRead: () => { },
    unreadCount: 0,
    unreadMessages: [],
    isConnected: false,
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const instructorProfileQuery = useInstructorProfileQuery();
    const chatRoomsQuery = useChatRoomsQuery();
    const unreadCountQuery = useUnreadCountQuery();
    const [isConnected, setIsConnected] = useState(false);
    const myUserIdRef = useRef<string | null>(null);

    const chatRooms = chatRoomsQuery.data ?? [];
    const unreadCount = unreadCountQuery.data ?? 0;

    useEffect(() => {
        if (instructorProfileQuery.data?.userId) {
            myUserIdRef.current = instructorProfileQuery.data.userId;
        }
    }, [instructorProfileQuery.data?.userId]);

    const messageQueries = useQueries({
        queries: chatRooms.map((room) => ({
            queryKey: queryKeys.chatMessages(room.roomId),
            queryFn: () => apiClient.getChatMessages(room.roomId),
            staleTime: 30 * 1000,
        })),
    });

    const messagesMap = useMemo(() => {
        const entries: Record<string, ApiChatMessage[]> = {};
        chatRooms.forEach((room, index) => {
            const items = messageQueries[index]?.data?.items ?? [];
            entries[room.roomId] = items.map((message) => ({
                ...message,
                isMine:
                    message.senderUserId === 'me' ||
                    message.senderUserId === myUserIdRef.current,
            }));
        });
        return entries;
    }, [chatRooms, messageQueries]);

    useEffect(() => {
        let mounted = true;

        const connectSocket = async () => {
            try {
                const accessToken = await getAccessToken();
                if (!mounted) return;
                chatSocket.connect(accessToken ?? undefined);
                setIsConnected(true);
            } catch (error) {
                console.error('[ChatContext] Failed to connect socket:', error);
            }
        };

        void connectSocket();

        return () => {
            mounted = false;
            chatSocket.disconnect();
            setIsConnected(false);
        };
    }, []);

    useEffect(() => {
        const handleMessage = (payload: ChatMessagePayload) => {
            const isMine =
                payload.senderUserId === 'me' ||
                payload.senderUserId === myUserIdRef.current;
            const newMessage: ApiChatMessage = {
                messageId: payload.messageId,
                roomId: payload.roomId,
                senderUserId: payload.senderUserId,
                senderName: payload.senderName,
                messageType: payload.messageType,
                content: payload.content,
                sentAt: payload.sentAt,
                isMine,
            };

            queryClient.setQueryData(
                queryKeys.chatMessages(payload.roomId),
                (prev: { items: ApiChatMessage[]; nextCursor: string | null } | undefined) => ({
                    items: [...(prev?.items ?? []), newMessage],
                    nextCursor: prev?.nextCursor ?? null,
                }),
            );

            queryClient.setQueryData<ApiChatRoom[]>(queryKeys.chatRooms, (prev = []) => {
                const nextRooms = prev.map((room) => {
                    if (room.roomId !== payload.roomId) return room;
                    return {
                        ...room,
                        lastMessage: {
                            messageId: payload.messageId,
                            messageType: payload.messageType,
                            content: payload.content,
                            senderUserId: payload.senderUserId,
                            sentAt: payload.sentAt,
                        },
                        updatedAt: payload.sentAt,
                        unreadCount: isMine ? room.unreadCount : room.unreadCount + 1,
                    };
                });

                nextRooms.sort(
                    (a, b) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime(),
                );
                return nextRooms;
            });

            queryClient.setQueryData<number>(queryKeys.unreadCount, (prev = 0) => (
                isMine ? prev : prev + 1
            ));
        };

        chatSocket.onMessage(handleMessage);
        return () => {
            chatSocket.offMessage(handleMessage);
        };
    }, [queryClient]);

    const getMessages = useCallback((roomId: string): ApiChatMessage[] => {
        return messagesMap[roomId] || [];
    }, [messagesMap]);

    const sendMessage = useCallback((roomId: string, text: string) => {
        if (!text.trim()) return;
        const roomTitle = chatRooms.find((room) => room.roomId === roomId)?.title ?? '채팅방';
        chatSocket.sendMessage(roomId, text, roomTitle);
    }, [chatRooms]);

    const markAsRead = useCallback((roomId: string) => {
        queryClient.setQueryData<ApiChatRoom[]>(queryKeys.chatRooms, (prev = []) =>
            prev.map((room) =>
                room.roomId === roomId ? { ...room, unreadCount: 0 } : room,
            ),
        );
        queryClient.setQueryData<number>(queryKeys.unreadCount, (prev = 0) => {
            const roomUnreadCount = chatRooms.find((room) => room.roomId === roomId)?.unreadCount ?? 0;
            return Math.max(0, prev - roomUnreadCount);
        });

        chatSocket.readRoom(roomId);
        apiClient.markRoomAsRead(roomId).catch(console.error);
    }, [chatRooms, queryClient]);

    const unreadRoomIds = new Set(chatRooms.filter((room) => room.unreadCount > 0).map((room) => room.roomId));
    const unreadMessages = Object.values(messagesMap)
        .flat()
        .filter((message) => !message.isMine && unreadRoomIds.has(message.roomId));

    return (
        <ChatContext.Provider
            value={{
                chatRooms,
                getMessages,
                sendMessage,
                markAsRead,
                unreadCount,
                unreadMessages,
                isConnected,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
