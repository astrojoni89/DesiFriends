import notifee, { TimestampTrigger, TriggerType } from "@notifee/react-native";

/**
 * Schedule a mash step notification.
 */
export const scheduleMashNotification = async ({
  duration,
  stepIndex,
  onScheduled,
}: {
  duration: number; // in seconds
  stepIndex: number;
  onScheduled?: (id: string) => void;
}) => {
  const triggerTimestamp = Date.now() + duration * 1000;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerTimestamp,
    alarmManager: true, // more reliable for long delays (Android only)
  };

  const id = await notifee.createTriggerNotification(
    {
      title: "Timer abgelaufen",
      body: "Der nächste Schritt kann beginnen.",
      android: {
        channelId: "mash-timer",
        smallIcon: "ic_launcher", // make sure this exists in your resources
        pressAction: {
          id: "default",
        },
      },
    },
    trigger
  );

  onScheduled?.(id);
};
