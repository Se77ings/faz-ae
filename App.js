import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { initializeDatabase } from './src/infra/database/sqlite-connection';
import HomeScreen from './src/presentation/homeScreen';
import TaskFormPage from './src/presentation/taskForm';
import ViewTaskPage from './src/presentation/viewTaskPage';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="faz_ae.db" onInit={initializeDatabase}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#000000' } 
            }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TaskForm" component={TaskFormPage} />
            <Stack.Screen name="ViewTask" component={ViewTaskPage} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}