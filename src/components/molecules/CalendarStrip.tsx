import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { Calendar as CalendarIcon } from 'lucide-react-native';

interface CalendarStripProps {
    dates: Date[]; // Array of dates to show in the strip
    activeDateStr: string; // ISO string format 'YYYY-MM-DD'
    onDateSelect: (dateStr: string) => void;
    onViewAll?: () => void;
    classesForDates?: Record<string, boolean>; // ex: {'2026-03-09': true}
}

export function CalendarStrip({ dates, activeDateStr, onDateSelect, onViewAll, classesForDates = {} }: CalendarStripProps) {
    const getWeekDayStr = (d: Date) => ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalISOString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Typography variant="subtitle1" weight="700">주간 일정</Typography>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll} style={styles.viewCalendarBtn}>
                        <Typography variant="body2" color="#F3C742" weight="500">전체 일정 확인</Typography>
                    </TouchableOpacity>
                )}
            </View>

            {/* Strip */}
            <View style={styles.weekRow}>
                {dates.map((date, idx) => {
                    const dateStr = toLocalISOString(date);
                    const isSelected = dateStr === activeDateStr;
                    const hasClass = classesForDates[dateStr];

                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.dayContainer, isSelected && styles.todayContainer]}
                            onPress={() => onDateSelect(dateStr)}
                        >
                            <Typography variant="caption" color={isSelected ? Colors.brandInk : Colors.mutedForeground} style={styles.dayText}>
                                {getWeekDayStr(date)}
                            </Typography>
                            <Typography variant="subtitle1" weight="600" color={isSelected ? Colors.brandInk : Colors.brandInk}>
                                {date.getDate()}
                            </Typography>
                            {hasClass && <View style={[styles.classIndicator, isSelected && { backgroundColor: Colors.brandInk }]} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.card,
        padding: 16,
        marginHorizontal: 16,
        borderRadius: Radius.card,
        borderTopRightRadius: 0,
        ...Shadows.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewCalendarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 16,
        width: 44,
    },
    todayContainer: {
        backgroundColor: Colors.brandHoney,
        borderTopRightRadius: 0,
    },
    dayText: {
        marginBottom: 4,
    },
    classIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.colorError,
        marginTop: 6,
    }
});
