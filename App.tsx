import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import ClassDetailScreen from './src/screens/ClassDetailScreen';
import { ScheduleProvider } from './src/context/ScheduleContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <SafeAreaProvider>
            <ScheduleProvider>
                <NavigationContainer>
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
                        <Stack.Screen name="ClassDetail" component={ClassDetailScreen} />
                    </Stack.Navigator>
                    <StatusBar style="auto" />
                </NavigationContainer>
            </ScheduleProvider>
        </SafeAreaProvider>
    );
}
