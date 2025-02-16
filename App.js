import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import ProductionDataScreen from './screens/ProductionDataScreen';
import ProductionDetailScreen from './screens/ProductionDetailScreen';
import { View, ActivityIndicator } from 'react-native';
import { colors } from './styles/globalStyles';

const Stack = createNativeStackNavigator();

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyASES_8k2Grx0Zo3za5Z0mJuZxoEkSAKio",
  authDomain: "production-f18dd.firebaseapp.com",
  projectId: "production-f18dd",
  storageBucket: "production-f18dd.firebasestorage.app",
  messagingSenderId: "953263823099",
  appId: "1:953263823099:web:a1beb9e56f7e2aedd4385e",
  measurementId: "G-YXRCWH0LVR"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth com persistência
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listener para mudanças no estado de autenticação
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={user ? "ProductionData" : "Login"}
        screenOptions={{
          headerShown: false
        }}
      >
        {user ? (
          // Telas protegidas (usuário logado)
          <>
            <Stack.Screen name="ProductionData" component={ProductionDataScreen} />
            <Stack.Screen name="ProductionDetail" component={ProductionDetailScreen} />
          </>
        ) : (
          // Tela de login (usuário não logado)
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
