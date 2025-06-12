import {
  createTriggerNotification,
  cancelNotification,
  createChannel,
} from "@/utils/notifeeWrapper";

export type MashStep = {
  title: string;
  offsetMinutes: number;
};

export async function scheduleMashNotifications(
  steps: MashStep[],
  startTimestamp: number
) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const timestamp = startTimestamp + step.offsetMinutes * 60 * 1000;

    await createTriggerNotification(
      {
        id: `mash-step-${i}`,
        title: "Maischeschritt",
        body: `${step.title} beginnt jetzt`,
        android: {
          channelId: "mash-steps",
          smallIcon: "ic_stat_desifriends", // ensure this icon exists
          largeIcon: require("@/assets/images/favicon.png"),
          pressAction: { id: "default" },
        },
      },
      {
        type: 1, // TriggerType.TIMESTAMP
        timestamp,
        alarmManager: { allowWhileIdle: true },
      }
    );
  }
}

export async function cancelMashNotifications(steps: MashStep[]) {
  for (let i = 0; i < steps.length; i++) {
    await cancelNotification(`mash-step-${i}`);
  }
}

export async function setupMashNotificationChannel() {
  await createChannel({
    id: "mash-steps",
    name: "Maischezeit Benachrichtigungen",
    importance: 4, // AndroidImportance.HIGH
  });
}
