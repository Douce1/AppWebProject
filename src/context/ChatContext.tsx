import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { apiClient } from '../api/apiClient';
import { ApiChatMessage, ApiChatRoom } from '../api/types';
import { ChatMessagePayload, chatSocket } from '../services/chatSocket';
import { getAccessToken } from '../store/authStore';

// ---- Context Type ----

interface ChatContextType {
    chatRooms: ApiChatRoom[];
    getMessages: (roomId: string) => ApiChatMessage[];
    sendMessage: (roomId: string, text: string) => void;
    markAsRead: (roomId: string) => void;
    unreadCount: number;
    /** 안읽은 메시지 목록 (알림센터용) */
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

// ---- Provider ----

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [chatRooms, setChatRooms] = useState<ApiChatRoom[]>([]);
    const [messagesMap, setMessagesMap] = useState<Record<string, ApiChatMessage[]>>({});
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const myUserIdRef = useRef<string | null>(null);

    // 초기 데이터 로드
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                // Fetch my user profile to know my userId
                const profile = await apiClient.getInstructorProfile().catch(() => null);
                if (mounted && profile) {
                    myUserIdRef.current = profile.userId;
                }

                const rooms = await apiClient.getChatRooms();
                if (!mounted) return;
                setChatRooms(rooms);

                // 각 방의 메시지도 미리 로드
                const msgEntries: Record<string, ApiChatMessage[]> = {};
                for (const room of rooms) {
                    const msgs = await apiClient.getChatMessages(room.roomId);
                    if (!mounted) return;
                    // Inject real isMine by comparing senderUserId with myUserId
                    msgEntries[room.roomId] = msgs.items.map(m => ({
                        ...m,
                        isMine: m.senderUserId === myUserIdRef.current || m.senderUserId === 'me'
                    }));
                }
                setMessagesMap(msgEntries);

                // 서버 기준 전체 unreadCount 조회
                const serverUnread = await apiClient.getUnreadCount();
                if (!mounted) return;
                setUnreadCount(serverUnread);

                // 소켓 연결 (인증 토큰 포함)
                const accessToken = await getAccessToken();
                if (!mounted) return;
                chatSocket.connect(accessToken ?? undefined);
                setIsConnected(true);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[ChatContext] Failed to init chat:', e);
            }
        };

        void init();

        return () => {
            mounted = false;
            chatSocket.disconnect();
            setIsConnected(false);
        };
    }, []);

    // 실시간 메시지 수신
    useEffect(() => {
        const handleMessage = (payload: ChatMessagePayload) => {
            // isMine: senderUserId === 'me' (mock) or 현재 로그인 userId (실서버에서는 senderUserId 비교)
            const isMine = payload.senderUserId === 'me' || payload.senderUserId === myUserIdRef.current;
            const newMsg: ApiChatMessage = {
                messageId: payload.messageId,
                roomId: payload.roomId,
                senderUserId: payload.senderUserId,
                senderName: payload.senderName,
                messageType: payload.messageType,
                content: payload.content,
                sentAt: payload.sentAt,
                isMine,
            };

            // 메시지 맵에 추가
            setMessagesMap(prev => ({
                ...prev,
                [payload.roomId]: [...(prev[payload.roomId] || []), newMsg],
            }));

            // 방 목록 갱신 (lastMessage 객체 형식으로) + 전체 unreadCount 갱신
            setChatRooms(prev => {
                const updated = prev.map(room => {
                    if (room.roomId === payload.roomId) {
                        const nextUnread = isMine ? room.unreadCount : room.unreadCount + 1;
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
                            unreadCount: nextUnread,
                        };
                    }
                    return room;
                });
                // 최신 메시지 방을 맨 위로
                updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                setUnreadCount(updated.reduce((sum, r) => sum + r.unreadCount, 0));
                return updated;
            });
        };

        chatSocket.onMessage(handleMessage);
        return () => {
            chatSocket.offMessage(handleMessage);
        };
    }, []);

    // ---- Actions ----

    const getMessages = useCallback((roomId: string): ApiChatMessage[] => {
        return messagesMap[roomId] || [];
    }, [messagesMap]);

    const sendMessage = useCallback((roomId: string, text: string) => {
        if (!text.trim()) return;

        const roomTitle = chatRooms.find(r => r.roomId === roomId)?.title ?? '채팅방';

        // 메시지 저장 경로는 websocket 하나로 고정한다.
        // HTTP까지 같이 호출하면 backend 저장 로직이 2번 타서 중복 메시지가 생긴다.
        chatSocket.sendMessage(roomId, text, roomTitle);
    }, [chatRooms]);

    const markAsRead = useCallback((roomId: string) => {
        // 로컬 상태 즉시 업데이트
        setMessagesMap(prev => {
            // 백엔드에 isRead 없음 — unreadCount만 0으로 갱신
            return prev;
        });

        setChatRooms(prev => {
            const updated = prev.map(room =>
                room.roomId === roomId ? { ...room, unreadCount: 0 } : room
            );
            setUnreadCount(updated.reduce((sum, r) => sum + r.unreadCount, 0));
            return updated;
        });

        // 소켓 + API 호출
        chatSocket.readRoom(roomId);
        apiClient.markRoomAsRead(roomId).catch(console.error);
    }, []);

    // ---- Computed ----
    // 안읽은 메시지: unreadCount > 0인 방의 메시지만 (읽음 처리된 방은 제외)
    const unreadRoomIds = new Set(chatRooms.filter(r => r.unreadCount > 0).map(r => r.roomId));
    const unreadMessages: ApiChatMessage[] = Object.values(messagesMap)
        .flat()
        .filter(m => !m.isMine && unreadRoomIds.has(m.roomId));

    return (
        <ChatContext.Provider value={{
            chatRooms,
            getMessages,
            sendMessage,
            markAsRead,
            unreadCount,
            unreadMessages,
            isConnected,
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
