import {
  getNotificationSettings,
  AuthorizationStatus,
  AndroidNotificationSetting,
} from "@/utils/notifeeWrapper";
import { Platform } from "react-native";

export type PermissionDeniedType = "notification" | "alarm";

export async function ensureNotificationPermissions(
  onDenied?: (type: PermissionDeniedType) => void
): Promise<boolean> {
  const settings = await getNotificationSettings();
  if (!settings) return false;

  if (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
    onDenied?.("notification");
    return false;
  }

  if (
    Platform.OS === "android" &&
    settings.android?.alarm !== AndroidNotificationSetting.ENABLED
  ) {
    onDenied?.("alarm");
    return false;
  }

  return true;
}
