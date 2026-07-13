import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from '../lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(
  venueId: string,
  staffId: string,
  authToken: string
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  await apiFetch(`/venues/${venueId}/staff/${staffId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ push_token: token }),
  });

  return token;
}

export async function registerGuestPushNotifications(
  sessionId: string,
  guestId: string,
  sessionToken: string
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  await apiFetch(`/sessions/${sessionId}/push-token`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ guest_id: guestId, push_token: token }),
  });

  return token;
}

export async function sendPushToServer(
  staffPushToken: string,
  message: { title: string; body: string; data?: Record<string, unknown> }
) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: staffPushToken,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
    }),
  });
}
