import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarStyle: { backgroundColor: '#1e1e1e', borderTopColor: '#333' },
      tabBarActiveTintColor: '#3a86ff', 
      tabBarInactiveTintColor: '#888',
      headerStyle: { backgroundColor: '#121212' },
      headerTitleStyle: { color: '#fff' },
      headerTintColor: '#fff'
    }}>
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Command',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="monitor-dashboard" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams Data',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="database" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="judging"
        options={{
          title: 'Judging',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="scale-balance" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="broadcast"
        options={{
          title: 'Broadcast',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="broadcast" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
