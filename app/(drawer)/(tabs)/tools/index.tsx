import { useState, useRef, RefObject } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RadioButton, Menu } from "react-native-paper";

import {
  calculateAlc,
  convertUnit,
  adjustHopAmount,
  correctPlatoTemp,
  calculateDilutionVolume,
} from "@/utils/calcUtils";
import { useTheme } from "react-native-paper";
import type { AppTheme } from "@/theme/theme";

export default function CalcsScreen() {
  const theme = useTheme() as AppTheme;
  const { colors } = theme;
  const styles = createStyles(theme.colors);

  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Scroll‐to logic (using onLayout)
  const scrollRef = useRef<ScrollView>(null);
  const [abvY, setAbvY] = useState(0);
  const [convY, setConvY] = useState(0);
  const [aaY, setAaY] = useState(0);
  const [tempY, setTempY] = useState(0);
  const [diluY, setDiluY] = useState(0);
  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y, animated: true });
    // toggleSidebar();
  };

  // 1) ABV calculator
  const [og, setOg] = useState("");
  const [fg, setFg] = useState("");
  const [unit, setUnit] = useState<"gravity" | "plato" | "brix">("plato");

  // 2) Unit conversion
  const [convInput, setConvInput] = useState("");
  const [convFrom, setConvFrom] = useState<"brix" | "plato" | "gravity">(
    "brix"
  );
  const [convTo, setConvTo] = useState<"brix" | "plato" | "gravity">("plato");

  // 3) Hop AA% conversion
  const [originalAmount, setOriginalAmount] = useState("");
  const [originalAA, setOriginalAA] = useState("");
  const [actualAA, setActualAA] = useState("");

  // 4) Temperature correction (Plato)
  const [calTemp, setCalTemp] = useState("");
  const [measTemp, setMeasTemp] = useState("");
  const [measPlato, setMeasPlato] = useState("");

  // 5) Diluting wort with water to get desired gravity
  const [originalGravity, setOriginalGravity] = useState("");
  const [desiredGravity, setDesiredGravity] = useState("");
  const [originalWortVolume, setOriginalWortVolume] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* <View style={styles.container}> */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ position: "absolute", top: 32, left: 16, zIndex: 10 }}>
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <Pressable onPress={openMenu}>
                  <Ionicons name="menu" size={28} color={colors.onSurface} />
                </Pressable>
              }
            >
              <Menu.Item
                onPress={() => {
                  scrollTo(abvY);
                  closeMenu();
                }}
                title="Alkoholgehalt"
              />
              <Menu.Item
                onPress={() => {
                  scrollTo(convY);
                  closeMenu();
                }}
                title="Umrechner"
              />
              <Menu.Item
                onPress={() => {
                  scrollTo(aaY);
                  closeMenu();
                }}
                title="Hopfen-Anpassung"
              />
              <Menu.Item
                onPress={() => {
                  scrollTo(tempY);
                  closeMenu();
                }}
                title="Temperatur-Korrektur Plato"
              />
              <Menu.Item
                onPress={() => {
                  scrollTo(diluY);
                  closeMenu();
                }}
                title="Würzeverdünnung"
              />
            </Menu>
          </View>

          {/* Main content */}
          {/* ABV Section */}
          <View onLayout={(e) => setAbvY(e.nativeEvent.layout.y)}>
            <Text style={styles.title}>Alkoholgehalt</Text>
            <RadioButton.Group
              onValueChange={(v) => setUnit(v as any)}
              value={unit}
            >
              <View style={styles.radioRow}>
                <RadioButton value="plato" />
                <Text style={styles.radioText}>°Plato</Text>
                <RadioButton value="brix" />
                <Text style={styles.radioText}>Brix</Text>
                <RadioButton value="gravity" />
                <Text style={styles.radioText}>Gravity</Text>
              </View>
            </RadioButton.Group>
            <TextInput
              style={styles.input}
              placeholder="Originalwert"
              keyboardType="decimal-pad"
              value={og}
              onChangeText={setOg}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Endwert"
              keyboardType="decimal-pad"
              value={fg}
              onChangeText={setFg}
              placeholderTextColor={colors.outline}
            />

            {og && fg
              ? (() => {
                  const [
                    alcVol,
                    fermRateApp,
                    fermRateReal,
                    appExtract,
                    realExtract,
                  ] = calculateAlc(parseFloat(og), parseFloat(fg), unit);

                  return (
                    <View style={{ borderColor: colors.border, borderWidth: 1, padding: 16, borderRadius: 8 }}>
                      <Text style={styles.result}>
                        Alkoholgehalt: {alcVol}%vol
                      </Text>
                      <Text style={styles.secondaryResult}>
                        Scheinbarer Endvergärungsgrad: {fermRateApp}%
                      </Text>
                      <Text style={styles.secondaryResult}>
                        Tatsächlicher Endvergärungsgrad: {fermRateReal}%
                      </Text>
                      <Text style={styles.secondaryResult}>
                        Scheinbarer Restextrakt: {appExtract}%
                      </Text>
                      <Text style={styles.secondaryResult}>
                        Tatsächlicher Restextrakt: {realExtract}%
                      </Text>
                      {unit === "plato" && (
                        <Text style={styles.note}>
                          Berechnet mit der Balling-Formel.
                        </Text>
                      )}
                      {unit === "brix" && (
                        <Text style={styles.note}>
                          Berechnet mit der Sean Terrill-Formel.
                        </Text>
                      )}
                      {unit === "gravity" && (
                        <Text style={styles.note}>
                          Berechnet mit der Balling-Formel.
                        </Text>
                      )}
                    </View>
                  );
                })()
              : null}
          </View>

          {/* Conversion Section */}
          <View
            onLayout={(e) => setConvY(e.nativeEvent.layout.y)}
            style={{ marginTop: 32 }}
          >
            <Text style={styles.title}>Einheiten umrechnen</Text>

            <Text style={styles.label}>Von:</Text>
            <RadioButton.Group
              onValueChange={(v) => setConvFrom(v as any)}
              value={convFrom}
            >
              <View style={styles.radioRow}>
                <RadioButton value="brix" />
                <Text style={styles.radioText}>Brix</Text>
                <RadioButton value="plato" />
                <Text style={styles.radioText}>Plato</Text>
                <RadioButton value="gravity" />
                <Text style={styles.radioText}>Gravity</Text>
              </View>
            </RadioButton.Group>

            <Text style={styles.label}>Nach:</Text>
            <RadioButton.Group
              onValueChange={(v) => setConvTo(v as any)}
              value={convTo}
            >
              <View style={styles.radioRow}>
                <RadioButton value="brix" />
                <Text style={styles.radioText}>Brix</Text>
                <RadioButton value="plato" />
                <Text style={styles.radioText}>Plato</Text>
                <RadioButton value="gravity" />
                <Text style={styles.radioText}>Gravity</Text>
              </View>
            </RadioButton.Group>

            <TextInput
              style={styles.input}
              placeholder={`Wert in ${
                convFrom.charAt(0).toUpperCase() + convFrom.slice(1)
              }`}
              keyboardType="decimal-pad"
              value={convInput}
              onChangeText={setConvInput}
              placeholderTextColor={colors.outline}
            />

            {convInput ? (
              <Text style={styles.result}>
                Ergebnis ({convTo.charAt(0).toUpperCase() + convTo.slice(1)}):{" "}
                {(() => {
                  const parsed = parseFloat(convInput);
                  return isNaN(parsed)
                    ? "Ungültiger Wert"
                    : convertUnit(parsed, convFrom, convTo);
                })()}
              </Text>
            ) : null}
          </View>

          {/* Hop AA% Section */}
          <View
            onLayout={(e) => setAaY(e.nativeEvent.layout.y)}
            style={{ marginTop: 32 }}
          >
            <Text style={styles.title}>Hopfen-Anpassung (Alpha-Säure)</Text>
            <TextInput
              style={styles.input}
              placeholder="Menge laut Rezept (g)"
              keyboardType="decimal-pad"
              value={originalAmount}
              onChangeText={setOriginalAmount}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Alpha-Säure laut Rezept (%α)"
              keyboardType="decimal-pad"
              value={originalAA}
              onChangeText={setOriginalAA}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Tatsächliche Alpha-Säure (%α)"
              keyboardType="decimal-pad"
              value={actualAA}
              onChangeText={setActualAA}
              placeholderTextColor={colors.outline}
            />

            {originalAmount && originalAA && actualAA ? (
              <Text style={styles.result}>
                Angepasste Menge:{" "}
                {adjustHopAmount(
                  parseFloat(originalAmount),
                  parseFloat(originalAA),
                  parseFloat(actualAA)
                )}{" "}
                g
              </Text>
            ) : null}
          </View>

          {/* Temperature Correction Section */}
          <View
            onLayout={(e) => setTempY(e.nativeEvent.layout.y)}
            style={{ marginTop: 32 }}
          >
            <Text style={styles.title}>Temperaturkorrektur (Plato)</Text>
            <TextInput
              style={styles.input}
              placeholder="Kalibriert bei (°C)"
              keyboardType="decimal-pad"
              value={calTemp}
              onChangeText={setCalTemp}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Gemessen bei (°C)"
              keyboardType="decimal-pad"
              value={measTemp}
              onChangeText={setMeasTemp}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Gemessene Dichte (°P)"
              keyboardType="decimal-pad"
              value={measPlato}
              onChangeText={setMeasPlato}
              placeholderTextColor={colors.outline}
            />

            {measPlato && calTemp && measTemp ? (
              <Text style={styles.result}>
                Korrigierte Dichte:{" "}
                {correctPlatoTemp(
                  parseFloat(measPlato),
                  parseFloat(calTemp),
                  parseFloat(measTemp)
                )}{" "}
                °P
              </Text>
            ) : null}
          </View>

          {/* Dilution Section */}
          <View
            onLayout={(e) => setDiluY(e.nativeEvent.layout.y)}
            style={{ marginTop: 32 }}
          >
            <Text style={styles.title}>Würzeverdünnung</Text>
            <TextInput
              style={styles.input}
              placeholder="Stammwürze (°P)"
              keyboardType="decimal-pad"
              value={originalGravity}
              onChangeText={setOriginalGravity}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Würzemenge (L)"
              keyboardType="decimal-pad"
              value={originalWortVolume}
              onChangeText={setOriginalWortVolume}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              placeholder="Gewünschte Stammwürze (°P)"
              keyboardType="decimal-pad"
              value={desiredGravity}
              onChangeText={setDesiredGravity}
              placeholderTextColor={colors.outline}
            />

            {originalGravity && originalWortVolume && desiredGravity ? (
              <Text style={styles.result}>
                Benötigte Wassermenge:{" "}
                {calculateDilutionVolume(
                  parseFloat(originalGravity),
                  parseFloat(originalWortVolume),
                  parseFloat(desiredGravity)
                )}{" "}
                L
              </Text>
            ) : null}
          </View>
          {/* </ScrollView> */}
        </ScrollView>
        {/* </KeyboardAwareScrollView> */}
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppTheme["colors"]) {
  const sidebarWidth = 250;
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 16,
      // backgroundColor: isDark ? "#000" : "#fff",
    },
    content: {
      padding: 16,
      paddingTop: 76,
      flexGrow: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.onBackground,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      padding: 10,
      marginBottom: 12,
      borderRadius: 8,
    },
    result: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 8,
      marginBottom: 8,
      color: colors.onBackground,
    },
    secondaryResult: {
      fontSize: 14,
      fontStyle: "italic",
      color: colors.onBackground,
    },
    note: {
      fontSize: 12,
      color: colors.outline,
      fontStyle: "italic",
      marginTop: 8,
    },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    radioText: {
      marginRight: 16,
      color: colors.text,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 4,
      color: colors.onBackground,
    },

    hamburger: {
      position: "absolute",
      top: 16,
      left: 16,
      zIndex: 10,
      paddingTop: 16,
    },
    sidebarContainer: {
      backgroundColor: colors.surface,
      paddingTop: 76,
      paddingHorizontal: 20,
      zIndex: 9,
    },
    sidebarItem: {
      paddingVertical: 12,
      color: colors.onSurface,
      fontWeight: "600",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.backdrop,
      zIndex: 8,
    },
  });
}
