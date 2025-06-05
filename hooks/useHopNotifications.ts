import * as Notifications from "expo-notifications";

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

  // Clear any previously scheduled notifications (better than duplicates)
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const hop of hopSchedule) {
    const hopSecondsBeforeEnd = parseInt(hop.time) * 60;

    if (hopSecondsBeforeEnd >= boilSeconds) continue; // Skip Vorderwürzehopfen

    const elapsed = Math.max(0, boilSeconds - timeLeft);
    const delay = Math.max(1, boilSeconds - hopSecondsBeforeEnd - elapsed);
    const hopText = `${(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g ${
      hop.name
    }`;

    console.log(
      `🔔 Scheduling ${hopText} at T-${hop.time} min (${delay} sec from now)`
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hopfengabe",
        body: `${hopText} jetzt zugeben (${hop.time} Minuten vor Ende)!`,
      },
      trigger: {
        type: "timeInterval",
        seconds: delay,
        repeats: false,
      } as Notifications.TimeIntervalTriggerInput,
    });

    // Optional: throttle scheduling a bit to prevent batching issues
    await new Promise((r) => setTimeout(r, 50));
  }
};
