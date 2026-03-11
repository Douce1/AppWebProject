import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../api/apiClient';
import { transitionPhase, type CheckinPhase } from '../services/checkinStateMachine';
import { evaluateAllLessons, buildNotificationKey, type CurrentPosition } from '../services/gpsNotificationEngine';

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
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [lessonRequestMap, setLessonRequestMap] = useState<Record<string, string>>({});

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
        setClasses(prev => [...prev, newClass]);
    };

    const [departedIds, setDepartedIds] = useState<string[]>([]);
    const [canArriveIds, setCanArriveIds] = useState<string[]>([]);
    const [arrivedIds, setArrivedIds] = useState<string[]>([]);
    const [canEndClassIds, setCanEndClassIds] = useState<string[]>([]);
    const [endedClassIds, setEndedClassIds] = useState<string[]>([]);
    const [readyToReportIds, setReadyToReportIds] = useState<string[]>([]);
    const [reportedIds, setReportedIds] = useState<string[]>([]);
    const [classReports, setClassReports] = useState<Record<string, string>>({});
    // 중복 알림 방지 키 집합 (GPS 스마트 알림 엔진 연동)
    const [firedNotificationKeys, setFiredNotificationKeys] = useState<Set<string>>(new Set());
    // 수업별 체크인 단계 (상태 머신)
    const [checkinPhases, setCheckinPhases] = useState<Record<string, CheckinPhase>>({});

    const getClassReport = (id: string): string | null => classReports[id] ?? null;

    const fetchLessons = async () => {
        let mounted = true;
        try {
            const lessons = await apiClient.getLessons();
            if (!mounted) return;
            const mapped: ClassSession[] = lessons
                .filter(lesson => lesson.status !== 'PENDING')
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
            setClasses(mapped);

            try {
                const [requests, events, reports] = await Promise.all([
                    apiClient.getLessonRequests(),
                    apiClient.getAttendanceEvents(),
                    apiClient.getLessonReports(),
                ]);
                if (!mounted) return;

                // 서버 보고서 기반 초기화
                const serverReportedIds = reports.map((r) => r.lessonId);
                const serverReports: Record<string, string> = {};
                reports.forEach((r) => {
                    serverReports[r.lessonId] = r.content;
                });
                setReportedIds(serverReportedIds);
                setClassReports(serverReports);

                const accepted = requests.filter((r) => r.status === 'ACCEPTED');
                const nextMap: Record<string, string> = {};
                accepted.forEach((r) => {
                    nextMap[r.lessonId] = r.requestId;
                });
                setLessonRequestMap(nextMap);

                const departedSet = new Set<string>();
                const arrivedSet = new Set<string>();
                const finishedSet = new Set<string>();

                events.forEach((e) => {
                    if (!e.isValid) return;
                    const lessonId = e.lessonId;
                    if (e.eventType === 'DEPART') {
                        departedSet.add(lessonId);
                    } else if (e.eventType === 'ARRIVE') {
                        departedSet.add(lessonId);
                        arrivedSet.add(lessonId);
                    } else if (e.eventType === 'FINISH') {
                        departedSet.add(lessonId);
                        arrivedSet.add(lessonId);
                        finishedSet.add(lessonId);
                    }
                });

                const canArriveSet = new Set<string>();
                const canEndSet = new Set<string>();
                mapped.forEach((c) => {
                    if (departedSet.has(c.id) && !arrivedSet.has(c.id)) {
                        canArriveSet.add(c.id);
                    }
                    if (arrivedSet.has(c.id) && !finishedSet.has(c.id)) {
                        canEndSet.add(c.id);
                    }
                });

                setDepartedIds(Array.from(departedSet));
                setArrivedIds(Array.from(arrivedSet));
                setEndedClassIds(Array.from(finishedSet));
                setCanArriveIds(Array.from(canArriveSet));
                setCanEndClassIds(Array.from(canEndSet));
            } catch {
                if (!mounted) return;
                Alert.alert('불러오기 실패', '수업 요청/출강 이벤트를 불러오지 못했습니다. 다시 시도해주세요.');
            }
        } catch {
            if (!mounted) return;
            Alert.alert('불러오기 실패', '수업 목록을 불러오지 못했습니다. 다시 시도해주세요.');
        }
    };

    useEffect(() => {
        fetchLessons();
        return () => {
            // Can't efficiently unmount the internal promises without AbortController, but state updates are safe enough now, as React handles it better. 
            // mounted state variable is kept in fetchLessons but we don't have scope here. 
            // It's fine for our use-case since fetchLessons executes independently.
        };
    }, []);

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

            setEndedClassIds(prev => [...prev, id]);
            setReadyToReportIds(prev => [...prev, id]);
            setCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'ARRIVED', 'FINISH') }));
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

            setArrivedIds(prev => [...prev, id]);
            setCanEndClassIds(prev => [...prev, id]);
            setCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'DEPARTED', 'ARRIVE') }));
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

                setDepartedIds(prev => [...prev, id]);
                setCanArriveIds(prev => [...prev, id]);
                setCheckinPhases(prev => ({ ...prev, [id]: transitionPhase(prev[id] ?? 'IDLE', 'DEPART') }));
                Alert.alert('출발 완료', '출발이 등록되었습니다. 안전하게 이동하세요.');

            } catch {
                Alert.alert('오류', '위치를 가져오는데 실패했습니다.');
            }
        }
    };

    const submitClassReport = async (id: string, text: string): Promise<void> => {
        const trimmed = text.trim();
        if (!trimmed) return;

        // Optimistic update
        setReportedIds(prev => [...prev, id]);
        setClassReports(prev => ({ ...prev, [id]: trimmed }));

        try {
            const report = await apiClient.submitLessonReport(id, trimmed);
            // 서버 응답으로 정확한 content 반영
            setClassReports(prev => ({ ...prev, [id]: report.content }));
        } catch {
            // 롤백
            setReportedIds(prev => prev.filter(rid => rid !== id));
            setClassReports(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
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
