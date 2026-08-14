import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Music } from 'lucide-react-native';

export default function AuthScreen() {
  const { login, register, socialLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!username || !password || (isRegister && !email)) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      Alert.alert("Authentication Failed", err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Simulate Google provider credentials, matching the social-login endpoint spec
      const mockGoogleUid = "google-uid-" + Math.floor(Math.random() * 100000);
      const mockUsername = username.trim() || "Google User " + Math.floor(Math.random() * 1000);
      const mockEmail = email.trim() || `google-user-${Math.floor(Math.random() * 1000)}@streamyt.com`;

      await socialLogin("google", mockGoogleUid, mockUsername, mockEmail);
    } catch (err: any) {
      Alert.alert("Social Authentication Failed", err.message || "Failed Google Sign-In.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black p-6 justify-center">
      <View className="items-center mb-8">
        <View className="w-16 h-16 bg-red-650 rounded-2xl items-center justify-center shadow-lg shadow-red-950/20 mb-3">
          <Music size={32} color="#fff" />
        </View>
        <Text className="text-3xl font-extrabold text-white tracking-tight">StreamYT</Text>
        <Text className="text-zinc-500 text-xs mt-1">Universal Music Client</Text>
      </View>

      <Text className="text-xl font-extrabold text-white mb-6">
        {isRegister ? "Create Account" : "Welcome Back"}
      </Text>

      {/* Input Fields */}
      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Username</Text>
          <TextInput
            placeholder="Enter username"
            placeholderTextColor="#52525b"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            className="w-full py-4 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-xs font-sans"
          />
        </View>

        {isRegister && (
          <View className="mt-4">
            <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Email Address</Text>
            <TextInput
              placeholder="name@example.com"
              placeholderTextColor="#52525b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full py-4 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-xs font-sans"
            />
          </View>
        )}

        <View className="mt-4">
          <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor="#52525b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            className="w-full py-4 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white text-xs font-sans"
          />
        </View>
      </View>

      {/* Form Action Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-red-600 rounded-2xl items-center justify-center shadow-lg mb-4"
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-white text-xs font-bold font-sans">
            {isRegister ? "Register" : "Sign In"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Social login Button */}
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-2xl items-center justify-center mb-6"
      >
        <Text className="text-white text-xs font-bold font-sans">Continue with Google</Text>
      </TouchableOpacity>

      {/* Switch Toggle */}
      <TouchableOpacity
        onPress={() => setIsRegister(!isRegister)}
        className="items-center"
      >
        <Text className="text-zinc-500 text-xs font-sans">
          {isRegister ? "Already have an account? " : "New to StreamYT? "}
          <Text className="text-red-500 font-bold">
            {isRegister ? "Log In" : "Register"}
          </Text>
        </Text>
      </TouchableOpacity>

    </View>
  );
}
