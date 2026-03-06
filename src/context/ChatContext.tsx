import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient';
import { ApiChatMessage, ApiChatRoom } from '../api/types';
import { ChatMessagePayload, chatSocket } from '../services/chatSocket';

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

    // 초기 데이터 로드
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                const rooms = await apiClient.getChatRooms();
                if (!mounted) return;
                setChatRooms(rooms);

                // 각 방의 메시지도 미리 로드
                const msgEntries: Record<string, ApiChatMessage[]> = {};
                for (const room of rooms) {
                    const msgs = await apiClient.getChatMessages(room.roomId);
                    if (!mounted) return;
                    msgEntries[room.roomId] = msgs;
                }
                setMessagesMap(msgEntries);
            } catch (e) {
                console.error('[ChatContext] Failed to load initial data:', e);
            }
        };

        init();

        // 소켓 연결
        chatSocket.connect();
        setIsConnected(true);

        return () => {
            mounted = false;
            chatSocket.disconnect();
            setIsConnected(false);
        };
    }, []);

    // 실시간 메시지 수신
    useEffect(() => {
        const handleMessage = (payload: ChatMessagePayload) => {
            const newMsg: ApiChatMessage = {
                messageId: payload.messageId,
                roomId: payload.roomId,
                senderId: payload.senderId,
                senderName: payload.senderName,
                text: payload.text,
                createdAt: payload.createdAt,
                isRead: false,
                isMine: payload.senderId === 'me',
            };

            // 메시지 맵에 추가
            setMessagesMap(prev => ({
                ...prev,
                [payload.roomId]: [...(prev[payload.roomId] || []), newMsg],
            }));

            // 방 목록 갱신
            setChatRooms(prev => {
                const updated = prev.map(room => {
                    if (room.roomId === payload.roomId) {
                        return {
                            ...room,
                            lastMessage: payload.text,
                            lastMessageAt: payload.createdAt,
                            unreadCount: payload.senderId === 'me' ? room.unreadCount : room.unreadCount + 1,
                        };
                    }
                    return room;
                });
                // 최신 메시지 방을 맨 위로
                updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
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

        const roomName = chatRooms.find(r => r.roomId === roomId)?.name || '채팅방';

        // 소켓으로 전송 (mock에서는 즉시 echo 콜백 발생)
        chatSocket.sendMessage(roomId, text, roomName);

        // API에도 저장 (mock에서는 즉시 반환)
        apiClient.sendChatMessage(roomId, text).catch(console.error);
    }, [chatRooms]);

    const markAsRead = useCallback((roomId: string) => {
        // 로컬 상태 즉시 업데이트
        setMessagesMap(prev => {
            const msgs = prev[roomId];
            if (!msgs) return prev;
            const hasUnread = msgs.some(m => !m.isMine && !m.isRead);
            if (!hasUnread) return prev;
            return {
                ...prev,
                [roomId]: msgs.map(m => (!m.isMine && !m.isRead) ? { ...m, isRead: true } : m),
            };
        });

        setChatRooms(prev =>
            prev.map(room =>
                room.roomId === roomId ? { ...room, unreadCount: 0 } : room
            )
        );

        // 소켓 + API 호출
        chatSocket.readRoom(roomId);
        apiClient.markRoomAsRead(roomId).catch(console.error);
    }, []);

    // ---- Computed ----

    const unreadCount = chatRooms.reduce((sum, r) => sum + r.unreadCount, 0);

    const unreadMessages: ApiChatMessage[] = Object.values(messagesMap)
        .flat()
        .filter(m => !m.isMine && !m.isRead);

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
