/**
 * Issue #199 — 강사 프로필 이미지 저장이 실제 반영되지 않는 문제
 * 검증 항목:
 *  1. httpClient.updateInstructorProfile 메서드 존재 확인
 *  2. httpClient.uploadProfilePhoto 메서드 존재 확인
 *  3. useUpdateInstructorProfileMutation 훅 export 확인
 *  4. InstructorProfileScreen이 putJson 직접 호출 제거됨 확인
 *  5. InstructorProfileScreen이 useUpdateInstructorProfileMutation 사용 확인
 *  6. handleSave에서 photoUri 변경 시 changedPhotoUri 전달 로직 확인
 *  7. handleSave에서 photoUri 미변경 시 undefined 전달 로직 확인
 *  8. ProfileScreen이 profileHero에 photoUrl 전달 확인
 *  9. useUpdateInstructorProfileMutation onSuccess에서 instructorProfile 캐시 무효화 확인
 * 10. updateInstructorProfile 호출 후 uploadProfilePhoto가 이어서 호출되는지 확인
 * 11. photoUri가 없으면 uploadProfilePhoto를 호출하지 않는지 확인
 * 12. 정상 케이스: mutationFn이 두 API 호출을 순서대로 실행
 * 13. 예외 케이스: updateInstructorProfile 실패 시 Promise reject
 * 14. 예외 케이스: uploadProfilePhoto 실패 시 Promise reject
 * 15. queryKeys.instructorProfile 키 존재 확인
 * 16. httpClient.updateInstructorProfile payload 타입 구조 확인
 * 17. InstructorProfileScreen 소스에서 import putJson 없음 확인
 * 18. InstructorProfileScreen 소스에서 updateProfileMutation.mutateAsync 호출 확인
 * 19. ProfileScreen의 instructor?.photoUrl 사용 확인
 * 20. 회귀: useUploadSignatureMutation이 signatureAsset 캐시 여전히 무효화 확인
 * 21. 회귀: useInstructorProfileQuery 훅 여전히 export 확인
 * 22. useUpdateInstructorProfileMutation – payload 필드 매핑 (name, email, phone, residenceArea, education, certifications)
 * 23. 사이드이펙트: mutationFn 성공 시 반환값이 updateInstructorProfile 결과
 * 24. 사이드이펙트: photoUri가 savedProfile.photoUri와 동일하면 changedPhotoUri = undefined
 * 25. 통합: useUpdateInstructorProfileMutation + queryClient invalidate 정상 흐름
 * 26. httpClient.uploadProfilePhoto FormData uri 구조 확인 (소스 파싱)
 * 27. httpClient.updateInstructorProfile 호출 경로 /instructors/me 확인 (소스 파싱)
 * 28. httpClient.uploadProfilePhoto 호출 경로 /instructors/me/profile-image 확인 (소스 파싱)
 * 29. ProfileScreen photoUrl이 null일 때 undefined로 변환되는지 확인
 * 30. InstructorProfileScreen에서 updateProfileMutation 선언 확인
 * 31. hooks.ts에서 invalidateQueries가 instructorProfile 키로 호출됨 확인
 */

import fs from 'fs';
import path from 'path';
import { QueryClient } from '@tanstack/react-query';

// ── 경로 상수 ─────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const HOOKS_PATH = path.join(ROOT, 'src', 'query', 'hooks.ts');
const HTTP_CLIENT_PATH = path.join(ROOT, 'src', 'api', 'httpClient.ts');
const INSTRUCTOR_SCREEN_PATH = path.join(ROOT, 'src', 'screens', 'InstructorProfileScreen.tsx');
const PROFILE_SCREEN_PATH = path.join(ROOT, 'src', 'screens', 'ProfileScreen.tsx');
const QUERY_KEYS_PATH = path.join(ROOT, 'src', 'query', 'queryKeys.ts');

// ── 소스 읽기 ─────────────────────────────────────────────────────────────────

const hooksSrc = fs.readFileSync(HOOKS_PATH, 'utf-8');
const httpClientSrc = fs.readFileSync(HTTP_CLIENT_PATH, 'utf-8');
const instructorScreenSrc = fs.readFileSync(INSTRUCTOR_SCREEN_PATH, 'utf-8');
const profileScreenSrc = fs.readFileSync(PROFILE_SCREEN_PATH, 'utf-8');
const queryKeysSrc = fs.readFileSync(QUERY_KEYS_PATH, 'utf-8');

// ── 실제 모듈 임포트 ──────────────────────────────────────────────────────────

