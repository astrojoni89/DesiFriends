import { loadNotifee, requestPermission } from "@/utils/notifeeWrapper";
import { ensureNotificationPermissions } from "@/utils/checkPermissions";

export const scheduleMashNotification = async ({
  duration,
  stepIndex,
  onScheduled,
}: {
  duration: number; // in seconds
  stepIndex: number;
  onScheduled?: (id: string) => void;
}) => {
  const notifee = await loadNotifee();
  if (!notifee) return;

  const result = await requestPermission();

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) {
    console.warn(
      "❌ Mash notification scheduling skipped due to missing permissions."
    );
    return;
  }

  const triggerTimestamp = Date.now() + duration * 1000;

  const trigger: import("@notifee/react-native").TimestampTrigger = {
    type: notifee.TriggerType
      .TIMESTAMP as import("@notifee/react-native").TriggerType.TIMESTAMP,
    timestamp: triggerTimestamp,
    alarmManager: { allowWhileIdle: true },
  };
  const id = await notifee.default.createTriggerNotification(
    {
      title: "Timer abgelaufen",
      body: "Der nächste Schritt kann beginnen.",
      android: {
        channelId: "mash-timer",
        smallIcon: "ic_stat_desifriends", // ensure this icon exists
        largeIcon: require("@/assets/images/favicon.png"),
        timestamp: triggerTimestamp,
        showTimestamp: true,
        pressAction: {
          id: "default",
        },
      },
    },
    trigger
  );

  onScheduled?.(id);
};
