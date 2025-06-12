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

export type HopAddition = {
  name: string;
  offsetMinutes: number;
};

export async function scheduleBoilNotifications(
  hops: HopAddition[],
  startTimestamp: number,
  boilMinutes: number
) {
  if (!(await ensureAlarmPermission())) return;

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
          timestamp: timestamp,
          showTimestamp: true,
        },
      },
      {
        type: 1,
        timestamp: timestamp,
        alarmManager: { allowWhileIdle: true },
      }
    );
  }

  const endTime = startTimestamp + boilMinutes * 60 * 1000;

  await createTriggerNotification(
    {
      id: "boil-complete",
      title: "Würzekochen abgeschlossen",
      body: "Zeit zum Abkühlen! Das geht am besten mit einem Bier!",
      android: {
        channelId: "boil-steps",
        smallIcon: "ic_stat_desifriends",
        largeIcon: require("@/assets/images/favicon.png"),
        pressAction: { id: "default" },
        timestamp: endTime,
        showTimestamp: true,
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
