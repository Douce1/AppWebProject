import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms/Typography';
import { Colors } from '@/constants/theme';

interface SegmentedTabsProps {
    tabs: string[];
    activeIndex: number;
    onChange: (index: number) => void;
}

export function SegmentedTabs({ tabs, activeIndex, onChange }: SegmentedTabsProps) {
    return (
        <View style={styles.container}>
            {tabs.map((tab, index) => {
                const isActive = index === activeIndex;
                return (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, isActive && styles.activeTab]}
                        onPress={() => onChange(index)}
                        activeOpacity={0.8}
                    >
                        <Typography
                            variant="subtitle2"
                            color={isActive ? Colors.brandInk : Colors.mutedForeground}
                            weight={isActive ? "700" : "500"}
                            align="center"
                        >
                            {tab}
                        </Typography>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Colors.brandCream,
        padding: 4,
        borderRadius: 16,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: Colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    }
});
