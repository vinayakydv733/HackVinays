import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ParticipantLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarStyle: { backgroundColor: '#1e1e1e', borderTopColor: '#333' },
      tabBarActiveTintColor: '#9d4edd',
      tabBarInactiveTintColor: '#888',
      headerStyle: { backgroundColor: '#121212' },
      headerTitleStyle: { color: '#fff' },
      headerTintColor: '#fff',
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-variant" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-clock" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="trophy" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submission"
        options={{
          title: 'Submit',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="upload" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
