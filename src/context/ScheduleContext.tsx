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
    target: string;
}

interface ScheduleContextType {
    classes: ClassSession[];
    addClass: (newClass: ClassSession) => void;
    notifications: AppNotification[];
    removeNotification: (id: string) => void;
    isProposalResolved: boolean;
    setProposalResolved: (resolved: boolean) => void;
}

const ScheduleContext = createContext<ScheduleContextType>({
    classes: [],
    addClass: () => { },
    notifications: [],
    removeNotification: () => { },
    isProposalResolved: false,
    setProposalResolved: () => { },
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
            id: 'notif-1',
            type: '요청/제안',
            title: '강남본원 회화 신규 강의 배정 제안',
            time: '방금 전',
            target: '/(tabs)/docs',
        }
    ]);

    const [isProposalResolved, setProposalResolved] = useState(false);

    const addClass = (newClass: ClassSession) => {
        setClasses(prev => [...prev, newClass]);
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <ScheduleContext.Provider
            value={{
                classes,
                addClass,
                notifications,
                removeNotification,
                isProposalResolved,
                setProposalResolved,
            }}
        >
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
