import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '../api/apiClient';

export interface ClassSession {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD format
    location: string;
    time: string;
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
    submitClassReport: (id: string, text: string) => void;
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
    submitClassReport: () => { }
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

    const getClassReport = (id: string): string | null => classReports[id] ?? null;

    useEffect(() => {
        let mounted = true;
        apiClient
            .getLessons()
            .then((lessons) => {
                if (!mounted) return;
                const mapped: ClassSession[] = lessons.map((lesson) => {
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
                    };
                });
                setClasses(mapped);

                // 수업 요청(assignment)과 lessonId 매핑 + 출강 이벤트 초기 상태 로드
                Promise.all([apiClient.getLessonRequests(), apiClient.getAttendanceEvents()])
                    .then(([requests, events]) => {
                        if (!mounted) return;

                        // 1) lessonId -> requestId 매핑 (ACCEPTED만)
                        const accepted = requests.filter((r) => r.status === 'ACCEPTED');
                        const nextMap: Record<string, string> = {};
                        accepted.forEach((r) => {
                            nextMap[r.lessonId] = r.requestId;
                        });
                        setLessonRequestMap(nextMap);

                        // 2) 출강 이벤트 기반으로 departed/arrived/ended 및 다음 단계(canArrive/canEnd)를 복원
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
                    })
                    .catch(() => {
                        // 이벤트/요청 정보를 못 가져와도 기본 동작(로컬 상태)만 유지
                    });
            })
            .catch(() => {
                // 실패 시에는 기존 빈 상태 유지
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleClassAction = async (id: string) => {
        // 1. If ready to report (handled by modal, so we skip it here but could alert)
        if (readyToReportIds.includes(id) && !reportedIds.includes(id)) {
            return;
        }

        // 2. If can end class, handle end class
        if (canEndClassIds.includes(id) && !endedClassIds.includes(id)) {
            const requestId = lessonRequestMap[id];
            if (requestId) {
                try {
                    await apiClient.checkinByAssignment(requestId, {
                        eventType: 'FINISH',
                        idempotencyKey: `FINISH_${requestId}_${Date.now()}`,
                        lat: 0,
                        lng: 0,
                    });
                } catch {
                    // 백엔드 저장 실패 시에도 로컬 상태는 유지
                }
            }

            setEndedClassIds(prev => [...prev, id]);
            Alert.alert('강의 종료', '강의가 종료되었습니다.');

            setTimeout(() => {
                setReadyToReportIds(prev => [...prev, id]);
            }, 3000);
            return;
        }

        // 3. If can arrive, handle arrive
        if (canArriveIds.includes(id) && !arrivedIds.includes(id)) {
            const requestId = lessonRequestMap[id];
            if (requestId) {
                try {
                    await apiClient.checkinByAssignment(requestId, {
                        eventType: 'ARRIVE',
                        idempotencyKey: `ARRIVE_${requestId}_${Date.now()}`,
                        lat: 0,
                        lng: 0,
                    });
                } catch {
                    // 백엔드 저장 실패 시에도 로컬 상태는 유지
                }
            }

            setArrivedIds(prev => [...prev, id]);
            Alert.alert('도착 완료', '도착이 등록되었습니다. 강의를 진행해주세요.');

            setTimeout(() => {
                setCanEndClassIds(prev => [...prev, id]);
            }, 3000);
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
                        // 백엔드 저장 실패 시에도 로컬 상태는 유지
                    }
                }

                setDepartedIds(prev => [...prev, id]);
                Alert.alert('출발 완료', '출발이 등록되었습니다. 안전하게 이동하세요.');

                setTimeout(() => {
                    setCanArriveIds(prev => [...prev, id]);
                }, 3000);

            } catch (error) {
                Alert.alert('오류', '위치를 가져오는데 실패했습니다.');
            }
        }
    };

    const submitClassReport = (id: string, text: string) => {
        setReportedIds(prev => [...prev, id]);
        if (text.trim()) {
            setClassReports(prev => ({ ...prev, [id]: text.trim() }));
        }
    };

    return (
        <ScheduleContext.Provider value={{
            classes, addClass, notifications, removeNotification, isProposalResolved, proposalStatus, resolveProposal,
            departedIds, canArriveIds, arrivedIds, canEndClassIds, endedClassIds, readyToReportIds, reportedIds,
            classReports, getClassReport, handleClassAction, submitClassReport
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
