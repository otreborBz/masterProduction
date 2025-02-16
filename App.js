import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import ProductionDataScreen from './screens/ProductionDataScreen';
import ProductionDetailScreen from './screens/ProductionDetailScreen';
import { View, ActivityIndicator } from 'react-native';
import { colors } from './styles/globalStyles';

const Stack = createNativeStackNavigator();

// Configuração do Firebase
const firebaseConfig = {
  // colocar as configuracoes do firebase
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth com persistência
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

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