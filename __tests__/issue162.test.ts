/**
 * Tests for issue #162: 도착/종료 실패 재시도 UX 및 suspicious 안내
 * Covers: checkinResultUX.ts utilities
 */

import {
    classifyCheckinResult,
    buildCheckinResultUX,
    describeAccuracy,
    isLowAccuracy,
    isOutOfRange,
    isSuspicious,
    buildFinishReminderMessage,
    buildFinishReminderTitle,
    ACCURACY_GOOD_METERS,
    ACCURACY_ACCEPTABLE_METERS,
    ACCURACY_SUSPICIOUS_METERS,
    LOCATION_VALID_RADIUS_METERS,
    type CheckinResultInfo,
    type CheckinResultUXType,
} from '../src/utils/checkinResultUX';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeInfo(overrides: Partial<CheckinResultInfo> = {}): CheckinResultInfo {
    return {
        isValid: true,
        locationStatus: 'OK',
        distanceMeters: 100,
        accuracyMeters: 50,
        ...overrides,
    };
}

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────
describe('Constants', () => {
    test('ACCURACY_GOOD_METERS is 80', () => {
        expect(ACCURACY_GOOD_METERS).toBe(80);
    });

    test('ACCURACY_ACCEPTABLE_METERS is 150', () => {
        expect(ACCURACY_ACCEPTABLE_METERS).toBe(150);
    });

    test('ACCURACY_SUSPICIOUS_METERS is 300', () => {
        expect(ACCURACY_SUSPICIOUS_METERS).toBe(300);
    });

    test('LOCATION_VALID_RADIUS_METERS is 250', () => {
        expect(LOCATION_VALID_RADIUS_METERS).toBe(250);
    });

    test('Constants are in correct ascending order', () => {
        expect(ACCURACY_GOOD_METERS).toBeLessThan(ACCURACY_ACCEPTABLE_METERS);
        expect(ACCURACY_ACCEPTABLE_METERS).toBeLessThan(ACCURACY_SUSPICIOUS_METERS);
    });
});

// ────────────────────────────────────────────────────────────────
// classifyCheckinResult
// ────────────────────────────────────────────────────────────────
describe('classifyCheckinResult', () => {
    test('valid + OK → SUCCESS', () => {
        expect(classifyCheckinResult(makeInfo())).toBe('SUCCESS');
    });

    test('valid + SUSPICIOUS → SUCCESS_WITH_WARNING', () => {
        expect(classifyCheckinResult(makeInfo({ locationStatus: 'SUSPICIOUS' }))).toBe('SUCCESS_WITH_WARNING');
    });

    test('invalid + far distance + good accuracy → OUT_OF_RANGE', () => {
        expect(classifyCheckinResult(makeInfo({
            isValid: false,
            distanceMeters: 400,
            accuracyMeters: 50,
            locationStatus: 'OK',
        }))).toBe('OUT_OF_RANGE');
    });

    test('invalid + low accuracy → LOW_ACCURACY', () => {
        expect(classifyCheckinResult(makeInfo({
            isValid: false,
            distanceMeters: 100,
            accuracyMeters: 200,
            locationStatus: 'OK',
        }))).toBe('LOW_ACCURACY');
    });

    test('invalid + SUSPICIOUS locationStatus + within range → SUSPICIOUS', () => {
        expect(classifyCheckinResult(makeInfo({
            isValid: false,
            distanceMeters: 100,
            accuracyMeters: 100,
            locationStatus: 'SUSPICIOUS',
        }))).toBe('SUSPICIOUS');
    });

    test('invalid + no specific condition → OUT_OF_RANGE (default)', () => {
        expect(classifyCheckinResult(makeInfo({
            isValid: false,
            distanceMeters: 200,
            accuracyMeters: 100,
            locationStatus: 'OK',
        }))).toBe('OUT_OF_RANGE');
    });

    test('boundary: distance exactly at LOCATION_VALID_RADIUS_METERS with good accuracy falls to default OUT_OF_RANGE', () => {
        // distanceMeters=250 is NOT > 250, so OUT_OF_RANGE condition fails
        // accuracyMeters=50 is NOT > 150, so LOW_ACCURACY fails
        // locationStatus=OK so SUSPICIOUS fails
        // default branch → OUT_OF_RANGE
        const result = classifyCheckinResult(makeInfo({
            isValid: false,
            distanceMeters: LOCATION_VALID_RADIUS_METERS,
            accuracyMeters: 50,
            locationStatus: 'OK',
        }));
        expect(result).toBe('OUT_OF_RANGE');
    });
});