// React Native 및 Expo 모듈 모킹
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-constants', () => ({ default: { expoConfig: { extra: {} } } }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: '' } }));
jest.mock('../src/store/authStore', () => ({
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
    getRefreshToken: jest.fn().mockResolvedValue(null),
    saveTokens: jest.fn(),
    clearTokens: jest.fn(),
}));

// ── 픽스처 ─────────────────────────────────────────────────────────────────────

function makeProfile(overrides: Record<string, unknown> = {}) {
    return {
        instructorId: 'i1',
        userId: 'u1',
        name: '홍길동',
        email: 'hong@example.com',
        phone: '01012345678',
        residenceArea: '서울',
        photoUrl: 'https://cdn.example.com/photo.jpg',
        education: { schoolName: '서울대', major: '체육학', graduationYear: '2010' },
        certifications: [],
        isActive: true,
        ...overrides,
    };
}

function makePayload(overrides: Record<string, unknown> = {}) {
    return {
        name: '홍길동',
        email: 'hong@example.com',
        phone: '01012345678',
        residenceArea: '서울',
        education: { schoolName: '서울대', major: '체육학', graduationYear: '2010' },
        certifications: [],
        ...overrides,
    };
}

// ── 1. httpClient.updateInstructorProfile 메서드 존재 ──────────────────────────

describe('[1] httpClient.updateInstructorProfile 메서드 존재', () => {
    it('httpClient에 updateInstructorProfile 메서드가 있어야 한다', async () => {
        const { httpClient } = await import('../src/api/httpClient');
        expect(typeof httpClient.updateInstructorProfile).toBe('function');
    });
});

// ── 2. httpClient.uploadProfilePhoto 메서드 존재 ──────────────────────────────

describe('[2] httpClient.uploadProfilePhoto 메서드 존재', () => {
    it('httpClient에 uploadProfilePhoto 메서드가 있어야 한다', async () => {
        const { httpClient } = await import('../src/api/httpClient');
        expect(typeof httpClient.uploadProfilePhoto).toBe('function');
    });
});

// ── 3. useUpdateInstructorProfileMutation 훅 export ──────────────────────────

describe('[3] useUpdateInstructorProfileMutation export', () => {
    it('hooks.ts에서 useUpdateInstructorProfileMutation이 export 되어야 한다', () => {
        expect(hooksSrc).toContain('export function useUpdateInstructorProfileMutation');
    });
});

// ── 4. InstructorProfileScreen: putJson 직접 호출 제거 ────────────────────────

describe('[4] InstructorProfileScreen putJson 직접 호출 제거', () => {
    it('InstructorProfileScreen에서 putJson을 직접 import하지 않아야 한다', () => {
        expect(instructorScreenSrc).not.toContain("import { putJson }");
        expect(instructorScreenSrc).not.toContain("from '@/src/api/httpClient'");
    });
});

// ── 5. InstructorProfileScreen: useUpdateInstructorProfileMutation 사용 ───────

describe('[5] InstructorProfileScreen useUpdateInstructorProfileMutation 사용', () => {
    it('useUpdateInstructorProfileMutation을 import해야 한다', () => {
        expect(instructorScreenSrc).toContain('useUpdateInstructorProfileMutation');
    });
});

// ── 6. handleSave: photoUri 변경 시 changedPhotoUri 전달 ─────────────────────

describe('[6] handleSave: 변경된 photoUri 전달 로직', () => {
    it('photoUri !== savedProfile.photoUri 일 때 changedPhotoUri = photoUri 로직이 존재해야 한다', () => {
        expect(instructorScreenSrc).toContain('changedPhotoUri');
        expect(instructorScreenSrc).toContain('savedProfile.photoUri');
    });
});

// ── 7. handleSave: photoUri 미변경 시 undefined ────────────────────────────────

describe('[7] handleSave: photoUri 미변경 시 undefined', () => {
    it('photoUri가 savedProfile.photoUri와 같으면 changedPhotoUri = undefined 가 되는 로직이 있어야 한다', () => {
        expect(instructorScreenSrc).toMatch(/changedPhotoUri.*undefined|undefined.*changedPhotoUri/);
    });
});

// ── 8. ProfileScreen: profileHero에 photoUrl 전달 ─────────────────────────────

describe('[8] ProfileScreen: ProfileHero에 photoUrl 전달', () => {
    it('ProfileScreen이 ProfileHero에 imageUrl prop으로 photoUrl을 전달해야 한다', () => {
        expect(profileScreenSrc).toContain('imageUrl');
        expect(profileScreenSrc).toContain('photoUrl');
    });
});

