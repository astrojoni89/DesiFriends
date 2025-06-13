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
  scaleFactor: number;
  timeLeft: number;
}

export const scheduleHopNotifications = async ({
  hopSchedule,
  boilSeconds,
  scaleFactor,
  timeLeft,
}: Options) => {
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

  // console.log("[scheduleHopNotifications] Scheduling...", {
  //   hopSchedule,
  //   boilSeconds,
  //   scaleFactor,
  //   timeLeft,
  // });

  // 🚫 Cancel all previous scheduled notifications
  await notifee.default.cancelAllNotifications();

  for (const hop of hopSchedule) {
    const hopSecondsBeforeEnd = parseInt(hop.time) * 60;
    if (hopSecondsBeforeEnd >= boilSeconds) continue; // skip Vorderwürzehopfen

    const elapsed = boilSeconds - timeLeft;
    const delay = Math.max(1, boilSeconds - hopSecondsBeforeEnd - elapsed);

    const hopText = `${(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g ${
      hop.name
    }`;

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
        android: {
          channelId: "boil-timer",
          smallIcon: "ic_stat_desifriends", // required in real builds
          largeIcon: require("@/assets/images/favicon.png"),
          timestamp: triggerTimestamp,
          showTimestamp: true,
          pressAction: { id: "default" },
        },
      },
      trigger
    );

    await new Promise((r) => setTimeout(r, 50)); // spacing out scheduling
  }
};
