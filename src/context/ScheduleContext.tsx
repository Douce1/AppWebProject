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
        apiClient.getLessons()
            .then((lessons) => {
                if (!mounted) return;
                const mapped: ClassSession[] = lessons.map((lesson) => {
                    const start = new Date(lesson.startsAt);
                    const end = new Date(lesson.endsAt);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const date = lesson.startsAt.slice(0, 10);
                    const time = `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
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
            setEndedClassIds(prev => [...prev, id]);
            Alert.alert('강의 종료', '강의가 종료되었습니다.');

            setTimeout(() => {
                setReadyToReportIds(prev => [...prev, id]);
            }, 3000);
            return;
        }

        // 3. If can arrive, handle arrive
        if (canArriveIds.includes(id) && !arrivedIds.includes(id)) {
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