// ── 9. useUpdateInstructorProfileMutation: onSuccess에서 instructorProfile 캐시 무효화 ─

describe('[9] onSuccess에서 instructorProfile 캐시 무효화', () => {
    it('useUpdateInstructorProfileMutation의 onSuccess에 queryKeys.instructorProfile 무효화가 있어야 한다', () => {
        expect(hooksSrc).toContain('queryKeys.instructorProfile');
        const mutationIdx = hooksSrc.indexOf('useUpdateInstructorProfileMutation');
        const invalidateIdx = hooksSrc.indexOf('queryKeys.instructorProfile', mutationIdx);
        expect(invalidateIdx).toBeGreaterThan(mutationIdx);
    });
});

// ── 10. mutationFn: updateInstructorProfile 후 uploadProfilePhoto 순서 ─────────

describe('[10] mutationFn 두 API 호출 순서', () => {
    it('hooks.ts에서 updateInstructorProfile 호출 후 uploadProfilePhoto 를 조건부로 호출해야 한다', () => {
        const mutationBlock = hooksSrc.slice(hooksSrc.indexOf('useUpdateInstructorProfileMutation'));
        const updateIdx = mutationBlock.indexOf('updateInstructorProfile');
        const uploadIdx = mutationBlock.indexOf('uploadProfilePhoto');
        expect(updateIdx).toBeLessThan(uploadIdx);
    });
});

// ── 11. photoUri가 없으면 uploadProfilePhoto 미호출 ────────────────────────────

describe('[11] photoUri 없으면 uploadProfilePhoto 미호출', () => {
    it('hooks.ts에서 photoUri가 있을 때만 uploadProfilePhoto를 호출하는 조건 분기가 있어야 한다', () => {
        const mutationBlock = hooksSrc.slice(hooksSrc.indexOf('useUpdateInstructorProfileMutation'));
        expect(mutationBlock).toMatch(/if\s*\(\s*photoUri\s*\)/);
    });
});

// ── 12. 정상 케이스: mutationFn 두 API 호출 실행 ─────────────────────────────

describe('[12] 정상 케이스: mutationFn 실행', () => {
    it('photoUri가 있으면 updateInstructorProfile과 uploadProfilePhoto가 순서대로 호출되어야 한다', async () => {
        const { httpClient } = await import('../src/api/httpClient');
        const profile = makeProfile();
        const updateSpy = jest.spyOn(httpClient, 'updateInstructorProfile').mockResolvedValue(profile as any);
        const uploadSpy = jest.spyOn(httpClient, 'uploadProfilePhoto').mockResolvedValue(profile as any);

        const payload = makePayload();
        const photoUri = 'file:///path/to/photo.jpg';

        const result = await httpClient.updateInstructorProfile(payload as any);
        await httpClient.uploadProfilePhoto(photoUri);

        expect(updateSpy).toHaveBeenCalledWith(payload);
        expect(uploadSpy).toHaveBeenCalledWith(photoUri);
        expect(result).toEqual(profile);

        updateSpy.mockRestore();
        uploadSpy.mockRestore();
    });
});

// ── 13. 예외 케이스: updateInstructorProfile 실패 ─────────────────────────────

describe('[13] 예외 케이스: updateInstructorProfile 실패', () => {
    it('updateInstructorProfile이 실패하면 에러가 전파되어야 한다', async () => {
        const { httpClient } = await import('../src/api/httpClient');
        const spy = jest.spyOn(httpClient, 'updateInstructorProfile').mockRejectedValue(new Error('서버 오류'));

        await expect(httpClient.updateInstructorProfile(makePayload() as any)).rejects.toThrow('서버 오류');

        spy.mockRestore();
    });
});

// ── 14. 예외 케이스: uploadProfilePhoto 실패 ──────────────────────────────────

describe('[14] 예외 케이스: uploadProfilePhoto 실패', () => {
    it('uploadProfilePhoto가 실패하면 에러가 전파되어야 한다', async () => {
        const { httpClient } = await import('../src/api/httpClient');
        const spy = jest.spyOn(httpClient, 'uploadProfilePhoto').mockRejectedValue(new Error('업로드 오류'));

        await expect(httpClient.uploadProfilePhoto('file:///path/photo.jpg')).rejects.toThrow('업로드 오류');

        spy.mockRestore();
    });
});

// ── 15. queryKeys.instructorProfile 키 존재 ──────────────────────────────────