// ────────────────────────────────────────────────────────────────
// buildCheckinResultUX
// ────────────────────────────────────────────────────────────────
describe('buildCheckinResultUX', () => {
    test('SUCCESS: canRetry=false, type=SUCCESS', () => {
        const ux = buildCheckinResultUX(makeInfo());
        expect(ux.type).toBe('SUCCESS');
        expect(ux.canRetry).toBe(false);
        expect(ux.title.length).toBeGreaterThan(0);
        expect(ux.message.length).toBeGreaterThan(0);
    });

    test('OUT_OF_RANGE: canRetry=true, mentions distance', () => {
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: 400,
            accuracyMeters: 50,
            locationStatus: 'OK',
        }));
        expect(ux.type).toBe('OUT_OF_RANGE');
        expect(ux.canRetry).toBe(true);
        expect(ux.message).toContain('400');
    });

    test('LOW_ACCURACY: canRetry=true, mentions accuracy', () => {
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: 100,
            accuracyMeters: 200,
            locationStatus: 'OK',
        }));
        expect(ux.type).toBe('LOW_ACCURACY');
        expect(ux.canRetry).toBe(true);
        expect(ux.message).toContain('200');
    });

    test('SUSPICIOUS: canRetry=true', () => {
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: 100,
            accuracyMeters: 100,
            locationStatus: 'SUSPICIOUS',
        }));
        expect(ux.type).toBe('SUSPICIOUS');
        expect(ux.canRetry).toBe(true);
    });

    test('SUCCESS_WITH_WARNING: canRetry=false, title not empty', () => {
        const ux = buildCheckinResultUX(makeInfo({ locationStatus: 'SUSPICIOUS' }));
        expect(ux.type).toBe('SUCCESS_WITH_WARNING');
        expect(ux.canRetry).toBe(false);
        expect(ux.title.length).toBeGreaterThan(0);
    });

    test('All UX types have non-empty title and message', () => {
        const cases: CheckinResultInfo[] = [
            makeInfo(),
            makeInfo({ locationStatus: 'SUSPICIOUS' }),
            makeInfo({ isValid: false, distanceMeters: 400, accuracyMeters: 50, locationStatus: 'OK' }),
            makeInfo({ isValid: false, distanceMeters: 100, accuracyMeters: 200, locationStatus: 'OK' }),
            makeInfo({ isValid: false, distanceMeters: 100, accuracyMeters: 100, locationStatus: 'SUSPICIOUS' }),
        ];
        cases.forEach(info => {
            const ux = buildCheckinResultUX(info);
            expect(ux.title.length).toBeGreaterThan(0);
            expect(ux.message.length).toBeGreaterThan(0);
        });
    });
});

// ────────────────────────────────────────────────────────────────
// describeAccuracy
// ────────────────────────────────────────────────────────────────
describe('describeAccuracy', () => {
    test('returns good accuracy description for values <= 80m', () => {
        expect(describeAccuracy(50)).toContain('좋음');
        expect(describeAccuracy(80)).toContain('좋음');
    });

    test('returns acceptable accuracy for values 81–150m', () => {
        expect(describeAccuracy(100)).toContain('보통');
        expect(describeAccuracy(150)).toContain('보통');
    });

    test('returns low accuracy for values 151–300m', () => {
        expect(describeAccuracy(200)).toContain('낮음');
        expect(describeAccuracy(300)).toContain('낮음');
    });

    test('returns very low accuracy for values > 300m', () => {
        expect(describeAccuracy(301)).toContain('매우 낮음');
    });

    test('boundary: 80 is still "good"', () => {
        expect(describeAccuracy(80)).toContain('좋음');
    });

    test('boundary: 81 is "보통"', () => {
        expect(describeAccuracy(81)).toContain('보통');
    });
});

