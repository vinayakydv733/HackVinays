import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function VolunteerLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarStyle: { backgroundColor: '#1e1e1e', borderTopColor: '#333' },
      tabBarActiveTintColor: '#ff006e', 
      tabBarInactiveTintColor: '#888',
      headerStyle: { backgroundColor: '#121212' },
      headerTitleStyle: { color: '#fff' },
      headerTintColor: '#fff'
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="qrcode-scan" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="passes"
        options={{
          title: 'Passes',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: 'Resources',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="tools" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
