import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
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

export interface ChatMessage {
    id: string;
    roomId: string;
    companyName: string;
    text: string;
    isMine: boolean;
    time: string;
    isRead?: boolean;
}

interface ScheduleContextType {
    classes: ClassSession[];
    addClass: (newClass: ClassSession) => void;
    notifications: AppNotification[];
    removeNotification: (id: string) => void;
    isProposalResolved: boolean;
    proposalStatus: '미응답' | '수락' | '거절';
    resolveProposal: (status?: '수락' | '거절') => void;
    chatMessages: ChatMessage[];
    addChatMessage: (msg: ChatMessage) => void;
    markChatRoomAsRead: (roomId: string) => void;

    departedIds: string[];
    canArriveIds: string[];
    arrivedIds: string[];
    canEndClassIds: string[];
    endedClassIds: string[];
    readyToReportIds: string[];
    reportedIds: string[];
    handleClassAction: (id: string) => Promise<void>;
    submitClassReport: (id: string) => void;
}

const ScheduleContext = createContext<ScheduleContextType>({
    classes: [],
    addClass: () => { },
    notifications: [],
    removeNotification: () => { },
    isProposalResolved: false,
    proposalStatus: '미응답',
    resolveProposal: () => { },
    chatMessages: [],
    addChatMessage: () => { },
    markChatRoomAsRead: () => { },
    departedIds: [],
    canArriveIds: [],
    arrivedIds: [],
    canEndClassIds: [],
    endedClassIds: [],
    readyToReportIds: [],
    reportedIds: [],
    handleClassAction: async () => { },
    submitClassReport: () => { }
});

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [classes, setClasses] = useState<ClassSession[]>([]);

    const [notifications, setNotifications] = useState<AppNotification[]>([
        {
            id: '2',
            type: '📄 요청/제안',
            title: '강남본원 회화 신규 강의 배정 제안',
            time: '어제',
            target: { pathname: '/(tabs)/docs', params: { targetTab: '요청/제안' } },
        }
    ]);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { id: (Date.now() - 86400000 * 2).toString(), roomId: 'room-2', companyName: '종로 어학원', text: '이번 주 금요일 회식 참석 가능하신가요?', isMine: false, time: '어제', isRead: true },
        { id: (Date.now() - 86400000).toString(), roomId: 'room-2', companyName: '종로 어학원', text: '네 참석 가능합니다!', isMine: true, time: '어제', isRead: true },
        { id: (Date.now() - 7200000).toString(), roomId: 'room-3', companyName: '분당 수능관', text: '다음 주 강의 자료 미리 부탁드립니다.', isMine: false, time: '09:30 AM', isRead: false },
        { id: Date.now().toString(), roomId: 'room-1', companyName: '강남본원 회화', text: '강의 제안에 대해 확인해주세요.', isMine: false, time: '10:00 AM', isRead: false }
    ]);

    const [proposalStatus, setProposalStatus] = useState<'미응답' | '수락' | '거절'>('미응답');
    const isProposalResolved = proposalStatus !== '미응답';

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const resolveProposal = (status: '수락' | '거절' = '수락') => {
        setProposalStatus(status);
        if (status === '수락') {
            addClass({
                id: 'proposed-1',
                title: '고3 EBS 파이널 문풀',
                date: '2026-03-10',
                location: '강남본원 3관 302호',
                time: '18:00 - 20:00'
            });
        }
    };

    const addClass = (newClass: ClassSession) => {
        setClasses(prev => [...prev, newClass]);
    };

    const addChatMessage = (msg: ChatMessage) => {
        setChatMessages(prev => [...prev, msg]);
    };

    const markChatRoomAsRead = (roomId: string) => {
        setChatMessages(prev => {
            const hasUnread = prev.some(msg => msg.roomId === roomId && !msg.isRead && !msg.isMine);
            if (!hasUnread) return prev;
            return prev.map(msg => (msg.roomId === roomId && !msg.isRead && !msg.isMine) ? { ...msg, isRead: true } : msg);
        });
    };

    const [departedIds, setDepartedIds] = useState<string[]>([]);
    const [canArriveIds, setCanArriveIds] = useState<string[]>([]);
    const [arrivedIds, setArrivedIds] = useState<string[]>([]);
    const [canEndClassIds, setCanEndClassIds] = useState<string[]>([]);
    const [endedClassIds, setEndedClassIds] = useState<string[]>([]);
    const [readyToReportIds, setReadyToReportIds] = useState<string[]>([]);
    const [reportedIds, setReportedIds] = useState<string[]>([]);

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

    const submitClassReport = (id: string) => {
        setReportedIds(prev => [...prev, id]);
    };

    return (
        <ScheduleContext.Provider value={{
            classes, addClass, notifications, removeNotification, isProposalResolved, proposalStatus, resolveProposal, chatMessages, addChatMessage, markChatRoomAsRead,
            departedIds, canArriveIds, arrivedIds, canEndClassIds, endedClassIds, readyToReportIds, reportedIds, handleClassAction, submitClassReport
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
