import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Button } from '../atoms/Button';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { CheckCircle2, UserCheck } from 'lucide-react-native';

interface CheckinFlowProps {
    visible: boolean;
    className: string;
    onConfirm: () => void;
    onCancel: () => void;
    isEndClass?: boolean;
}

export function CheckinFlow({ visible, className, onConfirm, onCancel, isEndClass = false }: CheckinFlowProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.iconContainer}>
                        {isEndClass ? <CheckCircle2 size={32} color={Colors.colorSuccess} /> : <UserCheck size={32} color={Colors.brandHoney} />}
                    </View>
                    <Typography variant="h2" align="center" style={styles.title}>
                        {isEndClass ? '강의 종료' : '강의 체크인'}
                    </Typography>
                    <Typography variant="body1" align="center" color={Colors.mutedForeground} style={styles.desc}>
                        {className}
                        {'\n'}
                        {isEndClass ? '강의를 종료하시겠습니까?' : '해당 강의에 도착하셨나요?'}
                    </Typography>

                    <View style={styles.actionRow}>
                        <Button variant="outline" title="취소" onPress={onCancel} style={styles.btn} />
                        <Button variant="primary" title="확인" onPress={onConfirm} style={styles.btn} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(37, 27, 16, 0.4)', // brandInk with opacity
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: Colors.card,
        borderRadius: Radius.card,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        ...Shadows.card,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        marginBottom: 8,
    },
    desc: {
        marginBottom: 24,
        lineHeight: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btn: {
        flex: 1,
    }
});
