import { loadNotifee, requestPermission } from "@/utils/notifeeWrapper";
import { ensureNotificationPermissions } from "@/utils/checkPermissions";

export interface Hop {
  name: string;
  amount: string;
  time: string; // in minutes before end
}

interface Options {
  hopSchedule: Hop[];
  boilSeconds: number;
  timeLeft: number;
  onPermissionDenied?: (type: "notification" | "alarm") => void;
}

export const scheduleHopNotifications = async ({
  hopSchedule,
  boilSeconds,
  timeLeft,
  onPermissionDenied,
}: Options) => {
  const notifee = await loadNotifee();
  if (!notifee) return;

  const result = await requestPermission();

  const hasPermission = await ensureNotificationPermissions(onPermissionDenied);
  if (!hasPermission) {
    console.warn(
      "❌ Mash notification scheduling skipped due to missing permissions."
    );
    return;
  }

  // 🚫 Cancel all previous scheduled notifications
  await notifee.default.cancelAllNotifications();

  for (const hop of hopSchedule) {
    const hopSecondsBeforeEnd = parseInt(hop.time) * 60;
    if (hopSecondsBeforeEnd >= boilSeconds) continue; // skip Vorderwürzehopfen

    const elapsed = boilSeconds - timeLeft;
    const delay = Math.max(1, boilSeconds - hopSecondsBeforeEnd - elapsed);

    // const hopText = `${(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g ${
    //   hop.name
    // }`;
    const hopText = `${hop.amount} g ${hop.name}`;

    const triggerTimestamp = Date.now() + delay * 1000;
    const trigger: import("@notifee/react-native").TimestampTrigger = {
      type: notifee.TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp,
      alarmManager: { allowWhileIdle: true },
    };

    await notifee.default.createTriggerNotification(
      {
        title: "Hopfengabe",
        body: `${hopText} jetzt zugeben (${hop.time} Minuten vor Ende)!`,
        data: { hopThresholdSeconds: String(hopSecondsBeforeEnd) },
        android: {
          channelId: "boil-timer",
          smallIcon: "ic_stat_hop",
          largeIcon: require("@/assets/images/favicon.png"),
          timestamp: triggerTimestamp,
          showTimestamp: true,
          pressAction: { id: "default" },
          color: "#face7d",
          actions: [
            {
              title: "Hinzugefügt",
              pressAction: { id: "hop_added" },
            },
          ],
        },
      },
      trigger
    );

    await new Promise((r) => setTimeout(r, 50)); // spacing out scheduling
  }

  const triggerTimestamp = Date.now() + timeLeft * 1000;
  const trigger: import("@notifee/react-native").TimestampTrigger = {
    type: notifee.TriggerType.TIMESTAMP,
    timestamp: triggerTimestamp,
    alarmManager: { allowWhileIdle: true },
  };

  await notifee.default.createTriggerNotification(
    {
      title: "Kochen abgeschlossen",
      body: "Zeit zum Abkühlen! Das geht am besten mit einem Bier!",
      android: {
        channelId: "boil-timer",
        smallIcon: "ic_stat_complete", // required in real builds
        largeIcon: require("@/assets/images/favicon.png"),
        timestamp: triggerTimestamp,
        showTimestamp: true,
        pressAction: { id: "default" },
        color: "#face7d",
      },
    },
    trigger
  );
};
