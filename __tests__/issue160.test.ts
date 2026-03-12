/**
 * Tests for issue #160: 백그라운드 위치 추적 (DEPART ~ ARRIVE 구간)
 * Covers: backgroundLocationTask.ts utilities
 *
 * expo-location and expo-task-manager are mocked because they are native modules
 * that cannot run in the Node.js Jest environment.
 */

// ─── Mock expo-location and expo-task-manager before imports ─────────────────
jest.mock('expo-location', () => ({
    Accuracy: { Balanced: 3, Lowest: 1 },
    startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
    stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
    hasStartedLocationUpdatesAsync: jest.fn().mockResolvedValue(false),
    getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getLastKnownPositionAsync: jest.fn().mockResolvedValue(null),
    getCurrentPositionAsync: jest.fn().mockResolvedValue({
        coords: { latitude: 37.5, longitude: 127.0, accuracy: 10 },
    }),
}));

jest.mock('expo-task-manager', () => ({
    defineTask: jest.fn(),
    isTaskDefined: jest.fn().mockReturnValue(false),
    isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
    BACKGROUND_LOCATION_TASK,
    BG_LOCATION_INTERVAL_MS,
    BG_LOCATION_DISTANCE_M,
    selectNearestDepartedLesson,
    buildTrackingStartMessage,
    buildTrackingStopMessage,
    setBackgroundLocationCallback,
    defineBackgroundLocationTask,
    startBackgroundTracking,
    stopBackgroundTracking,
    isBackgroundTrackingActive,
    type TrackedLesson,
} from '../src/services/backgroundLocationTask';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NOW = new Date('2026-03-12T10:00:00Z');

function makeLesson(id: string, startsAt: string, lat?: number, lng?: number): TrackedLesson {
    return {
        lessonId: id,
        startsAt,
        venueLat: lat ?? null,
        venueLng: lng ?? null,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
});

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────
describe('Constants', () => {
    test('BACKGROUND_LOCATION_TASK is a non-empty string', () => {
        expect(typeof BACKGROUND_LOCATION_TASK).toBe('string');
        expect(BACKGROUND_LOCATION_TASK.length).toBeGreaterThan(0);
    });

    test('BACKGROUND_LOCATION_TASK equals expected task name', () => {
        expect(BACKGROUND_LOCATION_TASK).toBe('BACKGROUND_LOCATION_TASK');
    });

    test('BG_LOCATION_INTERVAL_MS is 10 minutes in ms (600000)', () => {
        expect(BG_LOCATION_INTERVAL_MS).toBe(10 * 60 * 1000);
        expect(BG_LOCATION_INTERVAL_MS).toBe(600000);
    });

    test('BG_LOCATION_DISTANCE_M is a positive number', () => {
        expect(BG_LOCATION_DISTANCE_M).toBeGreaterThan(0);
    });
});

// ────────────────────────────────────────────────────────────────
// selectNearestDepartedLesson
// ────────────────────────────────────────────────────────────────
describe('selectNearestDepartedLesson', () => {
    test('returns null for empty list', () => {
        expect(selectNearestDepartedLesson([], NOW)).toBeNull();
    });

    test('returns the single lesson when list has one item', () => {
        const lesson = makeLesson('L1', '2026-03-12T11:00:00Z');
        expect(selectNearestDepartedLesson([lesson], NOW)).toBe(lesson);
    });

    test('returns lesson with start time closest to now (future)', () => {
        const near = makeLesson('L_near', '2026-03-12T10:30:00Z'); // 30 min from now
        const far = makeLesson('L_far', '2026-03-12T14:00:00Z');  // 4 hrs from now
        expect(selectNearestDepartedLesson([near, far], NOW)).toBe(near);
    });

    test('returns lesson with start time closest to now (past)', () => {
        const recent = makeLesson('L_recent', '2026-03-12T09:45:00Z'); // 15 min ago
        const older = makeLesson('L_old', '2026-03-12T07:00:00Z');     // 3 hrs ago
        expect(selectNearestDepartedLesson([recent, older], NOW)).toBe(recent);
    });

    test('handles mix of past and future lessons — picks closest overall', () => {
        const past = makeLesson('L_past', '2026-03-12T09:50:00Z');    // 10 min ago
        const future = makeLesson('L_future', '2026-03-12T10:05:00Z'); // 5 min from now
        expect(selectNearestDepartedLesson([past, future], NOW)).toBe(future);
    });

    test('works with venue coordinates present', () => {
        const lesson = makeLesson('L1', '2026-03-12T11:00:00Z', 37.5, 127.0);
        const result = selectNearestDepartedLesson([lesson], NOW);
        expect(result?.venueLat).toBe(37.5);
        expect(result?.venueLng).toBe(127.0);
    });

    test('works with null venue coordinates', () => {
        const lesson = makeLesson('L1', '2026-03-12T11:00:00Z');
        expect(selectNearestDepartedLesson([lesson], NOW)?.venueLat).toBeNull();
    });

    test('handles three lessons — picks closest to now', () => {
        const lessons = [
            makeLesson('L_far', '2026-03-12T14:00:00Z'),
            makeLesson('L_near', '2026-03-12T10:15:00Z'),
            makeLesson('L_mid', '2026-03-12T11:30:00Z'),
        ];
        expect(selectNearestDepartedLesson(lessons, NOW)?.lessonId).toBe('L_near');
    });

    test('uses current Date when now parameter is omitted', () => {
        const lesson = makeLesson('L1', new Date().toISOString());
        const result = selectNearestDepartedLesson([lesson]);
        expect(result).toBe(lesson);
    });

    test('lessonId is preserved in returned object', () => {
        const lesson = makeLesson('MY_LESSON_ID', '2026-03-12T11:00:00Z');
        expect(selectNearestDepartedLesson([lesson], NOW)?.lessonId).toBe('MY_LESSON_ID');
    });

    test('startsAt is preserved in returned object', () => {
        const isoStr = '2026-03-12T11:00:00Z';
        const lesson = makeLesson('L1', isoStr);
        expect(selectNearestDepartedLesson([lesson], NOW)?.startsAt).toBe(isoStr);
    });

    test('integration: A=45min, B=3hrs, C=1hr ago — picks A', () => {
        const lessons: TrackedLesson[] = [
            { lessonId: 'A', startsAt: '2026-03-12T10:45:00Z', venueLat: null, venueLng: null },
            { lessonId: 'B', startsAt: '2026-03-12T13:00:00Z', venueLat: null, venueLng: null },
            { lessonId: 'C', startsAt: '2026-03-12T09:00:00Z', venueLat: null, venueLng: null },
        ];
        expect(selectNearestDepartedLesson(lessons, NOW)?.lessonId).toBe('A');
    });
});

// ────────────────────────────────────────────────────────────────
// buildTrackingStartMessage
// ────────────────────────────────────────────────────────────────
describe('buildTrackingStartMessage', () => {
    const lesson = makeLesson('L1', '2026-03-12T11:00:00Z', 37.5, 127.0);

    test('returns a non-empty string', () => {
        expect(buildTrackingStartMessage(lesson).length).toBeGreaterThan(0);
    });

    test('mentions the polling interval (10분)', () => {
        expect(buildTrackingStartMessage(lesson)).toContain('10분');
    });

    test('mentions background tracking concept', () => {
        expect(buildTrackingStartMessage(lesson)).toContain('추적');
    });

    test('does not contain "undefined"', () => {
        expect(buildTrackingStartMessage(lesson)).not.toContain('undefined');
    });
});

// ────────────────────────────────────────────────────────────────
// buildTrackingStopMessage
// ────────────────────────────────────────────────────────────────
describe('buildTrackingStopMessage', () => {
    test('returns a non-empty string', () => {
        expect(buildTrackingStopMessage().length).toBeGreaterThan(0);
    });

    test('mentions tracking termination (종료)', () => {
        expect(buildTrackingStopMessage()).toContain('종료');
    });

    test('mentions arrival confirmation (도착)', () => {
        expect(buildTrackingStopMessage()).toContain('도착');
    });

    test('does not contain "undefined"', () => {
        expect(buildTrackingStopMessage()).not.toContain('undefined');
    });
});

// ────────────────────────────────────────────────────────────────
// setBackgroundLocationCallback
// ────────────────────────────────────────────────────────────────
describe('setBackgroundLocationCallback', () => {
    test('accepts a function without throwing', () => {
        expect(() => setBackgroundLocationCallback(() => {})).not.toThrow();
    });

    test('accepts null without throwing', () => {
        expect(() => setBackgroundLocationCallback(null)).not.toThrow();
    });

    test('can replace a callback with another without throwing', () => {
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        setBackgroundLocationCallback(cb1);
        expect(() => setBackgroundLocationCallback(cb2)).not.toThrow();
        setBackgroundLocationCallback(null);
    });
});

// ────────────────────────────────────────────────────────────────
// defineBackgroundLocationTask
// ────────────────────────────────────────────────────────────────
describe('defineBackgroundLocationTask', () => {
    test('does not throw when called', () => {
        expect(() => defineBackgroundLocationTask()).not.toThrow();
    });

    test('calls TaskManager.defineTask when task is not already defined', () => {
        (TaskManager.isTaskDefined as jest.Mock).mockReturnValue(false);
        defineBackgroundLocationTask();
        expect(TaskManager.defineTask).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK, expect.any(Function));
    });

    test('does NOT call defineTask when task is already defined', () => {
        (TaskManager.isTaskDefined as jest.Mock).mockReturnValue(true);
        defineBackgroundLocationTask();
        expect(TaskManager.defineTask).not.toHaveBeenCalled();
    });
});

// ────────────────────────────────────────────────────────────────
// startBackgroundTracking
// ────────────────────────────────────────────────────────────────
describe('startBackgroundTracking', () => {
    test('calls startLocationUpdatesAsync when not already running', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        await startBackgroundTracking();
        expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
            BACKGROUND_LOCATION_TASK,
            expect.objectContaining({ timeInterval: BG_LOCATION_INTERVAL_MS }),
        );
    });

    test('does NOT call startLocationUpdatesAsync when already running', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
        await startBackgroundTracking();
        expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    test('passes distanceInterval to startLocationUpdatesAsync', async () => {
        await startBackgroundTracking();
        expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
            BACKGROUND_LOCATION_TASK,
            expect.objectContaining({ distanceInterval: BG_LOCATION_DISTANCE_M }),
        );
    });
});

// ────────────────────────────────────────────────────────────────
// stopBackgroundTracking
// ────────────────────────────────────────────────────────────────
describe('stopBackgroundTracking', () => {
    test('calls stopLocationUpdatesAsync when tracking is active', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
        await stopBackgroundTracking();
        expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(BACKGROUND_LOCATION_TASK);
    });

    test('does NOT call stopLocationUpdatesAsync when tracking is not active', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        await stopBackgroundTracking();
        expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    });
});

// ────────────────────────────────────────────────────────────────
// isBackgroundTrackingActive
// ────────────────────────────────────────────────────────────────
describe('isBackgroundTrackingActive', () => {
    test('returns true when tracking is active', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
        expect(await isBackgroundTrackingActive()).toBe(true);
    });

    test('returns false when tracking is not active', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        expect(await isBackgroundTrackingActive()).toBe(false);
    });

    test('returns false when hasStartedLocationUpdatesAsync throws', async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockRejectedValue(new Error('fail'));
        expect(await isBackgroundTrackingActive()).toBe(false);
    });
});
