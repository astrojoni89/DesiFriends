import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useRecipes } from "../../context/RecipeContext";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export default function BrewModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { recipes } = useRecipes();
  const recipe = recipes.find((r) => r.id === id);
  const [targetSize, setTargetSize] = useState(
    recipe?.batchSize.toString() || ""
  );
  const [actualAlphaAcids, setActualAlphaAcids] = useState<{
    [index: number]: string;
  }>({});
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(theme.colors);

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
      amount: (parseFloat(h.amount) * scaleFactor).toFixed(1),
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
        amount: amount.toFixed(1),
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

  const preparePDF = () => {
    const logoUri =
      "https://raw.githubusercontent.com/astrojoni89/DesiFriends/refs/heads/master/assets/images/logo.png";

    // Compose HTML
    const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              @page { size: A4; margin: 20mm; }
              body { font-family: sans-serif; padding: 20px; }
              h1 { font-size: 24px; }
              h2 { margin-top: 20px; }
              ul { padding-left: 20px; }
              img { max-width: 150px; margin-bottom: 20px; }
              .timeline {
              border-left: 3px solid #999;
              margin-left: 10px;
              padding-left: 10px;
            }
            .timeline-entry {
              margin-bottom: 10px;
              position: relative;
            }
            .timeline-entry::before {
              content: "";
              width: 10px;
              height: 10px;
              background-color: #999;
              border-radius: 50%;
              position: absolute;
              left: -16px;
              top: 5px;
            }
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

            ${
              recipe.mashSteps?.length
                ? `<h2>Maischplan</h2>
                <ul>
                  ${recipe.mashSteps
                    .map(
                      (s) => `<li>${s.temperature}°C für ${s.duration} min</li>`
                    )
                    .join("")}
                </ul>`
                : ""
            }

          ${
            recipe.hopSchedule?.length
              ? `<h2>Kochen & Hopfengaben</h2>
                <p><strong>Gesamte Kochzeit: ${
                  recipe.boilTime || "?"
                } min</strong></p>
                <div class="timeline">
                  <div class="timeline-entry">${
                    recipe.boilTime || "?"
                  } min (Beginn)</div>
                  ${recipe.hopSchedule
                    .sort((a, b) => parseFloat(b.time) - parseFloat(a.time))
                    .map((h) => {
                      const adjustedAmount =
                        scaled.hopfen.find((s) => s.name === h.name)?.amount ||
                        h.amount;
                      return `<div class="timeline-entry">${h.time} min: ${h.name}, ${adjustedAmount}g</div>`;
                    })
                    .join("")}
                  <div class="timeline-entry">0 min (Ende)</div>
                </div>`
              : ""
          }

          </body>
        </html>
      `;
    return html;
  };

  const exportToPDF = async () => {
    if (!recipe || !scaled) return;

    try {
      const html = preparePDF();

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
      const html = preparePDF();

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{recipe.name}</Text>
          <Text style={styles.section}>Zielmenge (Liter)</Text>
          <TextInput
            style={styles.input}
            placeholder="Zielmenge (Liter)"
            keyboardType="decimal-pad"
            value={targetSize}
            onChangeText={setTargetSize}
            placeholderTextColor={colors.outline}
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
              placeholderTextColor={colors.outline}
            />
          ))}

          <Text style={styles.section}>Malz</Text>
          {scaled.malz.map((m, i) => (
            <Text key={i} style={styles.text}>
              &bull; {m.name}: {m.amount} kg
            </Text>
          ))}

          <Text style={styles.section}>Hopfen</Text>
          {scaled.hopfen.map((h, i) => (
            <Text key={i} style={styles.text}>
              &bull; {h.name}: {h.amount} g @ {actualAlphaAcids[i] || h.alphaAcid}%α
            </Text>
          ))}

          <Text style={styles.section}>Hefe</Text>
          {scaled.hefe.map((h, i) => (
            <Text key={i} style={styles.text}>
              &bull; {h.name}: {h.amount} g
            </Text>
          ))}

          <View style={{ marginTop: 24 }}></View>
          <Pressable style={styles.button} onPress={copyToClipboard}>
            <Text style={styles.buttontext}>
              In die Zwischenablage kopieren
            </Text>
          </Pressable>
          <Pressable style={styles.button} onPress={exportToPDF}>
            <Text style={styles.buttontext}>Drucken</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: "/brewflow/[id]",
                params: { id: recipe.id },
              })
            }
          >
            <Text style={styles.buttontext}>Brautag starten</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: colors.secondary, marginTop: 32 },
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttontext}>Schließen</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      marginBottom: 50,
    },
    content: {
      padding: 16,
      flexGrow: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 12,
      color: colors.onBackground,
    },
    section: {
      fontWeight: "bold",
      fontSize: 18,
      marginTop: 16,
      marginBottom: 6,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      padding: 8,
      marginBottom: 8,
      borderRadius: 8,
    },
    text: {
      color: colors.text,
      marginBottom: 4,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    buttontext: {
      margin: 4,
      color: colors.onPrimary || "#fff",
      fontWeight: "500",
      fontSize: 16,
    },
  });
}
