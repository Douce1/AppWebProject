// chatSocket.ts — Socket.io client wrapper with mock fallback
// Mock 모드에서는 소켓 연결 없이 동작합니다.
// USE_MOCK = false 시 실제 소켓 서버에 연결합니다.

// Metro 호환: CJS require 사용
const socketModule = require('socket.io-client');
const io = socketModule.io || socketModule.default?.io || socketModule;

import { API_BASE_URL } from '../api/httpClient';

const USE_MOCK = false;
const SOCKET_URL = `${API_BASE_URL}/chat`; // /chat 네임스페이스 필수

// ---- Types ----

export interface ChatMessagePayload {
    messageId: string;
    roomId: string;
    senderUserId: string;    // senderId → senderUserId
    senderName: string | null;
    messageType: 'TEXT' | 'SYSTEM';
    content: string;         // text → content
    sentAt: string;          // createdAt → sentAt
}

export interface MessageReadPayload {
    roomId: string;
    userId: string;
    readAt: string;
}

export interface ChatErrorPayload {
    code: string;
    message: string;
    details?: any;
}

type MessageCallback = (payload: ChatMessagePayload) => void;
type MessageReadCallback = (payload: MessageReadPayload) => void;
type ErrorCallback = (payload: ChatErrorPayload) => void;
type VoidCallback = () => void;

// ---- Mock Socket ----

class MockChatSocket {
    private messageCallbacks: MessageCallback[] = [];

    connect(_token?: string) {
        console.log('[MockSocket] Connected (mock mode)');
    }

    disconnect() {
        console.log('[MockSocket] Disconnected (mock mode)');
    }

    joinRoom(roomId: string) {
        console.log(`[MockSocket] Joined room: ${roomId}`);
    }

    sendMessage(roomId: string, content: string, senderName: string = '나') {
        const payload: ChatMessagePayload = {
            messageId: Date.now().toString(),
            roomId,
            senderUserId: 'me',
            senderName,
            messageType: 'TEXT',
            content,
            sentAt: new Date().toISOString(),
        };
        // 즉시 콜백 호출 (echo)
        setTimeout(() => {
            this.messageCallbacks.forEach(cb => cb(payload));
        }, 50);
        return payload;
    }

    readRoom(roomId: string) {
        console.log(`[MockSocket] Read room: ${roomId}`);
    }

    onMessage(cb: MessageCallback) {
        this.messageCallbacks.push(cb);
    }

    offMessage(cb?: MessageCallback) {
        if (cb) {
            this.messageCallbacks = this.messageCallbacks.filter(c => c !== cb);
        } else {
            this.messageCallbacks = [];
        }
    }

    onMessageRead(_cb: MessageReadCallback) {
        // Mock: no-op
    }

    onError(_cb: ErrorCallback) {
        // Mock: no-op
    }

    onReconnect(_cb: VoidCallback) {
        // Mock: no-op
    }

    get isConnected() {
        return true;
    }
}

// ---- Real Socket (socket.io-client 사용) ----

class RealChatSocket {
    private socket: any = null;
    private messageCallbacks: MessageCallback[] = [];
    private messageReadCallbacks: MessageReadCallback[] = [];
    private errorCallbacks: ErrorCallback[] = [];

    connect(token?: string) {
        // 기존 연결 정리
        if (this.socket) {
            this.disconnect();
        }

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected to server');
        });

        this.socket.on('disconnect', (reason: string) => {
            console.log(`[Socket] Disconnected: ${reason}`);
        });

        this.socket.on('chat_message', (payload: ChatMessagePayload) => {
            this.messageCallbacks.forEach((cb) => cb(payload));
        });

        this.socket.on('message_read', (payload: MessageReadPayload) => {
            this.messageReadCallbacks.forEach((cb) => cb(payload));
        });

        this.socket.on('chat_error', (payload: ChatErrorPayload) => {
            // eslint-disable-next-line no-console
            console.warn('[Socket] chat_error', payload);
            this.errorCallbacks.forEach((cb) => cb(payload));
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    joinRoom(roomId: string) {
        this.socket?.emit('join_room', { roomId });
    }

    sendMessage(roomId: string, content: string) {
        this.socket?.emit('send_message', { roomId, content });
    }

    readRoom(roomId: string) {
        this.socket?.emit('read_room', { roomId });
    }

    onMessage(cb: MessageCallback) {
        this.messageCallbacks.push(cb);
    }

    offMessage(cb?: MessageCallback) {
        if (cb) {
            this.messageCallbacks = this.messageCallbacks.filter((c) => c !== cb);
        } else {
            this.messageCallbacks = [];
        }
    }

    onMessageRead(cb: MessageReadCallback) {
        this.messageReadCallbacks.push(cb);
    }

    onError(cb: ErrorCallback) {
        this.errorCallbacks.push(cb);
    }

    onReconnect(cb: VoidCallback) {
        this.socket?.io.on('reconnect', cb);
    }

    get isConnected() {
        return this.socket?.connected ?? false;
    }
}

// ---- Export singleton ----

export const chatSocket = USE_MOCK ? new MockChatSocket() : new RealChatSocket();
