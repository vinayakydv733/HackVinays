import { Redirect } from 'expo-router';
import { useAuth } from './_layout';

export default function Index() {
  const auth = useAuth();
  
  if (!auth?.user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect based on role
  switch (auth.role) {
    case 'participant':
      return <Redirect href="/(participant)/home" />;
    case 'volunteer':
      return <Redirect href="/(volunteer)/home" />;
    case 'admin':
      return <Redirect href="/(admin)/overview" />;
    default:
      return <Redirect href="/(auth)/login" />;
  }
}
