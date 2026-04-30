import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

function PushNotificationHandler({ children }: { children: React.ReactNode }) {
  usePushNotifications();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PushNotificationHandler>
        <StatusBar style="light" backgroundColor="#0a0a1a" />
        <Slot />
      </PushNotificationHandler>
    </AuthProvider>
  );
}