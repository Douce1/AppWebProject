import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { apiClient } from '../api/apiClient';
import { startBackgroundTracking, stopBackgroundTracking, selectNearestDepartedLesson } from '../services/backgroundLocationTask';
import { buildCheckinResultUX } from '../utils/checkinResultUX';
import {
    buildPhaseMap,
    extractIdSets,
    transitionPhase,
    type CheckinPhase,
} from '../services/checkinStateMachine';
import { evaluateAllLessons, buildNotificationKey, type CurrentPosition } from '../services/gpsNotificationEngine';
import {
  createInitialDepartureAlertState,
  evaluateDepartureAlerts,
  evaluateMovementWithoutDeparture,
  applyFiredAlerts,
  updateLastEta,
  buildDepartureAlertMessage,
  type DepartureAlertState,
} from '../services/departureAlertService';
import { httpClient } from '../api/httpClient';
import { queryKeys } from '../query/queryKeys';
import {
    useAttendanceEventsQuery,
    useLessonReportsQuery,
    useLessonRequestsQuery,
    useLessonsQuery,
} from '../query/hooks';
import type { ApiAttendanceEvent } from '../api/types';
import { formatLessonCardLocation } from '../utils/lessonCardLocation';

export interface ClassSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  location: string;
  time: string;
  isExternal?: boolean;
  documentId?: string | null;
  venueName?: string;
  venueAddress?: string;
  venueLat?: number;
  venueLng?: number;
  kakaoPlaceId?: string;
}

export interface AppNotification {
    id: string;
    type: string;
    title: string;
    time: string;
    target: any;
}



export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

interface ScheduleContextType {
    classes: ClassSession[];
    addClass: (newClass: ClassSession) => void;
    notifications: AppNotification[];
    removeNotification: (id: string) => void;
    isProposalResolved: boolean;
    proposalStatus: '미응답' | '수락' | '거절';
    resolveProposal: (status?: '수락' | '거절') => void;

    departedIds: string[];
    canArriveIds: string[];
    arrivedIds: string[];
    canEndClassIds: string[];
    endedClassIds: string[];
    readyToReportIds: string[];
    reportedIds: string[];
    classReports: Record<string, string>;
    getClassReport: (id: string) => string | null;
    handleClassAction: (id: string) => Promise<'FINISHED' | void>;
    submitClassReport: (id: string, text: string) => Promise<void>;
    fetchLessons: () => Promise<void>;
    checkSmartAlerts: (position: CurrentPosition | null) => void;
    checkDepartureAlerts: (lessonId: string, lat: number, lng: number, hasDeparted: boolean, isMoving?: boolean) => Promise<void>;
    checkinPhases: Record<string, CheckinPhase>;

    // Location permission gate
    locationPermission: LocationPermissionStatus;
    requestLocationPermission: () => Promise<void>;
    openLocationSettings: () => void;
}

