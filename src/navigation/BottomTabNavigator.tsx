import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageCircle, FileText, DollarSign, User } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import DocsScreen from '../screens/DocsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === '홈') return <Home color={color} size={size} />;
                    if (route.name === '채팅') return <MessageCircle color={color} size={size} />;
                    if (route.name === '계약') return <FileText color={color} size={size} />;
                    if (route.name === '정산') return <DollarSign color={color} size={size} />;
                    if (route.name === '내 정보') return <User color={color} size={size} />;
                    return null;
                },
                tabBarActiveTintColor: '#2f95dc',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen name="홈" component={HomeScreen} />
            <Tab.Screen name="채팅" component={ChatScreen} />
            <Tab.Screen name="계약" component={DocsScreen} />
            <Tab.Screen name="정산" component={IncomeScreen} />
            <Tab.Screen name="내 정보" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
