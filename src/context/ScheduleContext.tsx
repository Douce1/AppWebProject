import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../api/apiClient';
import {
    buildPhaseMap,
    extractIdSets,
    transitionPhase,
    type CheckinPhase,
} from '../services/checkinStateMachine';
import { evaluateAllLessons, buildNotificationKey, type CurrentPosition } from '../services/gpsNotificationEngine';
import { queryKeys } from '../query/queryKeys';
import {
    useAttendanceEventsQuery,
    useLessonReportsQuery,
    useLessonRequestsQuery,
    useLessonsQuery,
} from '../query/hooks';
import type { ApiAttendanceEvent } from '../api/types';

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
    handleClassAction: (id: string) => Promise<void>;
    submitClassReport: (id: string, text: string) => Promise<void>;
    fetchLessons: () => Promise<void>;
    checkSmartAlerts: (position: CurrentPosition | null) => void;
    checkinPhases: Record<string, CheckinPhase>;
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
    handleClassAction: async () => { },
    submitClassReport: async () => { },
    fetchLessons: async () => { },
    checkSmartAlerts: () => { },
    checkinPhases: {},
});

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const lessonsQuery = useLessonsQuery();
    const lessonRequestsQuery = useLessonRequestsQuery();
    const attendanceEventsQuery = useAttendanceEventsQuery();
    const lessonReportsQuery = useLessonReportsQuery();
    const [manualClasses, setManualClasses] = useState<ClassSession[]>([]);

    const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
                const location = `${lesson.region} ${lesson.museum}`;
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

    const handleClassAction = async (id: string) => {
        // 1. If ready to report (handled by modal, so we skip it here but could alert)
        if (readyToReportIds.includes(id) && !reportedIds.includes(id)) {
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
            if (requestId) {
                try {
                    const coords = await getLocationForCheckin();
                    await apiClient.checkinByAssignment(requestId, {
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

            queryClient.setQueryData<ApiAttendanceEvent[]>(queryKeys.attendanceEvents, (prev = []) => [
                ...prev,
                {
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
            Alert.alert('강의 종료', '강의가 종료되었습니다.');
            return;
        }

        // 3. If can arrive, handle arrive
        if (canArriveIds.includes(id) && !arrivedIds.includes(id)) {
            const requestId = lessonRequestMap[id];
            if (requestId) {
                try {
                    const coords = await getLocationForCheckin();
                    await apiClient.checkinByAssignment(requestId, {
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

            queryClient.setQueryData<ApiAttendanceEvent[]>(queryKeys.attendanceEvents, (prev = []) => [
                ...prev,
                {
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
            Alert.alert('도착 완료', '도착이 등록되었습니다. 강의를 진행해주세요.');
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
            checkSmartAlerts, checkinPhases,
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
