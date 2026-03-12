/**
 * Background Location Tracking Service (#160)
 *
 * Tracks the instructor's location in the background during the DEPART → ARRIVE window.
 * Uses expo-location + expo-task-manager for OS-level background location updates.
 *
 * Policy:
 * - Only the single closest upcoming lesson is tracked
 * - Polling interval: 10 minutes (600 000 ms)
 * - Tracking starts after a successful DEPART checkin
 * - Tracking stops after a successful ARRIVE checkin
 * - App force-quit: tracking continuity is NOT guaranteed
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// ─── Constants ────────────────────────────────────────────────────────────────
export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

/** Minimum time between location updates (ms) — 10 minutes */
export const BG_LOCATION_INTERVAL_MS = 10 * 60 * 1000;

/** Minimum distance change to trigger an update (metres) — set low so time-based polling dominates */
export const BG_LOCATION_DISTANCE_M = 50;

// ─── Callback store ───────────────────────────────────────────────────────────
type LocationUpdateCallback = (coords: { lat: number; lng: number; accuracyMeters: number | undefined }) => void;

let _onLocationUpdate: LocationUpdateCallback | null = null;

/** Register a callback that will be called whenever the background task fires. */
export function setBackgroundLocationCallback(cb: LocationUpdateCallback | null): void {
    _onLocationUpdate = cb;
}

// ─── Task Definition ──────────────────────────────────────────────────────────
/**
 * This must be called at the top level of the app (before any rendering).
 * When the OS delivers a background location, the callback (if set) is invoked.
 */
export function defineBackgroundLocationTask(): void {
    if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
        TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }: any) => {
            if (error) return;
            const locations: Location.LocationObject[] = data?.locations ?? [];
            if (locations.length === 0) return;
            const latest = locations[locations.length - 1];
            if (!latest?.coords) return;
            _onLocationUpdate?.({
                lat: latest.coords.latitude,
                lng: latest.coords.longitude,
                accuracyMeters: latest.coords.accuracy ?? undefined,
            });
        });
    }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
/**
 * Start background location tracking.
 * Requires background location permission to be granted beforehand.
 * Safe to call multiple times — no-ops if already running.
 */
export async function startBackgroundTracking(): Promise<void> {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isRunning) return;

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: BG_LOCATION_INTERVAL_MS,
        distanceInterval: BG_LOCATION_DISTANCE_M,
        foregroundService: {
            notificationTitle: '이동 중 위치 추적',
            notificationBody: '수업 도착 체크인을 위해 위치를 추적 중입니다.',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
    });
}

/**
 * Stop background location tracking.
 * Safe to call when tracking is not running.
 */
export async function stopBackgroundTracking(): Promise<void> {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (!isRunning) return;
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
}

/**
 * Returns whether background tracking is currently active.
 */
export async function isBackgroundTrackingActive(): Promise<boolean> {
    return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
}

// ─── Nearest-lesson selector ──────────────────────────────────────────────────
export interface TrackedLesson {
    lessonId: string;
    startsAt: string; // ISO string
    venueLat: number | null;
    venueLng: number | null;
}

/**
 * From a list of lessons that are in DEPARTED state (awaiting ARRIVE),
 * returns the single lesson whose start time is closest to now.
 * Returns null if the list is empty.
 */
export function selectNearestDepartedLesson(
    lessons: TrackedLesson[],
    now: Date = new Date(),
): TrackedLesson | null {
    if (lessons.length === 0) return null;
    return lessons.reduce<TrackedLesson>((nearest, lesson) => {
        const tNearest = Math.abs(new Date(nearest.startsAt).getTime() - now.getTime());
        const tLesson = Math.abs(new Date(lesson.startsAt).getTime() - now.getTime());
        return tLesson < tNearest ? lesson : nearest;
    }, lessons[0]);
}

/**
 * Build a human-readable tracking start confirmation message.
 */
export function buildTrackingStartMessage(lesson: TrackedLesson): string {
    return `수업 도착까지 백그라운드 위치 추적을 시작합니다. (10분 간격)`;
}

/**
 * Build a human-readable tracking stop confirmation message.
 */
export function buildTrackingStopMessage(): string {
    return `도착이 확인되었습니다. 위치 추적을 종료합니다.`;
}
