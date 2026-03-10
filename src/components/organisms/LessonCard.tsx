import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Button } from '../atoms/Button';
import { InstructorChip } from '../molecules/InstructorChip';
import { StatusBadgeGroup } from '../molecules/StatusBadgeGroup';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { MapPin, Clock } from 'lucide-react-native';

interface LessonCardProps {
    status: string; // e.g., 'confirmed', 'requested'
    badgeLabel: string;
    statusLabel: string;
    title: string;
    location: string;
    time: string;
    instructorName?: string;
    instructorRole?: string;
    instructorImageUrl?: string;
    onPressCard?: () => void;
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
    primaryActionDisabled?: boolean;
    primaryActionVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    isExternal?: boolean;
}

export function LessonCard({
    status,
    badgeLabel,
    statusLabel,
    title,
    location,
    time,
    instructorName,
    instructorRole,
    instructorImageUrl,
    onPressCard,
    primaryActionLabel,
    onPrimaryAction,
    primaryActionDisabled,
    primaryActionVariant,
    secondaryActionLabel,
    onSecondaryAction,
    isExternal,
}: LessonCardProps) {
    return (
        <TouchableOpacity
            activeOpacity={onPressCard ? 0.7 : 1}
            onPress={onPressCard}
            style={styles.card}
        >
            <View style={styles.headerRow}>
                <StatusBadgeGroup status={status} label={statusLabel} badgeLabel={badgeLabel} style={styles.badgeGroup} />
                {isExternal && (
                    <View style={styles.externalBadge}>
                        <Typography variant="caption" style={styles.externalBadgeText}>외부 등록</Typography>
                    </View>
                )}
            </View>

            <Typography variant="h3" style={styles.title}>{title}</Typography>

            <View style={styles.infoRow}>
                <MapPin size={16} color={Colors.mutedForeground} />
                <Typography variant="body2" color={Colors.mutedForeground} style={styles.infoText}>{location}</Typography>
            </View>

            <View style={styles.infoRow}>
                <Clock size={16} color={Colors.mutedForeground} />
                <Typography variant="body2" color={Colors.mutedForeground} style={styles.infoText}>{time}</Typography>
            </View>

            {instructorName && instructorRole && (
                <InstructorChip
                    name={instructorName}
                    role={instructorRole}
                    imageUrl={instructorImageUrl}
                    showChevron={false}
                    style={styles.instructor}
                />
            )}

            {(primaryActionLabel || secondaryActionLabel) && (
                <View style={styles.actionRow}>
                    {secondaryActionLabel && onSecondaryAction && (
                        <Button
                            variant="secondary"
                            title={secondaryActionLabel}
                            onPress={onSecondaryAction}
                            style={styles.actionButton}
                        />
                    )}
                    {primaryActionLabel && onPrimaryAction && (
                        <Button
                            variant={primaryActionDisabled ? "ghost" : (primaryActionVariant || "primary")}
                            disabled={primaryActionDisabled}
                            title={primaryActionLabel}
                            onPress={onPrimaryAction}
                            style={styles.actionButton}
                        />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radius.card,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 24,
        marginBottom: 16,
        ...Shadows.card,
    },
    badgeGroup: {
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    externalBadge: {
        backgroundColor: '#F1F5F9', // light slate
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    externalBadgeText: {
        color: '#64748B',
        fontWeight: 'bold',
        fontSize: 10,
    },
    title: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 6,
    },
    instructor: {
        marginTop: 8,
        marginBottom: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
    }
});