// ────────────────────────────────────────────────────────────────
// isLowAccuracy
// ────────────────────────────────────────────────────────────────
describe('isLowAccuracy', () => {
    test('returns false for accuracy <= 150m', () => {
        expect(isLowAccuracy(50)).toBe(false);
        expect(isLowAccuracy(150)).toBe(false);
    });

    test('returns true for accuracy > 150m', () => {
        expect(isLowAccuracy(151)).toBe(true);
        expect(isLowAccuracy(300)).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────
// isOutOfRange
// ────────────────────────────────────────────────────────────────
describe('isOutOfRange', () => {
    test('returns false for distance <= 250m', () => {
        expect(isOutOfRange(100)).toBe(false);
        expect(isOutOfRange(250)).toBe(false);
    });

    test('returns true for distance > 250m', () => {
        expect(isOutOfRange(251)).toBe(true);
        expect(isOutOfRange(500)).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────
// isSuspicious
// ────────────────────────────────────────────────────────────────
describe('isSuspicious', () => {
    test('returns false when both under threshold', () => {
        expect(isSuspicious(200, 200)).toBe(false);
    });

    test('returns true when distance exceeds 300m', () => {
        expect(isSuspicious(301, 50)).toBe(true);
    });

    test('returns true when accuracy exceeds 300m', () => {
        expect(isSuspicious(100, 301)).toBe(true);
    });

    test('returns true when both exceed threshold', () => {
        expect(isSuspicious(400, 400)).toBe(true);
    });

    test('boundary: 300 is not suspicious', () => {
        expect(isSuspicious(300, 300)).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────
// buildFinishReminderMessage / Title
// ────────────────────────────────────────────────────────────────
describe('buildFinishReminderMessage', () => {
    test('includes lesson title', () => {
        expect(buildFinishReminderMessage('미술 강의')).toContain('미술 강의');
    });

    test('mentions finish action', () => {
        expect(buildFinishReminderMessage('수학 강의')).toContain('종료');
    });

    test('returns non-empty string', () => {
        expect(buildFinishReminderMessage('강의').length).toBeGreaterThan(0);
    });

    test('does not contain undefined', () => {
        expect(buildFinishReminderMessage('강의')).not.toContain('undefined');
    });
});

describe('buildFinishReminderTitle', () => {
    test('returns non-empty string', () => {
        expect(buildFinishReminderTitle().length).toBeGreaterThan(0);
    });

    test('mentions finish/종료', () => {
        expect(buildFinishReminderTitle()).toContain('종료');
    });
});

// ────────────────────────────────────────────────────────────────
// Integration
// ────────────────────────────────────────────────────────────────
describe('Integration', () => {
    test('OUT_OF_RANGE UX always has retry and specific message', () => {
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: 500,
            accuracyMeters: 30,
            locationStatus: 'OK',
        }));
        expect(ux.canRetry).toBe(true);
        expect(ux.type).toBe('OUT_OF_RANGE');
        expect(isOutOfRange(500)).toBe(true);
    });

    test('LOW_ACCURACY UX consistent with isLowAccuracy utility', () => {
        const accuracyMeters = 200;
        const ux = buildCheckinResultUX(makeInfo({
            isValid: false,
            distanceMeters: 100,
            accuracyMeters,
            locationStatus: 'OK',
        }));
        expect(ux.type).toBe('LOW_ACCURACY');
        expect(isLowAccuracy(accuracyMeters)).toBe(true);
    });

    test('SUCCESS_WITH_WARNING: isSuspicious flags it but isValid=true', () => {
        const info = makeInfo({ isValid: true, locationStatus: 'SUSPICIOUS', distanceMeters: 400, accuracyMeters: 400 });
        const ux = buildCheckinResultUX(info);
        expect(ux.type).toBe('SUCCESS_WITH_WARNING');
        expect(isSuspicious(info.distanceMeters, info.accuracyMeters)).toBe(true);
    });
});
