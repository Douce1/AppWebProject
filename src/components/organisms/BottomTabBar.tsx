import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '@/constants/theme';
import { Typography } from '../atoms/Typography';
import { Home, MessageCircle, FileText, DollarSign, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={styles.container}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    const color = isFocused ? Colors.brandInk : Colors.mutedForeground;

                    let IconComponent = Home;
                    if (route.name === 'chat') IconComponent = MessageCircle;
                    if (route.name === 'docs') IconComponent = FileText;
                    if (route.name === 'income') IconComponent = DollarSign;
                    if (route.name === 'profile') IconComponent = User;

                    return (
                        <TouchableOpacity
                            key={index}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={(options as any).tabBarTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tab}
                            activeOpacity={0.8}
                        >
                            <IconComponent size={24} color={color} style={styles.icon} />
                            <Typography variant="caption" color={color} weight={isFocused ? "700" : "500"}>
                                {label as string}
                            </Typography>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: Colors.card,
        borderTopWidth: 1,
        borderTopColor: Colors.brandSand,
    },
    container: {
        flexDirection: 'row',
        height: 60,
        backgroundColor: Colors.card,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        marginBottom: 4,
    }
});