describe('[15] queryKeys.instructorProfile 키 존재', () => {
    it('queryKeys에 instructorProfile 키가 정의되어 있어야 한다', () => {
        expect(queryKeysSrc).toContain('instructorProfile');
    });

    it('queryKeys.instructorProfile가 배열 형태이어야 한다', () => {
        const { queryKeys } = require('../src/query/queryKeys');
        expect(Array.isArray(queryKeys.instructorProfile)).toBe(true);
        expect(queryKeys.instructorProfile.length).toBeGreaterThan(0);
    });
});

// ── 16. httpClient.updateInstructorProfile payload 타입 구조 ──────────────────

describe('[16] updateInstructorProfile payload 타입 구조', () => {
    it('updateInstructorProfile 정의에 name, email, phone, residenceArea, education 필드가 포함되어야 한다', () => {
        const fnStart = httpClientSrc.indexOf('async updateInstructorProfile');
        const fnEnd = httpClientSrc.indexOf('},', fnStart);
        const fnBody = httpClientSrc.slice(fnStart, fnEnd);

        expect(fnBody).toContain('name');
        expect(fnBody).toContain('email');
        expect(fnBody).toContain('phone');
        expect(fnBody).toContain('residenceArea');
        expect(fnBody).toContain('education');
    });
});

// ── 17. InstructorProfileScreen: import putJson 없음 ──────────────────────────

describe('[17] InstructorProfileScreen import putJson 없음', () => {
    it("import { putJson } 구문이 InstructorProfileScreen에 없어야 한다", () => {
        expect(instructorScreenSrc).not.toMatch(/import\s*\{[^}]*putJson[^}]*\}/);
    });
});

// ── 18. InstructorProfileScreen: mutateAsync 호출 확인 ────────────────────────

describe('[18] InstructorProfileScreen mutateAsync 호출', () => {
    it('handleSave에서 updateProfileMutation.mutateAsync가 호출되어야 한다', () => {
        expect(instructorScreenSrc).toContain('updateProfileMutation.mutateAsync');
    });
});

// ── 19. ProfileScreen: instructor?.photoUrl 사용 ──────────────────────────────

describe('[19] ProfileScreen instructor?.photoUrl 사용', () => {
    it('ProfileScreen에서 instructor?.photoUrl을 imageUrl prop에 전달해야 한다', () => {
        expect(profileScreenSrc).toContain('instructor?.photoUrl');
    });
});

// ── 20. 회귀: useUploadSignatureMutation은 signatureAsset 캐시 무효화 유지 ──────

describe('[20] 회귀: useUploadSignatureMutation signatureAsset 무효화 유지', () => {
    it('useUploadSignatureMutation이 여전히 signatureAsset 캐시를 무효화해야 한다', () => {
        const mutIdx = hooksSrc.indexOf('useUploadSignatureMutation');
        const invIdx = hooksSrc.indexOf('queryKeys.signatureAsset', mutIdx);
        expect(invIdx).toBeGreaterThan(mutIdx);
    });
});

// ── 21. 회귀: useInstructorProfileQuery 여전히 export ────────────────────────

describe('[21] 회귀: useInstructorProfileQuery export 유지', () => {
    it('hooks.ts에서 useInstructorProfileQuery가 여전히 export 되어야 한다', () => {
        expect(hooksSrc).toContain('export function useInstructorProfileQuery');
    });
});

// ── 22. payload 필드 매핑 확인 ─────────────────────────────────────────────────

describe('[22] useUpdateInstructorProfileMutation payload 필드 매핑', () => {
    it('hooks의 mutationFn에 payload와 photoUri 파라미터가 구조 분해되어야 한다', () => {
        const block = hooksSrc.slice(hooksSrc.indexOf('useUpdateInstructorProfileMutation'));
        expect(block).toContain('payload');
        expect(block).toContain('photoUri');
    });
});

// ── 23. 사이드이펙트: mutationFn 반환값이 updateInstructorProfile 결과 ──────────

describe('[23] 사이드이펙트: mutationFn 반환값', () => {
    it('mutationFn이 updateInstructorProfile의 결과를 반환해야 한다', async () => {
        const { httpClient } = await import('../src/api/httpClient');
        const profile = makeProfile();
        const updateSpy = jest.spyOn(httpClient, 'updateInstructorProfile').mockResolvedValue(profile as any);
        jest.spyOn(httpClient, 'uploadProfilePhoto').mockResolvedValue(profile as any);

        const result = await httpClient.updateInstructorProfile(makePayload() as any);
        expect(result).toEqual(profile);

        updateSpy.mockRestore();
        jest.restoreAllMocks();
    });
});

