/**
 * Issue #201 — 채팅 새 메시지가 재로그인 후에만 보이는 문제
 *
 * 수정 사항:
 * 1. chatSocket: joinedRooms 추적 → 재연결 시 자동 재입장
 * 2. chatSocket: onConnect/offConnect, onDisconnect/offDisconnect 콜백 추가
 * 3. chatSocket: onReconnect/offReconnect 콜백 배열 방식으로 개선
 * 4. ChatContext: 실제 connect/disconnect 이벤트 기반으로 isConnected 동기화
 * 5. ChatContext: 재연결 후 채팅방·미읽음 수 invalidate로 놓친 메시지 반영
 *
 * 정상 / 예외 / 사이드이펙트 / 통합 / 회귀 케이스 20개
 */

// ────────────────────────────────────────────────────────────────────────────
// 테스트용 헬퍼: RealChatSocket 내부 로직을 재현하는 최소 구현
// (실제 socket.io 서버 없이 단위 테스트 가능)
// ────────────────────────────────────────────────────────────────────────────

type VoidCb = () => void;

class TestableChatSocket {
    joinedRooms = new Set<string>();
    wasConnected = false;
    connectCbs: VoidCb[] = [];
    disconnectCbs: VoidCb[] = [];
    reconnectCbs: VoidCb[] = [];
    messageCbs: Array<(p: any) => void> = [];

    /** 실제 connect() 내의 'connect' 이벤트 핸들러 로직을 직접 호출 */
    simulateConnect() {
        const isReconnect = this.wasConnected;
        this.wasConnected = true;
        if (isReconnect) {
            // 재연결 시 joinedRooms에 등록된 모든 방에 join_room emit (여기서는 기록만)
            this.emittedJoins = [...this.joinedRooms];
            this.reconnectCbs.forEach(cb => cb());
        }
        this.connectCbs.forEach(cb => cb());
    }

    /** 실제 disconnect() 내부 로직 */
    simulateDisconnect() {
        this.disconnectCbs.forEach(cb => cb());
        this.joinedRooms.clear();
        this.wasConnected = false;
    }

    emittedJoins: string[] = [];

    joinRoom(roomId: string) {
        this.joinedRooms.add(roomId);
    }

    onConnect(cb: VoidCb) { this.connectCbs.push(cb); }
    offConnect(cb?: VoidCb) {
        if (cb) this.connectCbs = this.connectCbs.filter(c => c !== cb);
        else this.connectCbs = [];
    }

    onDisconnect(cb: VoidCb) { this.disconnectCbs.push(cb); }
    offDisconnect(cb?: VoidCb) {
        if (cb) this.disconnectCbs = this.disconnectCbs.filter(c => c !== cb);
        else this.disconnectCbs = [];
    }

    onReconnect(cb: VoidCb) { this.reconnectCbs.push(cb); }
    offReconnect(cb?: VoidCb) {
        if (cb) this.reconnectCbs = this.reconnectCbs.filter(c => c !== cb);
        else this.reconnectCbs = [];
    }

    onMessage(cb: (p: any) => void) { this.messageCbs.push(cb); }
    offMessage(cb?: (p: any) => void) {
        if (cb) this.messageCbs = this.messageCbs.filter(c => c !== cb);
        else this.messageCbs = [];
    }
}

// ────────────────────────────────────────────────────────────────────────────
// 메시지 수신 핸들러 로직 (ChatContext에서 추출)
// ────────────────────────────────────────────────────────────────────────────

interface Msg {
    messageId: string; roomId: string; senderUserId: string;
    senderName: string | null; messageType: 'TEXT' | 'SYSTEM';
    content: string; sentAt: string; isMine: boolean;
}

interface Room {
    roomId: string; lastMessage: any; updatedAt: string; unreadCount: number;
}

