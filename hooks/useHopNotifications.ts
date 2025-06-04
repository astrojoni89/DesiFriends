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
}

export const scheduleHopNotifications = async ({
  hopSchedule,
  boilSeconds,
  scaleFactor,
}: Options) => {
  for (const hop of hopSchedule) {
    const hopSecondsBeforeEnd = parseInt(hop.time) * 60;
    const delay = Math.max(1, boilSeconds - hopSecondsBeforeEnd);

    if (hopSecondsBeforeEnd >= boilSeconds) continue; // skip Vorderwürzehopfen

    const hopText = `${(parseFloat(hop.amount) * scaleFactor).toFixed(1)} g ${hop.name}`;

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
  }
};
