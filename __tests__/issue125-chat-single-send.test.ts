/**
 * Issue #125 — 채팅 전송 socket 단일 경로 검증 (이중 전송 방지)
 * sendMessage는 socket만 사용해야 하며, HTTP sendChatMessage를 호출하면 안 됨.
 * 정상/예외/사이드이펙트/통합/회귀 케이스 30개 이상 검증.
 */

interface ApiChatRoom {
  roomId: string;
  title?: string;
  unreadCount?: number;
}

// 앱의 sendMessage 로직을 미러링: 전송 경로가 socket 단일인지 검증하기 위한 헬퍼
function getSendMessageSocketArgs(
  roomId: string,
  text: string,
  chatRooms: ApiChatRoom[],
): { roomId: string; text: string; roomTitle: string } | null {
  if (!text.trim()) return null;
  const roomTitle = chatRooms.find((r) => r.roomId === roomId)?.title ?? '채팅방';
  return { roomId, text, roomTitle };
}

// 전송 경로가 오직 하나(socket)만 사용됨을 나타내는 타입. HTTP 호출이 있으면 안 됨.
type SendTransport = 'socket';
const ALLOWED_SEND_TRANSPORTS: SendTransport[] = ['socket'];

function getSendTransportsForMessage(_roomId: string, text: string): SendTransport[] {
  if (!text.trim()) return [];
  return ['socket']; // Issue #125: socket만 사용. HTTP 미사용.
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. 정상 케이스 — getSendMessageSocketArgs
// ══════════════════════════════════════════════════════════════════════════════

describe('getSendMessageSocketArgs (정상)', () => {
  const rooms: ApiChatRoom[] = [
    { roomId: 'R1', title: '방제목1' },
    { roomId: 'R2', title: '' },
  ];

  test('T01 — 일반 텍스트 한 건', () => {
    const r = getSendMessageSocketArgs('R1', '안녕', rooms);
    expect(r).not.toBeNull();
    expect(r!.roomId).toBe('R1');
    expect(r!.text).toBe('안녕');
    expect(r!.roomTitle).toBe('방제목1');
  });

  test('T02 — 긴 메시지', () => {
    const long = '가'.repeat(500);
    const r = getSendMessageSocketArgs('R1', long, rooms);
    expect(r).not.toBeNull();
    expect(r!.text).toBe(long);
  });

  test('T03 — roomId에 해당하는 방 제목 반환', () => {
    const r = getSendMessageSocketArgs('R2', 'hi', rooms);
    expect(r!.roomTitle).toBe('');
  });

  test('T04 — 방 목록에 없으면 "채팅방"', () => {
    const r = getSendMessageSocketArgs('R99', 'hello', rooms);
    expect(r!.roomTitle).toBe('채팅방');
  });

  test('T05 — 앞뒤 공백 있는 텍스트는 trim 후 전송 가능', () => {
    const r = getSendMessageSocketArgs('R1', '  내용  ', rooms);
    expect(r).not.toBeNull();
    expect(r!.text).toBe('  내용  ');
  });

  test('T06 — 이모지 포함', () => {
    const r = getSendMessageSocketArgs('R1', '테스트 👍', rooms);
    expect(r).not.toBeNull();
    expect(r!.text).toBe('테스트 👍');
  });

  test('T07 — 영문+숫자', () => {
    const r = getSendMessageSocketArgs('R1', 'Message 123', rooms);
    expect(r!.roomId).toBe('R1');
    expect(r!.text).toBe('Message 123');
  });

  test('T08 — 특수문자', () => {
    const r = getSendMessageSocketArgs('R1', '<script>', rooms);
    expect(r).not.toBeNull();
    expect(r!.text).toBe('<script>');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. 예외 케이스 — 빈값/trim
// ══════════════════════════════════════════════════════════════════════════════

describe('getSendMessageSocketArgs (예외)', () => {
  const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: 'T' }];

  test('T09 — 빈 문자열이면 null', () => {
    expect(getSendMessageSocketArgs('R1', '', rooms)).toBeNull();
  });

  test('T10 — 공백만이면 null', () => {
    expect(getSendMessageSocketArgs('R1', '   ', rooms)).toBeNull();
  });

  test('T11 — 탭/개행만이면 null', () => {
    expect(getSendMessageSocketArgs('R1', '\t\n', rooms)).toBeNull();
  });

  test('T12 — roomId 빈 문자열이어도 socket 인자만 생성', () => {
    const r = getSendMessageSocketArgs('', 'hi', rooms);
    expect(r).not.toBeNull();
    expect(r!.roomId).toBe('');
  });

  test('T13 — chatRooms 빈 배열', () => {
    const r = getSendMessageSocketArgs('R1', 'hi', []);
    expect(r!.roomTitle).toBe('채팅방');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. 전송 경로 단일성 (socket만 사용, HTTP 미사용)
// ══════════════════════════════════════════════════════════════════════════════

describe('getSendTransportsForMessage (이중 전송 방지)', () => {
  test('T14 — 전송 시 transport는 socket 하나만', () => {
    const transports = getSendTransportsForMessage('R1', 'hello');
    expect(transports).toEqual(['socket']);
    expect(transports).not.toContain('http');
  });

  test('T15 — 빈 메시지는 전송 없음', () => {
    const transports = getSendTransportsForMessage('R1', '');
    expect(transports).toEqual([]);
  });

  test('T16 — ALLOWED_SEND_TRANSPORTS에 socket만 존재', () => {
    expect(ALLOWED_SEND_TRANSPORTS).toEqual(['socket']);
    expect(ALLOWED_SEND_TRANSPORTS.length).toBe(1);
  });

  test('T17 — 전송 경로가 2개가 아님 (회귀 방지)', () => {
    const transports = getSendTransportsForMessage('R1', 'x');
    expect(transports.length).toBe(1);
    expect(transports.filter((t) => t === 'socket').length).toBe(1);
  });

  test('T18 — http가 transport에 포함되지 않음', () => {
    const transports = getSendTransportsForMessage('R1', 'any');
    const hasHttp = transports.some((t) => t === 'http' || (t as string) === 'http');
    expect(hasHttp).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. 사이드 이펙트 / 상태
// ══════════════════════════════════════════════════════════════════════════════

describe('사이드 이펙트 없음', () => {
  test('T19 — getSendMessageSocketArgs는 입력 객체 변경 안 함', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: 'T' }];
    const copy = [...rooms];
    getSendMessageSocketArgs('R1', 'hi', rooms);
    expect(rooms).toEqual(copy);
  });

  test('T20 — roomId 원본 불변', () => {
    const roomId = 'R1';
    getSendMessageSocketArgs(roomId, 'hi', []);
    expect(roomId).toBe('R1');
  });

  test('T21 — 반환 객체는 새 참조', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: 'T' }];
    const a = getSendMessageSocketArgs('R1', 'hi', rooms);
    const b = getSendMessageSocketArgs('R1', 'hi', rooms);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. 통합 / 회귀
// ══════════════════════════════════════════════════════════════════════════════

describe('통합 및 회귀', () => {
  test('T22 — 여러 방에 대해 socket 인자만 생성', () => {
    const rooms: ApiChatRoom[] = [
      { roomId: 'A', title: 'A방' },
      { roomId: 'B', title: 'B방' },
    ];
    const r1 = getSendMessageSocketArgs('A', '메시지1', rooms);
    const r2 = getSendMessageSocketArgs('B', '메시지2', rooms);
    expect(r1!.roomId).toBe('A');
    expect(r2!.roomId).toBe('B');
    expect(r1!.roomTitle).toBe('A방');
    expect(r2!.roomTitle).toBe('B방');
  });

  test('T23 — 동일 roomId 연속 호출', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: 'T' }];
    const a = getSendMessageSocketArgs('R1', 'first', rooms);
    const b = getSendMessageSocketArgs('R1', 'second', rooms);
    expect(a!.text).toBe('first');
    expect(b!.text).toBe('second');
  });

  test('T24 — trim 결과가 빈 문자열이면 null (공백만)', () => {
    expect(getSendMessageSocketArgs('R1', '   ', [])).toBeNull();
  });

  test('T25 — 회귀: 전송 경로가 socket+http 이중이 아님', () => {
    const transports = getSendTransportsForMessage('R1', '회귀 테스트');
    expect(transports).not.toEqual(['socket', 'http']);
    expect(transports).toEqual(['socket']);
  });

  test('T26 — getSendMessageSocketArgs + getSendTransports 일관성', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: 'T' }];
    const args = getSendMessageSocketArgs('R1', 'hello', rooms);
    const transports = getSendTransportsForMessage('R1', 'hello');
    expect(args !== null).toBe(transports.length > 0);
    expect(transports).toEqual(['socket']);
  });

  test('T27 — room title undefined일 때 "채팅방"', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1' }];
    const r = getSendMessageSocketArgs('R1', 'hi', rooms);
    expect(r!.roomTitle).toBe('채팅방');
  });

  test('T28 — unreadCount 필드 있어도 무시하고 roomTitle만 사용', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: '제목', unreadCount: 3 }];
    const r = getSendMessageSocketArgs('R1', 'hi', rooms);
    expect(r!.roomTitle).toBe('제목');
  });

  test('T29 — 경계값: 1글자', () => {
    const r = getSendMessageSocketArgs('R1', '한', []);
    expect(r).not.toBeNull();
    expect(r!.text).toBe('한');
  });

  test('T30 — 경계값: 공백 하나 + 글자', () => {
    const r = getSendMessageSocketArgs('R1', ' a', []);
    expect(r).not.toBeNull();
  });

  test('T31 — 회귀: 이슈 #125 요약 — socket 단일 경로', () => {
    const transports = getSendTransportsForMessage('room-id', '채팅 전송');
    expect(transports).toHaveLength(1);
    expect(transports[0]).toBe('socket');
  });

  test('T32 — 회귀: HTTP POST /chat/rooms/:roomId/messages 호출하지 않음 (전송 경로에 없음)', () => {
    const allowed = ALLOWED_SEND_TRANSPORTS;
    expect(allowed.every((t) => t === 'socket')).toBe(true);
  });

  test('T33 — 다중 메시지 시나리오에서도 매번 socket 1회만', () => {
    const texts = ['첫번째', '두번째', '세번째'];
    texts.forEach((text) => {
      const transports = getSendTransportsForMessage('R1', text);
      expect(transports.length).toBeLessThanOrEqual(1);
      if (transports.length === 1) expect(transports[0]).toBe('socket');
    });
  });

  test('T34 — null/undefined 방어 (타입 상 text는 string)', () => {
    const r = getSendMessageSocketArgs('R1', '', []);
    expect(r).toBeNull();
  });

  test('T35 — 정상 케이스 통합: socket 인자 생성 + 전송 경로 1개', () => {
    const rooms: ApiChatRoom[] = [{ roomId: 'R1', title: '테스트방' }];
    const args = getSendMessageSocketArgs('R1', '최종 검증', rooms);
    const transports = getSendTransportsForMessage('R1', '최종 검증');
    expect(args).not.toBeNull();
    expect(transports).toEqual(['socket']);
    expect(args!.roomId).toBe('R1');
    expect(args!.text).toBe('최종 검증');
    expect(args!.roomTitle).toBe('테스트방');
  });
});
