// utils/notifeeWrapper.ts
import Constants from "expo-constants";

let notifee: typeof import("@notifee/react-native") | null = null;

export async function loadNotifee() {
  if (notifee) return notifee;

  if (Constants.executionEnvironment !== "storeClient") {
    notifee = await import("@notifee/react-native");
  } else {
    console.log("📱 [MockNotifee] Using mock in Expo Go");

    notifee = {
      default: {
        displayNotification: async (...args: any[]) => {
          console.log("🔔 [MockNotifee] displayNotification", ...args);
        },
        cancelAllNotifications: async () => {
          console.log("❌ [MockNotifee] cancelAllNotifications");
        },
        cancelNotification: async (id: string) => {
          console.log(`❌ [MockNotifee] cancelNotification ${id}`);
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
        getNotificationSettings: async () => {
          console.log("⚙️ [MockNotifee] getNotificationSettings");
          return {
            authorizationStatus: 1,
            android: {
              alarm: 1,
            },
          };
        },
        openNotificationSettings: async () => {
          console.log("⚙️ [MockNotifee] openNotificationSettings");
        },
        openAlarmPermissionSettings: async () => {
          console.log("⚙️ [MockNotifee] openAlarmPermissionSettings");
        },
        onForegroundEvent: (_observer: any) => {
          console.log("👂 [MockNotifee] onForegroundEvent registered");
          return () => {}; // unsubscribe no-op
        },
        onBackgroundEvent: (_handler: any) => {
          console.log("👂 [MockNotifee] onBackgroundEvent registered");
        },
      },
      EventType: {
        UNKNOWN: 0,
        DISMISSED: 1,
        PRESS: 2,
        ACTION_PRESS: 3,
        DELIVERED: 4,
        TRIGGER_NOTIFICATION_CREATED: 8,
      },
      AuthorizationStatus: {
        AUTHORIZED: 1,
        DENIED: 0,
      },
      AndroidNotificationSetting: {
        ENABLED: 1,
        DISABLED: 0,
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

export async function cancelNotification(id: string) {
  const notifee = await loadNotifee();
  return notifee?.default.cancelNotification(id);
}

export async function requestPermission() {
  const notifee = await loadNotifee();
  return notifee?.default.requestPermission();
}

export async function getNotificationSettings() {
  const notifee = await loadNotifee();
  return notifee?.default.getNotificationSettings();
}

export async function openNotificationSettings() {
  const notifee = await loadNotifee();
  return notifee?.default.openNotificationSettings();
}

export async function openAlarmPermissionSettings() {
  const notifee = await loadNotifee();
  return notifee?.default.openAlarmPermissionSettings();
}

// Enum exports to keep everything mock-safe and isolated
export const AuthorizationStatus = {
  AUTHORIZED: 1,
  DENIED: 0,
} as const;

export const AndroidNotificationSetting = {
  ENABLED: 1,
  DISABLED: 0,
} as const;
