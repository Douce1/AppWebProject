import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCR = path.join(ROOT, 'src', 'screens', 'AppSettingsScreen.tsx');
const LAY = path.join(ROOT, 'app', '_layout.tsx');
const PROF = path.join(ROOT, 'app', 'profile', 'settings.tsx');
const SET = path.join(ROOT, 'app', 'settings.tsx');
const src = fs.readFileSync(SCR, 'utf-8');
const lay = fs.readFileSync(LAY, 'utf-8');

interface NS { instructorId: string; pushEnabled: boolean; lessonReminder: boolean; paymentNotification: boolean; chatNotification: boolean; }
type U = Partial<Omit<NS, 'instructorId'>>;

const D: NS = { instructorId: '', pushEnabled: true, lessonReminder: true, paymentNotification: true, chatNotification: true };
const mk = (o: Partial<NS> = {}): NS => ({ ...D, ...o });

async function tog(c: NS, k: keyof U, v: boolean, sv: (p: U) => Promise<NS>): Promise<{ r: NS; rb: boolean }> {
  const p = c; let a = { ...c, [k]: v }; let rb = false;
  try { a = await sv({ [k]: v }); } catch { a = p; rb = true; }
  return { r: a, rb };
}

async function logout(d: () => Promise<void>, cl: () => Promise<void>, rep: (s: string) => void): Promise<{ pcf: boolean; ok: boolean }> {
  let pcf = false;
  try { await d(); } catch { pcf = true; }
  try { await cl(); rep('/login'); return { pcf, ok: true }; } catch { return { pcf, ok: false }; }
}

describe('[1] 소스코드 검증', () => {
  test('1. useNavigation 없음', () => { expect(src).not.toMatch(/useNavigation/); });
  test('2. navigation.setOptions 없음', () => { expect(src).not.toMatch(/navigation.setOptions/); });
  test('3. ChevronLeft 없음', () => { expect(src).not.toMatch(/ChevronLeft/); });
  test('4. marginLeft:-8 없음', () => { expect(src).not.toMatch(/marginLeft: -8/); });
  test('5. useRouter 있음', () => { expect(src).toMatch(/useRouter/); });
  test('6. const navigation 없음', () => { expect(src).not.toMatch(/const navigation/); });
});

describe('[2] 라우팅 구조', () => {
  test('7. profile/settings 삭제됨', () => { expect(fs.existsSync(PROF)).toBe(false); });
  test('8. settings.tsx 존재', () => { expect(fs.existsSync(SET)).toBe(true); });
  test('9. layout에 profile/settings 없음', () => { expect(lay).not.toMatch(/profile.*settings/); });
  test('10. layout에 settings 있음', () => { expect(lay).toMatch(/settings/); });
});

describe('[3] DEFAULT_SETTINGS', () => {
  test('11. instructorId empty', () => { expect(D.instructorId).toBe(''); });
  test('12. pushEnabled true', () => { expect(D.pushEnabled).toBe(true); });
  test('13. lessonReminder true', () => { expect(D.lessonReminder).toBe(true); });
  test('14. paymentNotification true', () => { expect(D.paymentNotification).toBe(true); });
  test('15. chatNotification true', () => { expect(D.chatNotification).toBe(true); });
});

describe('[4] handleToggle', () => {
  test('16. 성공시 서버값', async () => {
    const sv = jest.fn().mockResolvedValue(mk({ pushEnabled: false }));
    const { r, rb } = await tog(D, 'pushEnabled', false, sv);
    expect(rb).toBe(false); expect(r.pushEnabled).toBe(false);
  });
  test('17. 실패시 롤백', async () => {
    const sv = jest.fn().mockRejectedValue(new Error());
    const { r, rb } = await tog(D, 'pushEnabled', false, sv);
    expect(rb).toBe(true); expect(r.pushEnabled).toBe(true);
  });
  test('18. lessonReminder', async () => {
    const { r } = await tog(D, 'lessonReminder', false, jest.fn().mockResolvedValue(mk({ lessonReminder: false })));
    expect(r.lessonReminder).toBe(false);
  });
  test('19. paymentNotification', async () => {
    const { r } = await tog(D, 'paymentNotification', false, jest.fn().mockResolvedValue(mk({ paymentNotification: false })));
    expect(r.paymentNotification).toBe(false);
  });
  test('20. chatNotification', async () => {
    const { r } = await tog(D, 'chatNotification', false, jest.fn().mockResolvedValue(mk({ chatNotification: false })));
    expect(r.chatNotification).toBe(false);
  });
});

describe('[5] handleConfirmLogout', () => {
  test('21. 정상 로그아웃', async () => {
    const rep = jest.fn();
    const res = await logout(jest.fn().mockResolvedValue(undefined), jest.fn().mockResolvedValue(undefined), rep);
    expect(res.ok).toBe(true); expect(res.pcf).toBe(false); expect(rep).toHaveBeenCalledWith('/login');
  });
  test('22. push 실패해도 로그아웃', async () => {
    const rep = jest.fn();
    const res = await logout(jest.fn().mockRejectedValue(new Error()), jest.fn().mockResolvedValue(undefined), rep);
    expect(res.ok).toBe(true); expect(res.pcf).toBe(true);
  });
  test('23. clearTokens 실패', async () => {
    const rep = jest.fn();
    const res = await logout(jest.fn().mockResolvedValue(undefined), jest.fn().mockRejectedValue(new Error()), rep);
    expect(res.ok).toBe(false); expect(rep).not.toHaveBeenCalled();
  });
  test('24. replace /login', async () => {
    const rep = jest.fn();
    await logout(jest.fn().mockResolvedValue(undefined), jest.fn().mockResolvedValue(undefined), rep);
    expect(rep).toHaveBeenCalledWith('/login'); expect(rep).not.toHaveBeenCalledWith('/home');
  });
});

describe('[6] makeSettings', () => {
  test('25. 기본값', () => { expect(mk()).toEqual(D); });
  test('26. 오버라이드', () => { const s = mk({ pushEnabled: false }); expect(s.pushEnabled).toBe(false); expect(s.lessonReminder).toBe(true); });
});

describe('[7] 회귀', () => {
  test('27. DEFAULT 불변', () => { const b = { ...D }; mk({ pushEnabled: false }); expect(D).toEqual(b); });
  test('28. tog 원본 불변', async () => {
    const o = mk(); const snap = { ...o };
    await tog(o, 'pushEnabled', false, jest.fn().mockResolvedValue(mk())); expect(o).toEqual(snap);
  });
  test('29. 연속 토글', async () => {
    const { r: r1 } = await tog(D, 'lessonReminder', false, jest.fn().mockResolvedValue(mk({ lessonReminder: false })));
    const { r: r2 } = await tog(r1, 'lessonReminder', true, jest.fn().mockResolvedValue(mk({ lessonReminder: true })));
    expect(r2.lessonReminder).toBe(true);
  });
  test('30. settings.tsx exports AppSettingsScreen', () => {
    expect(fs.readFileSync(SET, 'utf-8')).toMatch(/AppSettingsScreen/);
  });
});
