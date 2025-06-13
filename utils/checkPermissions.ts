import {
  getNotificationSettings,
  openNotificationSettings,
  openAlarmPermissionSettings,
  AuthorizationStatus,
  AndroidNotificationSetting,
} from "@/utils/notifeeWrapper";
import { Alert, Platform } from "react-native";

export async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await getNotificationSettings();
  if (!settings) return false;

  // General notification authorization
  if (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
    Alert.alert(
      "Benachrichtigungen deaktiviert",
      "Bitte aktiviere Benachrichtigungen, damit du beim Brauen rechtzeitig erinnert wirst.",
      [
        {
          text: "Einstellungen öffnen",
          onPress: async () => {
            await openNotificationSettings();
          },
        },
        {
          text: "Abbrechen",
          style: "cancel",
        },
      ]
    );
    return false;
  }

  // Android-specific: alarm permission
  if (
    Platform.OS === "android" &&
    settings.android?.alarm !== AndroidNotificationSetting.ENABLED
  ) {
    Alert.alert(
      "Weckfunktion deaktiviert",
      "Um geplante Benachrichtigungen zu erhalten, musst du die Wecker-Berechtigung aktivieren.",
      [
        {
          text: "Wecker-Berechtigung öffnen",
          onPress: async () => {
            await openAlarmPermissionSettings();
          },
        },
        {
          text: "Abbrechen",
          style: "cancel",
        },
      ]
    );
    return false;
  }

  return true;
}
