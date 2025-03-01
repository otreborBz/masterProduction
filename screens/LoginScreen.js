import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { globalStyles, colors } from '../styles/globalStyles';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const auth = getAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Erro', 'Email ou senha inválidos');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../src/assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Production Master</Text>
            <Text style={styles.subtitle}>Monitoramento em tempo real</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={24} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={24} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons 
                  name={showPassword ? "visibility-off" : "visibility"} 
                  size={24} 
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Entrar</Text>
              <MaterialIcons name="arrow-forward" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    height: 56,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: 5,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
}); 