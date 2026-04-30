import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const notificationListener = useRef<Notifications.Subscription>(undefined);
  const responseListener = useRef<Notifications.Subscription>(undefined);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    console.log('Initializing push notifications for:', user.email);

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Save token to Firestore
        updateDoc(doc(db, 'users', user.uid), {
          expoPushToken: token,
        }).catch(err => console.log('Error saving push token:', err));
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return undefined;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn('Project ID not found. Using default method.');
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } else {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
    } catch (e) {
      console.log('Error getting push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