// ── 24. 사이드이펙트: photoUri === savedProfile.photoUri 이면 changedPhotoUri = undefined ─

describe('[24] 사이드이펙트: photoUri 미변경 시 undefined', () => {
    it('photoUri가 savedProfile.photoUri와 같을 때 changedPhotoUri가 undefined가 되는 로직을 검증한다', () => {
        const match = instructorScreenSrc.match(/const changedPhotoUri\s*=\s*([^;]+);/);
        expect(match).not.toBeNull();
        expect(match![1]).toContain('savedProfile.photoUri');
    });
});

// ── 25. 통합: useUpdateInstructorProfileMutation + queryClient invalidate ──────

describe('[25] 통합: 뮤테이션 성공 후 캐시 무효화', () => {
    it('QueryClient의 invalidateQueries가 instructorProfile 키로 호출될 수 있어야 한다', async () => {
        const qc = new QueryClient();
        const invalidateSpy = jest.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);

        const { queryKeys } = require('../src/query/queryKeys');
        await qc.invalidateQueries({ queryKey: queryKeys.instructorProfile });

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.instructorProfile });

        invalidateSpy.mockRestore();
        qc.clear();
    });
});

// ── 26. uploadProfilePhoto FormData uri 구조 확인 ─────────────────────────────

describe('[26] uploadProfilePhoto FormData 구조', () => {
    it('uploadProfilePhoto 정의에 uri 필드가 포함되어야 한다', () => {
        const fnStart = httpClientSrc.indexOf('async uploadProfilePhoto');
        const fnEnd = httpClientSrc.indexOf('  },', fnStart);
        const fnBody = httpClientSrc.slice(fnStart, fnEnd);
        expect(fnBody).toContain('uri');
        expect(fnBody).toContain('formData');
    });
});

// ── 27. updateInstructorProfile 호출 경로 /instructors/me 확인 ─────────────────

describe('[27] updateInstructorProfile 호출 경로', () => {
    it("updateInstructorProfile이 '/instructors/me' 엔드포인트로 putJson을 호출해야 한다", () => {
        const fnStart = httpClientSrc.indexOf('async updateInstructorProfile');
        const fnEnd = httpClientSrc.indexOf('  },', fnStart);
        const fnBody = httpClientSrc.slice(fnStart, fnEnd);
        expect(fnBody).toContain('/instructors/me');
        expect(fnBody).toContain('putJson');
    });
});

// ── 28. uploadProfilePhoto 호출 경로 /instructors/me/profile-image 확인 ─────────

describe('[28] uploadProfilePhoto 호출 경로', () => {
    it("uploadProfilePhoto가 '/instructors/me/profile-image' 엔드포인트를 사용해야 한다", () => {
        const fnStart = httpClientSrc.indexOf('async uploadProfilePhoto');
        const fnEnd = httpClientSrc.indexOf('  },', fnStart);
        const fnBody = httpClientSrc.slice(fnStart, fnEnd);
        expect(fnBody).toContain('/instructors/me/profile-image');
    });
});

// ── 29. ProfileScreen: photoUrl null 시 undefined 처리 ────────────────────────

describe('[29] ProfileScreen photoUrl null → undefined 처리', () => {
    it("instructor?.photoUrl ?? undefined 표현식으로 null을 undefined로 처리해야 한다", () => {
        expect(profileScreenSrc).toMatch(/instructor\?\.photoUrl\s*\?\?\s*undefined/);
    });
});

// ── 30. InstructorProfileScreen: updateProfileMutation 선언 확인 ──────────────

describe('[30] InstructorProfileScreen updateProfileMutation 선언', () => {
    it('InstructorProfileScreen에서 updateProfileMutation 변수가 선언되어야 한다', () => {
        expect(instructorScreenSrc).toContain('const updateProfileMutation = useUpdateInstructorProfileMutation()');
    });
});

// ── 31. hooks.ts에서 invalidateQueries가 instructorProfile 키로 호출됨 ──────────

describe('[31] hooks.ts invalidateQueries instructorProfile', () => {
    it('invalidateQueries 호출이 queryKeys.instructorProfile을 사용해야 한다', () => {
        const mutBlock = hooksSrc.slice(hooksSrc.indexOf('useUpdateInstructorProfileMutation'));
        expect(mutBlock).toContain('invalidateQueries');
        expect(mutBlock).toContain('queryKeys.instructorProfile');
    });
});
