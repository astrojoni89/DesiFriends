import {
  createTriggerNotification,
  cancelNotification,
  createChannel,
  getNotificationSettings,
  openAlarmPermissionSettings,
  requestPermission,
  openNotificationSettings,
} from "@/utils/notifeeWrapper";
import { Alert } from "react-native";

async function ensureAlarmPermission(): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings || settings.authorizationStatus !== 1) {
    const result = await requestPermission();
    if (!result || result.authorizationStatus !== 1) {
      Alert.alert(
        "Benachrichtigungen deaktiviert",
        "Bitte aktiviere Benachrichtigungen in den Einstellungen, damit du nichts verpasst.",
        [
        {
          text: "Zu den Einstellungen",
          onPress: () => openNotificationSettings(),
        },
        { text: "Abbrechen", style: "cancel" },
      ]
      );
      return false;
    }
  }

  if (settings?.android?.alarm !== 1) {
    Alert.alert(
      "Weckerberechtigung erforderlich",
      "Die App benötigt Weckerberechtigungen, um Timer-Benachrichtigungen senden zu können.",
      [
        {
          text: "Zu den Einstellungen",
          onPress: () => openAlarmPermissionSettings(),
        },
        { text: "Abbrechen", style: "cancel" },
      ]
    );
    return false;
  }

  return true;
}

export type MashStep = {
  title: string;
  offsetMinutes: number;
};

export async function scheduleMashNotifications(
  steps: MashStep[],
  startTimestamp: number
) {
  if (!(await ensureAlarmPermission())) return;

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
          timestamp: timestamp,
          showTimestamp: true,
        },
      },
      {
        type: 1, // TriggerType.TIMESTAMP
        timestamp: timestamp,
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
    importance: 4, //AndroidImportance.HIGH,
  });
}
