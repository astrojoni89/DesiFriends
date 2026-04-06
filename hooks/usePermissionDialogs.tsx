import { useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Portal, Dialog, useTheme } from "react-native-paper";
import {
  openNotificationSettings,
  openAlarmPermissionSettings,
} from "@/utils/notifeeWrapper";
import type { AppTheme } from "@/theme/theme";
import type { PermissionDeniedType } from "@/utils/checkPermissions";

export function usePermissionDialogs() {
  const [dialogType, setDialogType] = useState<PermissionDeniedType | null>(null);
  const { colors } = useTheme() as AppTheme;

  const onPermissionDenied = (type: PermissionDeniedType) => setDialogType(type);

  const isNotification = dialogType === "notification";

  const PermissionDialog = (
    <Portal>
      <Dialog visible={dialogType !== null} onDismiss={() => setDialogType(null)}>
        <Dialog.Title>
          {isNotification ? "Benachrichtigungen deaktiviert" : "Weckfunktion deaktiviert"}
        </Dialog.Title>
        <Dialog.Content>
          <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24 }}>
            {isNotification
              ? "Bitte aktiviere Benachrichtigungen, damit du beim Brauen rechtzeitig erinnert wirst."
              : "Um geplante Benachrichtigungen zu erhalten, musst du die Wecker-Berechtigung aktivieren."}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Pressable style={styles.cancelButton} onPress={() => setDialogType(null)}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Abbrechen</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              const type = dialogType;
              setDialogType(null);
              if (type === "notification") await openNotificationSettings();
              else await openAlarmPermissionSettings();
            }}
          >
            <Text style={[styles.confirmText, { color: colors.onPrimary }]}>
              {isNotification ? "Einstellungen öffnen" : "Wecker-Berechtigung öffnen"}
            </Text>
          </Pressable>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return { onPermissionDenied, PermissionDialog };
}

const styles = StyleSheet.create({
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 8,
  },
  confirmText: {
    fontWeight: "bold",
    fontSize: 15,
  },
});
