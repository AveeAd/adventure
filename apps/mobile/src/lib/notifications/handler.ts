// Phase 6: push notifications. Must be imported once at app startup (see
// app/_layout.tsx) - same "register before the OS can need it" convention as
// src/lib/recording/location-task.ts - so the foreground presentation
// handler and Android channel exist before the first notification arrives.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch((err) => console.warn('[push] failed to set Android notification channel', err));
}
