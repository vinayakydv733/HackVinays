import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="judging"
        options={{
          title: 'Judging',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: 'Broadcast',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="volunteers"
        options={{
          title: 'Volunteers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="id-card" size={size} color={color} />
          ),
        }}
      />

      {/* HIDE EXTRA SCREENS FROM THE TAB BAR 
        If you create other files in the (admin) folder, add them here with href: null
        so they don't break your bottom navigation UI! 
      */}
      <Tabs.Screen name="resources" options={{ href: null }} />
      <Tabs.Screen name="mentors" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}