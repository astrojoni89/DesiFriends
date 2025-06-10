import { loadNotifee } from "@/utils/notifeeWrapper";

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

  const triggerTimestamp = Date.now() + duration * 1000;

  const trigger: import('@notifee/react-native').TimestampTrigger = {
    type: notifee.TriggerType.TIMESTAMP as import('@notifee/react-native').TriggerType.TIMESTAMP,
    timestamp: triggerTimestamp,
    alarmManager: true,
  };

  console.log("About to call createTriggerNotification");
  const id = await notifee.default.createTriggerNotification(
    {
      title: "Timer abgelaufen",
      body: "Der nächste Schritt kann beginnen.",
      android: {
        channelId: "mash-timer",
        smallIcon: "ic_stat_desifriends", // ensure this icon exists
        largeIcon: require("@/assets/images/favicon.png"),
        pressAction: {
          id: "default",
        },
      },
    },
    trigger
  );

  onScheduled?.(id);
};
