import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useRecipes } from "../../context/RecipeContext";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

export default function BrewModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes } = useRecipes();
  const recipe = recipes.find((r) => r.id === id);

  const [targetSize, setTargetSize] = useState("");
  const [actualAlphaAcids, setActualAlphaAcids] = useState<{
    [index: number]: string;
  }>({});
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = createStyles(isDark);

  if (!recipe) return <Text>Rezept nicht gefunden.</Text>;

  const scaleFactor = targetSize
    ? parseFloat(targetSize) / recipe.batchSize
    : 1;

  const scaled = {
    malz: recipe.malz.map((m) => ({
      ...m,
      amount: (parseFloat(m.amount) * scaleFactor).toFixed(2),
    })),
    hefe: recipe.hefe.map((h) => ({
      ...h,
      amount: (parseFloat(h.amount) * scaleFactor).toFixed(2),
    })),
    hopfen: recipe.hopfen.map((h, i) => {
      const originalAA = parseFloat(h.alphaAcid || "0");
      const actualAA = parseFloat(actualAlphaAcids[i] || h.alphaAcid || "0");
      let amount = parseFloat(h.amount) * scaleFactor;
      if (originalAA > 0 && actualAA > 0) {
        amount *= originalAA / actualAA;
      }
      return {
        ...h,
        amount: amount.toFixed(2),
      };
    }),
  };

  const copyToClipboard = () => {
    const text = `
  📋 ${recipe?.name} (${targetSize} L)
  
  Malz:
  ${scaled?.malz.map((m) => `- ${m.name}: ${m.amount} kg`).join("\n")}
  
  Hopfen:
  ${scaled?.hopfen
    .map(
      (h, i) =>
        `- ${h.name}: ${h.amount} g @ ${actualAlphaAcids[i] || h.alphaAcid}%α`
    )
    .join("\n")}
  
  Hefe:
  ${scaled?.hefe.map((h) => `- ${h.name}: ${h.amount} g`).join("\n")}
    `;
    Clipboard.setStringAsync(text);
  };

  const exportToPDF = async () => {
    if (!recipe || !scaled) return;

    try {
      // Load logo image
      // const asset = Asset.fromModule(require("../../assets/images/logo.png"));
      // await asset.downloadAsync();
      // const base64 = await FileSystem.readAsStringAsync(asset.localUri!, {
      //   encoding: FileSystem.EncodingType.Base64,
      // });
      // const logoUri = `data:image/png;base64,${base64}`;
      const [logo] = await Asset.loadAsync(
        require("../../assets/images/logo.png")
      );
      const logoUri = logo?.uri || ""; // or provide a backup

      // Compose HTML
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { font-size: 24px; }
              h2 { margin-top: 20px; }
              ul { padding-left: 20px; }
              img { max-width: 150px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <img src="${logoUri}" alt="Logo" />
            <h1>${recipe.name} – ${targetSize} L</h1>
            <h2>Malz</h2>
            <ul>
              ${scaled.malz
                .map((m) => `<li>${m.name}: ${m.amount} kg</li>`)
                .join("")}
            </ul>
            <h2>Hopfen</h2>
            <ul>
              ${scaled.hopfen
                .map(
                  (h, i) =>
                    `<li>${h.name}: ${h.amount} g @ ${
                      actualAlphaAcids[i] || h.alphaAcid
                    }%&alpha;</li>`
                )
                .join("")}
            </ul>
            <h2>Hefe</h2>
            <ul>
              ${scaled.hefe
                .map((h) => `<li>${h.name}: ${h.amount} g</li>`)
                .join("")}
            </ul>
          </body>
        </html>
      `;

      // Show "Print / Save As PDF" dialog
      await Print.printAsync({ html });
      // Show success notification
      Alert.alert(
        "Export abgeschlossen",
        "Das PDF-Rezept wurde erfolgreich erstellt.",
        [{ text: "OK" }]
      );
    } catch (error) {
      // console.error("PDF Export Error:", error);
      // alert("Fehler beim Exportieren der PDF.");
      sharePDF();
    }
  };

  const sharePDF = async () => {
    if (!recipe || !scaled) return;

    try {
      // Load logo image
      // const asset = Asset.fromModule(require("../../assets/images/logo.png"));
      // await asset.downloadAsync();
      // const base64 = await FileSystem.readAsStringAsync(asset.localUri!, {
      //   encoding: FileSystem.EncodingType.Base64,
      // });
      // const logoUri = `data:image/png;base64,${base64}`;
      const [logo] = await Asset.loadAsync(
        require("../../assets/images/logo.png")
      );
      const logoUri = logo?.uri || ""; // or provide a backup

      // Compose HTML
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { font-size: 24px; }
              h2 { margin-top: 20px; }
              ul { padding-left: 20px; }
              img { max-width: 150px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <img src="${logoUri}" alt="Logo" />
            <h1>${recipe.name} – ${targetSize} L</h1>
            <h2>Malz</h2>
            <ul>
              ${scaled.malz
                .map((m) => `<li>${m.name}: ${m.amount} kg</li>`)
                .join("")}
            </ul>
            <h2>Hopfen</h2>
            <ul>
              ${scaled.hopfen
                .map(
                  (h, i) =>
                    `<li>${h.name}: ${h.amount} g @ ${
                      actualAlphaAcids[i] || h.alphaAcid
                    }%&alpha;</li>`
                )
                .join("")}
            </ul>
            <h2>Hefe</h2>
            <ul>
              ${scaled.hefe
                .map((h) => `<li>${h.name}: ${h.amount} g</li>`)
                .join("")}
            </ul>
          </body>
        </html>
      `;

      // Generate the PDF file
      const { uri } = await Print.printToFileAsync({ html });

      // Share the file
      const newPath = FileSystem.cacheDirectory + "recipe.pdf";
      await FileSystem.moveAsync({
        from: uri,
        to: newPath,
      });

      await Sharing.shareAsync(newPath, {
        mimeType: "application/pdf",
        dialogTitle: "Rezept teilen oder speichern",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      Alert.alert("Fehler", "PDF konnte nicht exportiert werden.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{recipe.name}</Text>

          <TextInput
            style={styles.input}
            placeholder="Zielmenge (Liter)"
            keyboardType="decimal-pad"
            value={targetSize}
            onChangeText={setTargetSize}
            placeholderTextColor={isDark ? "#aaa" : "#555"}
          />

          <Text style={styles.section}>Hopfen Alpha-Säure (%α)</Text>
          {recipe.hopfen.map((h, i) => (
            <TextInput
              key={i}
              style={styles.input}
              placeholder={`für ${h.name}`}
              value={actualAlphaAcids[i] || ""}
              keyboardType="decimal-pad"
              onChangeText={(val) =>
                setActualAlphaAcids((prev) => ({ ...prev, [i]: val }))
              }
              placeholderTextColor={isDark ? "#aaa" : "#555"}
            />
          ))}

          <Text style={styles.section}>Malz</Text>
          {scaled.malz.map((m, i) => (
            <Text key={i} style={styles.text}>
              - {m.name}: {m.amount} kg
            </Text>
          ))}

          <Text style={styles.section}>Hopfen</Text>
          {scaled.hopfen.map((h, i) => (
            <Text key={i} style={styles.text}>
              - {h.name}: {h.amount} g @ {actualAlphaAcids[i] || h.alphaAcid}%α
            </Text>
          ))}

          <Text style={styles.section}>Hefe</Text>
          {scaled.hefe.map((h, i) => (
            <Text key={i} style={styles.text}>
              - {h.name}: {h.amount} g
            </Text>
          ))}
          <View style={{ marginTop: 24 }}></View>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttontext}>Schließen</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={copyToClipboard}>
            <Text style={styles.buttontext}>
              In die Zwischenablage kopieren
            </Text>
          </Pressable>
          <Pressable style={styles.button} onPress={exportToPDF}>
            <Text style={styles.buttontext}>Drucken</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#000" : "#fff",
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 12,
      color: isDark ? "#fff" : "#000",
    },
    section: {
      fontWeight: "bold",
      fontSize: 18,
      marginTop: 16,
      marginBottom: 6,
      color: isDark ? "#fff" : "#000",
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? "#444" : "#ccc",
      backgroundColor: isDark ? "#111" : "#f9f9f9",
      color: isDark ? "#fff" : "#000",
      padding: 8,
      marginBottom: 8,
      borderRadius: 8,
    },
    text: {
      color: isDark ? "#ccc" : "#333",
      marginBottom: 4,
    },
    button: {
      backgroundColor: "#007AFF",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    buttontext: {
      margin: 4,
      color: "#fff",
      fontWeight: "500",
      fontSize: 16,
    },
  });
}
