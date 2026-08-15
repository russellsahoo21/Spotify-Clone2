import { Tabs } from 'expo-router';
import React from 'react';
import { Home, Search, Library } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Account for system navigation bar dynamic heights in edge-to-edge mode
  const paddingBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 30 : 10);
  const tabHeight = 50 + paddingBottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#d91b29',
        tabBarInactiveTintColor: '#71717a',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b',
          borderTopColor: '#18181b',
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 10,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <Library size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
