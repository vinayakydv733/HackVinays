import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function VolunteerLayout() {
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
                tabBarActiveTintColor: COLORS.purple,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="scanner"
                options={{
                    title: 'Scanner',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="qr-code-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="tasks"
                options={{
                    title: 'Tasks',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="checkbox-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notices"
                options={{
                    title: 'Notices',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}