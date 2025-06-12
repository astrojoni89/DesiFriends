// utils/notifeeWrapper.ts
import Constants from "expo-constants";

let notifee: typeof import("@notifee/react-native") | null = null;

export async function loadNotifee() {
  if (notifee) return notifee;

  if (Constants.appOwnership !== "expo") {
    notifee = await import("@notifee/react-native");
  } else {
    //console.log("📱 [MockNotifee] Using mock in Expo Go");

    notifee = {
      default: {
        displayNotification: async (...args: any[]) => {
          console.log("🔔 [MockNotifee] displayNotification", ...args);
        },
        cancelAllNotifications: async () => {
          console.log("❌ [MockNotifee] cancelAllNotifications");
        },
        cancelNotification: async (...args: any[]) => {
          console.log("❌ [MockNotifee] cancelNotification");
        },
        createTriggerNotification: async (...args: any[]) => {
          console.log("📆 [MockNotifee] createTriggerNotification", ...args);
          return "mock-id";
        },
        createChannel: async (...args: any[]) => {
          console.log("📡 [MockNotifee] createChannel", ...args);
        },
        requestPermission: async () => {
          console.log("🔐 [MockNotifee] requestPermission");
          return { authorizationStatus: 1 };
        },
      },
      AndroidImportance: {
          HIGH: 4,
          DEFAULT: 3,
          LOW: 2,
          MIN: 1,
          NONE: 0,
        },
        TriggerType: {
          TIMESTAMP: 1,
        },
    } as any;
  }

  return notifee;
}

// Wrapper functions

export async function displayNotification(options: any) {
  const notifee = await loadNotifee();
  return notifee?.default.displayNotification(options);
}

export async function createChannel(channel: any) {
  const notifee = await loadNotifee();
  return notifee?.default.createChannel(channel);
}

export async function cancelAllNotifications() {
  const notifee = await loadNotifee();
  return notifee?.default.cancelAllNotifications();
}

export async function createTriggerNotification(notification: any, trigger: any) {
  const notifee = await loadNotifee();
  return notifee?.default.createTriggerNotification(notification, trigger);
}

export async function cancelNotification(id: string) {
  const notifee = await loadNotifee();
  return notifee?.default.cancelNotification(id);
}