const ScheduleContext = createContext<ScheduleContextType>({
    classes: [],
    addClass: () => { },
    notifications: [],
    removeNotification: () => { },
    isProposalResolved: false,
    proposalStatus: '미응답',
    resolveProposal: () => { },
    departedIds: [],
    canArriveIds: [],
    arrivedIds: [],
    canEndClassIds: [],
    endedClassIds: [],
    readyToReportIds: [],
    reportedIds: [],
    classReports: {},
    getClassReport: () => null,
    handleClassAction: async () => { return undefined; },
    submitClassReport: async () => { },
    fetchLessons: async () => { },
    checkSmartAlerts: () => { },
    checkDepartureAlerts: async () => { },
    checkinPhases: {},
    locationPermission: 'undetermined',
    requestLocationPermission: async () => { },
    openLocationSettings: () => { },
});

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const lessonsQuery = useLessonsQuery();
    const lessonRequestsQuery = useLessonRequestsQuery();
    const attendanceEventsQuery = useAttendanceEventsQuery();
    const lessonReportsQuery = useLessonReportsQuery();
    const [manualClasses, setManualClasses] = useState<ClassSession[]>([]);

    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Location permission gate
    const [locationPermission, setLocationPermission] = useState<LocationPermissionStatus>('undetermined');

    useEffect(() => {
        // Check current permission status on mount
        Location.getForegroundPermissionsAsync().then(({ status }) => {
            setLocationPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
        }).catch(() => {
            setLocationPermission('undetermined');
        });
    }, []);

    const requestLocationPermission = useCallback(async () => {
        // Step 1: Request foreground permission
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            setLocationPermission('denied');
            Alert.alert(
                '위치 권한 필요',
                '출강 기능을 사용하려면 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '설정으로 이동', onPress: () => Linking.openSettings() },
                ],
            );
            return;
        }
        // Step 2: Request background permission
        try {
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus !== 'granted') {
                // Foreground is granted — partial permission OK for basic checkin
                setLocationPermission('granted');
            } else {
                setLocationPermission('granted');
            }
        } catch (error) {
            console.warn('Background location permission error:', error);
            // 권한 요청이 실패해도 Foreground 권한이 있으므로 넘어갑니다.
            setLocationPermission('granted');
        }
    }, []);

    const openLocationSettings = useCallback(() => {
        Linking.openSettings();
    }, []);

    const [proposalStatus, setProposalStatus] = useState<'미응답' | '수락' | '거절'>('미응답');
    const isProposalResolved = proposalStatus !== '미응답';

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const resolveProposal = (status: '수락' | '거절' = '수락') => {
        setProposalStatus(status);
        // 제안 상태만 업데이트하고, 더 이상 샘플 수업/알림은 추가하지 않는다.
    };

    const addClass = (newClass: ClassSession) => {
        setManualClasses(prev => [...prev, newClass]);
    };
    // 중복 알림 방지 키 집합 (GPS 스마트 알림 엔진 연동)
    const [firedNotificationKeys, setFiredNotificationKeys] = useState<Set<string>>(new Set());
    // 수업별 체크인 단계 (상태 머신)
    const [localCheckinPhases, setLocalCheckinPhases] = useState<Record<string, CheckinPhase>>({});
    // 출발 알림 서비스 상태
    const [departureAlertState, setDepartureAlertState] = useState<DepartureAlertState>(
      createInitialDepartureAlertState(),
    );

    const classes = useMemo(() => {
        const lessons = lessonsQuery.data ?? [];
        const mapped: ClassSession[] = lessons
            .filter((lesson) => lesson.status !== 'PENDING')
            .map((lesson) => {
                const start = new Date(lesson.startsAt);
                const end = new Date(lesson.endsAt);
                const pad = (n: number) => n.toString().padStart(2, '0');
                const date = lesson.startsAt.slice(0, 10);
                const time = `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(
                    end.getHours(),
                )}:${pad(end.getMinutes())}`;
                const location = formatLessonCardLocation({
                    region: lesson.region,
                    museum: lesson.museum,
                    venueName: lesson.venueName,
                });
                return {
                    id: lesson.lessonId,
                    title: lesson.lectureTitle,
                    date,
                    location,
                    time,
                    isExternal: lesson.isExternal,
                    documentId: lesson.documentId,
                    venueName: lesson.venueName,
                    venueAddress: lesson.venueAddress,
                    venueLat: lesson.venueLat,
                    venueLng: lesson.venueLng,
                    kakaoPlaceId: lesson.kakaoPlaceId,
                };
            });
        return [...mapped, ...manualClasses];
    }, [lessonsQuery.data, manualClasses]);

    const lessonRequestMap = useMemo(() => {
        const accepted = (lessonRequestsQuery.data ?? []).filter((r) => r.status === 'ACCEPTED');
        return accepted.reduce<Record<string, string>>((acc, request) => {
            acc[request.lessonId] = request.requestId;
            return acc;
        }, {});
    }, [lessonRequestsQuery.data]);

    const classReports = useMemo(() => {
        const reports = lessonReportsQuery.data ?? [];
        return reports.reduce<Record<string, string>>((acc, report) => {
            acc[report.lessonId] = report.content;
            return acc;
        }, {});
    }, [lessonReportsQuery.data]);

    const reportedIds = useMemo(() => Object.keys(classReports), [classReports]);

    const checkinPhases = useMemo(() => {
        const basePhaseMap = buildPhaseMap(
            ((attendanceEventsQuery.data ?? []) as ApiAttendanceEvent[]).map((event) => ({
                lessonId: event.lessonId,
                eventType: event.eventType,
                isValid: event.isValid,
            })),
        );

        reportedIds.forEach((lessonId) => {
            const current = basePhaseMap[lessonId] ?? 'ENDED';
            basePhaseMap[lessonId] = transitionPhase(current, 'REPORT');
        });

        return { ...basePhaseMap, ...localCheckinPhases };
    }, [attendanceEventsQuery.data, localCheckinPhases, reportedIds]);

    const {
        departedIds,
        arrivedIds,
        endedIds: endedClassIds,
        canArriveIds,
        canEndIds: canEndClassIds,
        readyToReportIds,
    } = useMemo(() => extractIdSets(checkinPhases), [checkinPhases]);

    const getClassReport = (id: string): string | null => classReports[id] ?? null;

    const fetchLessons = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.lessons }),
            queryClient.invalidateQueries({ queryKey: queryKeys.lessonRequests }),
            queryClient.invalidateQueries({ queryKey: queryKeys.attendanceEvents }),
            queryClient.invalidateQueries({ queryKey: queryKeys.lessonReports }),
        ]);
    };

    const handleClassAction = async (id: string): Promise<'FINISHED' | void> => {
        // 1. If ready to report (handled by modal, so we skip it here but could alert)
        if (readyToReportIds.includes(id) && !reportedIds.includes(id)) {
            return;
        }

        // Guard: ensure location permission is granted before any GPS-based action
        if (locationPermission !== 'granted') {
            Alert.alert(
                '위치 권한 필요',
                '출발/도착/종료 기능을 사용하려면 위치 권한이 필요합니다.',
                [
                    { text: '취소', style: 'cancel' },
                    { text: '설정으로 이동', onPress: () => Linking.openSettings() },
                ],
            );
            return;
        }

        const getLocationForCheckin = async (): Promise<{ lat: number; lng: number; accuracyMeters?: number } | null> => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return null;
                let position = await Location.getLastKnownPositionAsync();
                if (!position) {
                    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
                }
                if (!position?.coords) return null;
                return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracyMeters: position.coords.accuracy ?? undefined,
                };
            } catch {
                return null;
            }
        };

        // 2. If can end class, handle end class
        if (canEndClassIds.includes(id) && !endedClassIds.includes(id)) {
            const requestId = lessonRequestMap[id];
            let coords: Awaited<ReturnType<typeof getLocationForCheckin>> = null;
            let finishResult: ApiAttendanceEvent | null = null;
            if (requestId) {
                try {
                    coords = await getLocationForCheckin();
                    finishResult = await apiClient.checkinByAssignment(requestId, {
                        eventType: 'FINISH',
                        idempotencyKey: `FINISH_${requestId}_${Date.now()}`,
                        lat: coords?.lat ?? 0,
                        lng: coords?.lng ?? 0,
                        accuracyMeters: coords?.accuracyMeters,
                        occurredAt: new Date().toISOString(),
                    });
                } catch {
                    Alert.alert('전송 실패', '강의 종료 체크인을 서버에 보내지 못했습니다. 다시 시도해주세요.');
                    return;
                }
            }

            // Show retry/guidance UX based on server response
            if (finishResult) {
                const ux = buildCheckinResultUX({
                    isValid: finishResult.isValid,
                    locationStatus: finishResult.locationStatus,
                    distanceMeters: finishResult.distanceMeters,
                    accuracyMeters: finishResult.accuracyMeters,
                });
                if (ux.canRetry) {
                    Alert.alert(ux.title, ux.message);
                    return;
                }
                if (ux.type === 'SUCCESS_WITH_WARNING') {
                    Alert.alert(ux.title, ux.message);
                }
            }

            queryClient.setQueryData<ApiAttendanceEvent[]>(queryKeys.attendanceEvents, (prev = []) => [
                ...prev,
                finishResult ?? {
                    attendanceEventId: `optimistic-finish-${requestId ?? id}`,
                    companyId: '',
                    lessonId: id,
                    instructorId: '',
                    eventType: 'FINISH',
                    occurredAt: new Date().toISOString(),
                    lat: coords?.lat ?? 0,
                    lng: coords?.lng ?? 0,
                    accuracyMeters: coords?.accuracyMeters ?? 0,
                    distanceMeters: 0,
                    timingStatus: 'ON_TIME',
                    locationStatus: 'OK',
                    isValid: true,
                },
            ]);
            setLocalCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'ARRIVED', 'FINISH') }));
            return 'FINISHED';
        }

        // 3. If can arrive, handle arrive
        if (canArriveIds.includes(id) && !arrivedIds.includes(id)) {
            const requestId = lessonRequestMap[id];
            let coords: Awaited<ReturnType<typeof getLocationForCheckin>> = null;
            let arriveResult: ApiAttendanceEvent | null = null;
            if (requestId) {
                try {
                    coords = await getLocationForCheckin();
                    arriveResult = await apiClient.checkinByAssignment(requestId, {
                        eventType: 'ARRIVE',
                        idempotencyKey: `ARRIVE_${requestId}_${Date.now()}`,
                        lat: coords?.lat ?? 0,
                        lng: coords?.lng ?? 0,
                        accuracyMeters: coords?.accuracyMeters,
                        occurredAt: new Date().toISOString(),
                    });
                } catch {
                    Alert.alert('전송 실패', '도착 체크인을 서버에 보내지 못했습니다. 다시 시도해주세요.');
                    return;
                }
            }

            // Show retry/guidance UX based on server response
            if (arriveResult) {
                const ux = buildCheckinResultUX({
                    isValid: arriveResult.isValid,
                    locationStatus: arriveResult.locationStatus,
                    distanceMeters: arriveResult.distanceMeters,
                    accuracyMeters: arriveResult.accuracyMeters,
                });
                if (ux.canRetry) {
                    Alert.alert(ux.title, ux.message);
                    return;
                }
                // Show warning even on success if suspicious
                if (ux.type === 'SUCCESS_WITH_WARNING') {
                    Alert.alert(ux.title, ux.message);
                }
            }

            queryClient.setQueryData<ApiAttendanceEvent[]>(queryKeys.attendanceEvents, (prev = []) => [
                ...prev,
                arriveResult ?? {
                    attendanceEventId: `optimistic-arrive-${requestId ?? id}`,
                    companyId: '',
                    lessonId: id,
                    instructorId: '',
                    eventType: 'ARRIVE',
                    occurredAt: new Date().toISOString(),
                    lat: coords?.lat ?? 0,
                    lng: coords?.lng ?? 0,
                    accuracyMeters: coords?.accuracyMeters ?? 0,
                    distanceMeters: 0,
                    timingStatus: 'ON_TIME',
                    locationStatus: 'OK',
                    isValid: true,
                },
            ]);
            setLocalCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'DEPARTED', 'ARRIVE') }));
            if (!arriveResult || arriveResult.locationStatus !== 'SUSPICIOUS') {
                Alert.alert('도착 완료', '도착이 등록되었습니다. 강의를 진행해주세요.');
            }

            // Stop background location tracking — ARRIVE completed
            stopBackgroundTracking().catch(() => {});

            return;
        }

        // 4. Normal Depart logic
        if (!departedIds.includes(id)) {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('권한 필요', '위치 권한이 필요합니다.');
                    return;
                }
                let location = await Location.getLastKnownPositionAsync();
                if (!location) {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
                }

                const requestId = lessonRequestMap[id];
                if (requestId && location) {
                    try {
                        await apiClient.checkinByAssignment(requestId, {
                            eventType: 'DEPART',
                            idempotencyKey: `DEPART_${requestId}_${Date.now()}`,
                            lat: location.coords.latitude,
                            lng: location.coords.longitude,
                            accuracyMeters: location.coords.accuracy ?? undefined,
                            occurredAt: new Date().toISOString(),
                        });
                    } catch {
                        Alert.alert('전송 실패', '출발 체크인을 서버에 보내지 못했습니다. 다시 시도해주세요.');
                        return;
                    }
                }

                queryClient.setQueryData<ApiAttendanceEvent[]>(queryKeys.attendanceEvents, (prev = []) => [
                    ...prev,
                    {
                        attendanceEventId: `optimistic-depart-${requestId ?? id}`,
                        companyId: '',
                        lessonId: id,
                        instructorId: '',
                        eventType: 'DEPART',
                        occurredAt: new Date().toISOString(),
                        lat: location.coords.latitude,
                        lng: location.coords.longitude,
                        accuracyMeters: location.coords.accuracy ?? 0,
                        distanceMeters: 0,
                        timingStatus: 'ON_TIME',
                        locationStatus: 'OK',
                        isValid: true,
                    },
                ]);
                setLocalCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'IDLE', 'DEPART') }));
                Alert.alert('출발 완료', '출발이 등록되었습니다. 안전하게 이동하세요.');

                // Start background location tracking for DEPART → ARRIVE window
                try {
                    // Pick nearest departed lesson (including the just-departed one)
                    const departedLessonsForTracking = classes
                        .filter(c => c.id === id)
                        .map(c => ({
                            lessonId: c.id,
                            startsAt: c.date + 'T' + (c.time.split(' - ')[0]?.trim() ?? '09:00') + ':00',
                            venueLat: c.venueLat ?? null,
                            venueLng: c.venueLng ?? null,
                        }));
                    const nearest = selectNearestDepartedLesson(departedLessonsForTracking);
                    if (nearest) {
                        await startBackgroundTracking();
                    }
                } catch {
                    // Background tracking failure is non-fatal
                }

            } catch {
                Alert.alert('오류', '위치를 가져오는데 실패했습니다.');
            }
        }
    };

    const submitClassReport = async (id: string, text: string): Promise<void> => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const previousReports = queryClient.getQueryData(queryKeys.lessonReports) as any[] | undefined;
        queryClient.setQueryData<any[]>(queryKeys.lessonReports, (prev = []) => [
            ...prev.filter((report) => report.lessonId !== id),
            {
                lessonReportId: `optimistic-report-${id}`,
                companyId: '',
                lessonId: id,
                instructorId: '',
                content: trimmed,
                submittedAt: new Date().toISOString(),
            },
        ]);
        setLocalCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'ENDED', 'REPORT') }));

        try {
            const report = await apiClient.submitLessonReport(id, trimmed);
            queryClient.setQueryData<any[]>(queryKeys.lessonReports, (prev = []) => [
                ...prev.filter((item) => item.lessonId !== id),
                report,
            ]);
        } catch {
            queryClient.setQueryData(queryKeys.lessonReports, previousReports ?? []);
            throw new Error('보고서 저장에 실패했습니다. 다시 시도해주세요.');
        }
    };

    /**
     * 출발 알림 서비스 연동:
     * 주어진 수업에 대해 통근 리스크 API를 조회하고,
     * 정책에 따라 최초 출발 알림 / ETA 악화 후속 알림을 발송합니다.
     */
    const checkDepartureAlerts = async (
      lessonId: string,
      lat: number,
      lng: number,
      hasDeparted: boolean,
      isMoving: boolean = false,
    ): Promise<void> => {
      try {
        const [risk, policy] = await Promise.all([
          httpClient.getCommuteRisk(lessonId, lat, lng),
          httpClient.getCommuteAlertPolicy(),
        ]);

        let currentState = departureAlertState;
        const newNotifications: AppNotification[] = [];

        // 출발 알림 평가
        const departureAlerts = evaluateDepartureAlerts({
          lessonId,
          risk,
          policy,
          hasDeparted,
          state: currentState,
        });

        for (const alert of departureAlerts) {
          const msg = buildDepartureAlertMessage(alert);
          newNotifications.push({
            id: `departure-${alert.alertType}-${lessonId}-${Date.now()}`,
            type: alert.alertType,
            title: msg.title,
            time: new Date().toISOString(),
            target: { lessonId, riskLevel: alert.riskLevel, etaMinutes: alert.etaMinutes },
          });
        }

        // 출발 미확인 이동 감지 알림 평가
        const movementAlerts = evaluateMovementWithoutDeparture({
          lessonId,
          isMoving,
          policy,
          hasDeparted,
          state: currentState,
        });

        for (const alert of movementAlerts) {
          const msg = buildDepartureAlertMessage(alert);
          newNotifications.push({
            id: `departure-${alert.alertType}-${lessonId}-${Date.now()}`,
            type: alert.alertType,
            title: msg.title,
            time: new Date().toISOString(),
            target: { lessonId },
          });
        }

        const allFired = [...departureAlerts, ...movementAlerts];
        if (allFired.length > 0) {
          currentState = applyFiredAlerts(currentState, allFired);
          setDepartureAlertState(currentState);
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          // ETA 기록 업데이트 (알림 없어도 추적)
          setDepartureAlertState((prev) => updateLastEta(prev, lessonId, risk.etaMinutes));
        }
      } catch {
        // 네트워크 오류 등은 조용히 무시 (알림 누락은 허용)
      }
    };

    /**
     * GPS 스마트 알림 엔진 연동:
     * 앱 진입/재개 시 현재 위치를 받아 수업별 알림 필요 여부를 평가하고
     * 중복 없이 알림을 추가합니다.
     */
    const checkSmartAlerts = (position: CurrentPosition | null) => {
        const now = new Date();
        const lessonsForAlert = classes.map((c) => ({
            lessonId: c.id,
            startsAt: c.date + 'T' + (c.time.split(' - ')[0] ?? '09:00') + ':00',
            venueLat: c.venueLat ?? null,
            venueLng: c.venueLng ?? null,
        }));
        const results = evaluateAllLessons(lessonsForAlert, position, firedNotificationKeys, now);
        if (results.length === 0) return;

        const newKeys = new Set(firedNotificationKeys);
        const newNotifications: AppNotification[] = [];

        results.forEach(({ lessonId, alerts }) => {
            const cls = classes.find((c) => c.id === lessonId);
            alerts.forEach((alertType) => {
                const key = buildNotificationKey(lessonId, alertType, now);
                if (!newKeys.has(key)) {
                    newKeys.add(key);
                    const title =
                        alertType === 'DEPARTURE' ? '출발 필요'
                        : alertType === 'LATE_RISK' ? '지각 위험'
                        : '도착 가능';
                    const body =
                        alertType === 'ARRIVAL_PROXIMITY'
                            ? `${cls?.title ?? '수업'} 목적지 근처에 도착했습니다.`
                            : `${cls?.title ?? '수업'} 시작 전에 출발하세요.`;
                    newNotifications.push({
                        id: key,
                        type: alertType,
                        title,
                        time: now.toISOString(),
                        target: { lessonId },
                    });
                }
            });
        });

        if (newNotifications.length > 0) {
            setFiredNotificationKeys(newKeys);
            setNotifications((prev) => [...prev, ...newNotifications]);
        }
    };

    return (
        <ScheduleContext.Provider value={{
            classes, addClass, notifications, removeNotification, isProposalResolved, proposalStatus, resolveProposal,
            departedIds, canArriveIds, arrivedIds, canEndClassIds, endedClassIds, readyToReportIds, reportedIds,
            classReports, getClassReport, handleClassAction, submitClassReport, fetchLessons,
            checkSmartAlerts, checkDepartureAlerts, checkinPhases,
            locationPermission, requestLocationPermission, openLocationSettings,
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
