import React, { createContext, useState, useContext } from 'react';

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
    resolveProposal: () => void;
}

const ScheduleContext = createContext<ScheduleContextType>({
    classes: [],
    addClass: () => { },
    notifications: [],
    removeNotification: () => { },
    isProposalResolved: false,
    resolveProposal: () => { }
});

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [classes, setClasses] = useState<ClassSession[]>([
        {
            id: '1',
            title: 'Mathematics Intro',
            date: new Date().toISOString().split('T')[0], // Today
            location: 'Seoul Gangnam-gu, Building A 301',
            time: '14:00 - 16:00'
        }
    ]);

    const [notifications, setNotifications] = useState<AppNotification[]>([
        {
            id: '1',
            type: '💬 신규메시지',
            title: '관리자님: 네 알겠습니다. 수고하세요.',
            time: '1시간전',
            target: '/chat',
        },
        {
            id: '2',
            type: '📄 요청/제안',
            title: '강남본원 회화 신규 강의 배정 제안',
            time: '어제',
            target: { pathname: '/(tabs)/docs', params: { targetTab: '요청/제안' } },
        }
    ]);

    const [isProposalResolved, setIsProposalResolved] = useState(false);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const resolveProposal = () => {
        setIsProposalResolved(true);
    };

    const addClass = (newClass: ClassSession) => {
        setClasses(prev => [...prev, newClass]);
    };

    return (
        <ScheduleContext.Provider value={{ classes, addClass, notifications, removeNotification, isProposalResolved, resolveProposal }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
