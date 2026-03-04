import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { ScheduleProvider } from './src/context/ScheduleContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function App() {
    return (
        <SafeAreaProvider>
            <ScheduleProvider>
                <NavigationContainer>
                    <BottomTabNavigator />
                    <StatusBar style="auto" />
                </NavigationContainer>
            </ScheduleProvider>
        </SafeAreaProvider>
    );
}
