// utils/notifeeWrapper.ts
import Constants from 'expo-constants';

let notifee: typeof import('@notifee/react-native') | null = null;

export async function loadNotifee() {
  if (Constants.appOwnership !== 'expo') {
    const notifee = await import('@notifee/react-native');
    return notifee;
  } else {
    console.log('Notifee disabled: running in Expo Go');
    return null;
  }
}

// Wrapper functions

export async function displayNotification(options: any) {
  if (!notifee) return console.log('[Expo Go] displayNotification skipped:', options);
  return notifee.default.displayNotification(options);
}

export async function createChannel(channel: any) {
  if (!notifee) return;
  return notifee.default.createChannel(channel);
}

export async function cancelAllNotifications() {
  if (!notifee) return;
  return notifee.default.cancelAllNotifications();
}