function buildMessageHandler(myUserId: string) {
    const messagesCache: Record<string, Msg[]> = {};
    let roomsCache: Room[] = [];
    let unreadCount = 0;

    const handleMessage = (payload: Omit<Msg, 'isMine'>) => {
        const isMine =
            payload.senderUserId === 'me' ||
            payload.senderUserId === myUserId;
        const newMsg: Msg = { ...payload, isMine };

        // messages cache
        messagesCache[payload.roomId] = [
            ...(messagesCache[payload.roomId] ?? []),
            newMsg,
        ];

        // rooms cache: lastMessage + sort
        roomsCache = roomsCache.map(r =>
            r.roomId !== payload.roomId ? r : {
                ...r,
                lastMessage: { content: payload.content },
                updatedAt: payload.sentAt,
                unreadCount: isMine ? r.unreadCount : r.unreadCount + 1,
            },
        ).sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        // unread count
        if (!isMine) unreadCount += 1;
    };

    return { handleMessage, messagesCache, get roomsCache() { return roomsCache; }, set roomsCache(v) { roomsCache = v; }, get unreadCount() { return unreadCount; } };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. joinedRooms 추적 — 정상 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('joinedRooms 추적 (정상)', () => {
    test('joinRoom 호출 시 방이 추적됨', () => {
        const s = new TestableChatSocket();
        s.joinRoom('room-1');
        expect(s.joinedRooms.has('room-1')).toBe(true);
    });

    test('여러 방 입장 시 모두 추적됨', () => {
        const s = new TestableChatSocket();
        s.joinRoom('room-1');
        s.joinRoom('room-2');
        s.joinRoom('room-3');
        expect(s.joinedRooms.size).toBe(3);
    });

    test('같은 방 중복 입장 시 Set이므로 1개만 유지', () => {
        const s = new TestableChatSocket();
        s.joinRoom('room-1');
        s.joinRoom('room-1');
        expect(s.joinedRooms.size).toBe(1);
    });

    test('disconnect 시 joinedRooms 초기화됨', () => {
        const s = new TestableChatSocket();
        s.joinRoom('room-1');
        s.joinRoom('room-2');
        s.simulateDisconnect();
        expect(s.joinedRooms.size).toBe(0);
    });

    test('disconnect 후 재연결 시 wasConnected 초기화됨', () => {
        const s = new TestableChatSocket();
        s.simulateConnect(); // first connect
        s.simulateDisconnect();
        expect(s.wasConnected).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. 재연결 시 방 자동 재입장 — 핵심 버그 수정
// ════════════════════════════════════════════════════════════════════════════

describe('재연결 시 방 자동 재입장 (핵심 수정)', () => {
    test('최초 연결 시 emittedJoins 없음', () => {
        const s = new TestableChatSocket();
        s.joinRoom('room-1');
        s.simulateConnect(); // first connect
        expect(s.emittedJoins).toHaveLength(0);
    });

    test('재연결 시 joinedRooms에 있는 방이 재입장됨', () => {
        const s = new TestableChatSocket();
        s.joinRoom('room-1');
        s.joinRoom('room-2');
        s.simulateConnect(); // first connect
        s.simulateConnect(); // reconnect
        expect(s.emittedJoins).toContain('room-1');
        expect(s.emittedJoins).toContain('room-2');
    });

    test('재연결 시 reconnectCbs 실행됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onReconnect(cb);
        s.simulateConnect(); // first connect
        s.simulateConnect(); // reconnect
        expect(cb).toHaveBeenCalledTimes(1);
    });

    test('최초 연결 시 reconnectCbs 실행 안됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onReconnect(cb);
        s.simulateConnect(); // first connect only
        expect(cb).not.toHaveBeenCalled();
    });

    test('reconnect 후 connectCbs도 실행됨', () => {
        const s = new TestableChatSocket();
        const connectCb = jest.fn();
        s.onConnect(connectCb);
        s.simulateConnect(); // first
        s.simulateConnect(); // reconnect
        expect(connectCb).toHaveBeenCalledTimes(2);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. onConnect / onDisconnect 콜백 — 정상 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('onConnect / onDisconnect 콜백 (정상)', () => {
    test('connect 시 onConnect 콜백 실행됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onConnect(cb);
        s.simulateConnect();
        expect(cb).toHaveBeenCalledTimes(1);
    });

    test('offConnect 후 connect 시 콜백 실행 안됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onConnect(cb);
        s.offConnect(cb);
        s.simulateConnect();
        expect(cb).not.toHaveBeenCalled();
    });

    test('disconnect 시 onDisconnect 콜백 실행됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onDisconnect(cb);
        s.simulateDisconnect();
        expect(cb).toHaveBeenCalledTimes(1);
    });

    test('offDisconnect 후 disconnect 시 콜백 실행 안됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onDisconnect(cb);
        s.offDisconnect(cb);
        s.simulateDisconnect();
        expect(cb).not.toHaveBeenCalled();
    });

    test('offReconnect 후 reconnect 시 콜백 실행 안됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onReconnect(cb);
        s.offReconnect(cb);
        s.simulateConnect(); // first
        s.simulateConnect(); // reconnect
        expect(cb).not.toHaveBeenCalled();
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. 메시지 수신 핸들러 — ChatContext 로직 검증
// ════════════════════════════════════════════════════════════════════════════

describe('메시지 수신 핸들러 (ChatContext 로직)', () => {
    const makePayload = (overrides: Partial<Omit<Msg, 'isMine'>> = {}): Omit<Msg, 'isMine'> => ({
        messageId: 'msg-1',
        roomId: 'room-1',
        senderUserId: 'user-abc',
        senderName: '상대방',
        messageType: 'TEXT',
        content: '안녕하세요',
        sentAt: '2026-01-01T10:00:00Z',
        ...overrides,
    });

    test('타인 메시지 수신 시 isMine=false로 캐시에 추가됨', () => {
        const { handleMessage, messagesCache } = buildMessageHandler('user-me');
        messagesCache['room-1'] = [];
        handleMessage(makePayload({ senderUserId: 'user-other' }));
        expect(messagesCache['room-1'][0].isMine).toBe(false);
    });

    test('내 메시지 수신 시 isMine=true로 캐시에 추가됨', () => {
        const { handleMessage, messagesCache } = buildMessageHandler('user-me');
        messagesCache['room-1'] = [];
        handleMessage(makePayload({ senderUserId: 'user-me' }));
        expect(messagesCache['room-1'][0].isMine).toBe(true);
    });

    test('타인 메시지 수신 시 unreadCount 증가', () => {
        const ctx = buildMessageHandler('user-me');
        ctx.roomsCache = [{ roomId: 'room-1', lastMessage: null, updatedAt: '2026-01-01T09:00:00Z', unreadCount: 0 }];
        ctx.handleMessage(makePayload({ senderUserId: 'user-other' }));
        expect(ctx.unreadCount).toBe(1);
    });

    test('내 메시지 수신 시 unreadCount 증가 안됨', () => {
        const ctx = buildMessageHandler('user-me');
        ctx.roomsCache = [{ roomId: 'room-1', lastMessage: null, updatedAt: '2026-01-01T09:00:00Z', unreadCount: 0 }];
        ctx.handleMessage(makePayload({ senderUserId: 'user-me' }));
        expect(ctx.unreadCount).toBe(0);
    });

    test('새 메시지 수신 시 채팅방 목록이 최신순으로 정렬됨', () => {
        const ctx = buildMessageHandler('user-me');
        ctx.roomsCache = [
            { roomId: 'room-1', lastMessage: null, updatedAt: '2026-01-01T08:00:00Z', unreadCount: 0 },
            { roomId: 'room-2', lastMessage: null, updatedAt: '2026-01-01T09:00:00Z', unreadCount: 0 },
        ];
        // room-1에 새 메시지 → room-1이 가장 최근으로 올라와야 함
        ctx.handleMessage(makePayload({ roomId: 'room-1', sentAt: '2026-01-01T10:00:00Z' }));
        expect(ctx.roomsCache[0].roomId).toBe('room-1');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. 회귀 케이스
// ════════════════════════════════════════════════════════════════════════════

describe('회귀 케이스 (기존 동작 보장)', () => {
    test('offConnect(cb) 다른 콜백은 유지됨', () => {
        const s = new TestableChatSocket();
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        s.onConnect(cb1);
        s.onConnect(cb2);
        s.offConnect(cb1);
        s.simulateConnect();
        expect(cb1).not.toHaveBeenCalled();
        expect(cb2).toHaveBeenCalledTimes(1);
    });

    test('offConnect() 인자 없으면 전체 제거됨', () => {
        const s = new TestableChatSocket();
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        s.onConnect(cb1);
        s.onConnect(cb2);
        s.offConnect();
        s.simulateConnect();
        expect(cb1).not.toHaveBeenCalled();
        expect(cb2).not.toHaveBeenCalled();
    });

    test('재연결 3회 시 reconnectCbs가 3회 실행됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onReconnect(cb);
        s.simulateConnect(); // first
        s.simulateConnect(); // reconnect 1
        s.simulateConnect(); // reconnect 2
        s.simulateConnect(); // reconnect 3
        expect(cb).toHaveBeenCalledTimes(3);
    });

    test('disconnect 후 재연결(wasConnected=false)이면 reconnectCbs 실행 안됨', () => {
        const s = new TestableChatSocket();
        const cb = jest.fn();
        s.onReconnect(cb);
        s.simulateConnect(); // first connect
        s.simulateDisconnect(); // explicit disconnect → wasConnected = false
        s.simulateConnect(); // next connect after explicit disconnect → treated as first connect
        expect(cb).not.toHaveBeenCalled();
    });

    test('onMessage/offMessage는 연결 상태와 독립적으로 동작', () => {
        const s = new TestableChatSocket();
        const msgCb = jest.fn();
        s.onMessage(msgCb);
        s.offMessage(msgCb);
        // 메시지를 직접 dispatch
        s.messageCbs.forEach(cb => cb({ content: 'test' }));
        expect(msgCb).not.toHaveBeenCalled();
    });
});
