import React, { createContext, useState, useContext } from 'react';

export interface ClassSession {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD format
    location: string;
    time: string;
}

interface ScheduleContextType {
    classes: ClassSession[];
    addClass: (newClass: ClassSession) => void;
}

const ScheduleContext = createContext<ScheduleContextType>({
    classes: [],
    addClass: () => { },
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

    const addClass = (newClass: ClassSession) => {
        setClasses(prev => [...prev, newClass]);
    };

    return (
        <ScheduleContext.Provider value={{ classes, addClass }}>
            {children}
        </ScheduleContext.Provider>
    );
};

export const useSchedule = () => useContext(ScheduleContext);
