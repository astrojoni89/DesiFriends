// hooks/useMashNotifications.ts
import * as Notifications from "expo-notifications";

export const scheduleMashNotification = async ({
  duration,
  stepIndex,
  onScheduled,
}: {
  duration: number; // in seconds
  stepIndex: number;
  onScheduled?: (id: string) => void;
}) => {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Timer abgelaufen",
      body: "Der nächste Schritt kann beginnen.",
    },
    trigger: {
      type: "timeInterval",
      seconds: Math.max(1, duration),
      repeats: false,
    } as Notifications.TimeIntervalTriggerInput,
  });

  onScheduled?.(id);
};

export const cancelNotification = async (id: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn("Failed to cancel notification:", e);
  }
};
