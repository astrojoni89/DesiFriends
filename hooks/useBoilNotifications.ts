import {
  createTriggerNotification,
  cancelNotification,
  createChannel,
} from "@/utils/notifeeWrapper";

export type HopAddition = {
  name: string;
  offsetMinutes: number;
};

export async function scheduleBoilNotifications(
  hops: HopAddition[],
  startTimestamp: number,
  boilMinutes: number
) {
  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const timestamp = startTimestamp + hop.offsetMinutes * 60 * 1000;

    await createTriggerNotification(
      {
        id: `boil-hop-${i}`,
        title: "Hopfengabe",
        body: `${hop.name} jetzt hinzufügen`,
        android: {
          channelId: "boil-steps",
          smallIcon: "ic_stat_desifriends",
          largeIcon: require("@/assets/images/favicon.png"),
          pressAction: { id: "default" },
        },
      },
      {
        type: 1,
        timestamp,
        alarmManager: { allowWhileIdle: true },
      }
    );
  }

  const endTime = startTimestamp + boilMinutes * 60 * 1000;

  await createTriggerNotification(
    {
      id: "boil-complete",
      title: "Würzekochen abgeschlossen",
      body: "Zeit zum Abkühlen!",
      android: {
        channelId: "boil-steps",
        pressAction: { id: "default" },
      },
    },
    {
      type: 1,
      timestamp: endTime,
      alarmManager: { allowWhileIdle: true },
    }
  );
}

export async function cancelBoilNotifications(hops: HopAddition[]) {
  for (let i = 0; i < hops.length; i++) {
    await cancelNotification(`boil-hop-${i}`);
  }
  await cancelNotification("boil-complete");
}

export async function setupBoilNotificationChannel() {
  await createChannel({
    id: "boil-steps",
    name: "Kochzeit Benachrichtigungen",
    importance: 4, // AndroidImportance.HIGH
  });
}
