import notifee, {
  TriggerType,
  TimestampTrigger,
  AndroidImportance,
} from "@notifee/react-native";

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
  console.log("[scheduleHopNotifications] Scheduling...", {
    hopSchedule,
    boilSeconds,
    scaleFactor,
    timeLeft,
  });

  // 🚫 Cancel all previous scheduled notifications
  await notifee.cancelAllNotifications();

  for (const hop of hopSchedule) {
    const hopSecondsBeforeEnd = parseInt(hop.time) * 60;
    if (hopSecondsBeforeEnd >= boilSeconds) continue; // skip Vorderwürzehopfen

    const elapsed = boilSeconds - timeLeft;
    const delay = Math.max(1, boilSeconds - hopSecondsBeforeEnd - elapsed);

    const hopText = `${(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g ${
      hop.name
    }`;

    console.log(
      `🔔 Scheduling ${hopText} at T-${hop.time} min (${delay} sec from now)`
    );

    const triggerTimestamp = Date.now() + delay * 1000;

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerTimestamp,
      alarmManager: true,
    };

    await notifee.createTriggerNotification(
      {
        title: "Hopfengabe",
        body: `${hopText} jetzt zugeben (${hop.time} Minuten vor Ende)!`,
        android: {
          channelId: "boil-timer",
          smallIcon: "ic_launcher", // required in real builds
          pressAction: { id: "default" },
        },
      },
      trigger
    );

    await new Promise((r) => setTimeout(r, 50));
  }
};
