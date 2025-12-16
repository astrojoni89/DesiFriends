import { useState, useRef, RefObject } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RadioButton, Menu } from "react-native-paper";
//import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import {
  calculateAlc,
  calculateSugar,
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
  const placeholderFor = (enabled: boolean) =>
    enabled ? colors.outline : colors.disabledText;

  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Scroll‐to logic (using onLayout)
  const scrollRef = useRef<ScrollView>(null);
  //const scrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const [abvY, setAbvY] = useState(0);
  const [sugY, setSugY] = useState(0);
  const [convY, setConvY] = useState(0);
  const [aaY, setAaY] = useState(0);
  const [tempY, setTempY] = useState(0);
  const [diluY, setDiluY] = useState(0);
  // const scrollTo = (y: number) => {
  // scrollRef.current?.scrollToPosition(0, y, true);
  // };
  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  // 1) ABV calculator
  const [og, setOg] = useState("");
  const [fg, setFg] = useState("");
  const [unit, setUnit] = useState<"gravity" | "plato" | "brix">("plato");

  // 2) Priming sugar
  const [ftemp, setFTemp] = useState("");
  const [carb, setCarb] = useState("");
  const [ogSugar, setOgSugar] = useState("");
  const [fgSugar, setFgSugar] = useState("");
  const [sunit, setSUnit] = useState<"sugar" | "wort" | "glucose">("sugar");
  const carbValue = parseFloat(carb);
  const maxCarb = 7.0;
  const carbTooHigh = !isNaN(carbValue) && carbValue > maxCarb;
  const renderResult = (
    co2Pressure: string,
    co2Difference: string,
    amountToAdd: string,
    additionalAlc: string,
    unit: string
  ) => (
    <View
      style={{
        borderColor: colors.border,
        borderWidth: 1,
        padding: 16,
        borderRadius: 8,
      }}
    >
      <Text style={styles.result}>
        {unit === "wort"
          ? "Erforderliche Speisemenge:"
          : unit === "sugar"
          ? "Erforderliche Zuckermenge:"
          : ""}
      </Text>
      {/* <Text style={[styles.result, { marginTop: 0 }]}>
        {unit === "wort"
          ? `${parseFloat(amountToAdd).toFixed(0)} ml/Liter\n(=${parseFloat(amountToAdd).toFixed(0)}ml Speise + ${(1000-parseFloat(parseFloat(amountToAdd).toFixed(0))).toFixed(0)}ml Jungbier)`
          : unit === "sugar"
          ? `${amountToAdd} g/Liter`
          : ""}
      </Text> */}
      {unit === "wort" && (
        <>
          <Text style={[styles.result, { marginTop: 0, marginBottom: 2 }]}>
            {`${parseFloat(amountToAdd).toFixed(0)} ml/Liter`}
          </Text>
          <Text
            style={[styles.secondaryResult, { marginBottom: 0, marginLeft: 4 }]}
          >
            {`≙ ${parseFloat(amountToAdd).toFixed(0)} ml Speise + ${(
              1000 - parseFloat(parseFloat(amountToAdd).toFixed(0))
            ).toFixed(0)} ml Jungbier`}
          </Text>
          <Text
            style={[styles.secondaryResult, { marginBottom: 8, marginLeft: 4 }]}
          >
            {`≙ ${(parseFloat(parseFloat(amountToAdd).toFixed(0)) * (1000/(1000-parseFloat(parseFloat(amountToAdd).toFixed(0))))).toFixed(0)} ml Speise + 1000 ml Jungbier`}
          </Text>
        </>
      )}

      {unit === "sugar" && (
        <Text style={[styles.result, { marginTop: 0 }]}>
          {`${amountToAdd} g/Liter`}
        </Text>
      )}
      <Text style={styles.secondaryResult}>
        Vorhandenes CO&#8322; im Jungbier: {co2Pressure} g/Liter
      </Text>
      <Text style={styles.secondaryResult}>
        Erforderliches CO&#8322;: {co2Difference} g/Liter
      </Text>
      <Text style={styles.secondaryResult}>
        Änderung Alkoholgehalt: +{additionalAlc}%vol
      </Text>
    </View>
  );

  // 3) Unit conversion
  const [convInput, setConvInput] = useState("");
  const [convFrom, setConvFrom] = useState<"brix" | "plato" | "gravity">(
    "brix"
  );
  const [convTo, setConvTo] = useState<"brix" | "plato" | "gravity">("plato");

  // 4) Hop AA% conversion
  const [originalAmount, setOriginalAmount] = useState("");
  const [originalAA, setOriginalAA] = useState("");
  const [actualAA, setActualAA] = useState("");

  // 5) Temperature correction (Plato)
  const [calTemp, setCalTemp] = useState("");
  const [measTemp, setMeasTemp] = useState("");
  const [measPlato, setMeasPlato] = useState("");

  // 6) Diluting wort with water to get desired gravity
  const [originalGravity, setOriginalGravity] = useState("");
  const [desiredGravity, setDesiredGravity] = useState("");
  const [originalWortVolume, setOriginalWortVolume] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
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
                  scrollTo(sugY);
                  closeMenu();
                }}
                title="Zuckerberechnung"
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
                <Text style={styles.radioText}>°Brix</Text>
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
                    <View
                      style={{
                        borderColor: colors.border,
                        borderWidth: 1,
                        padding: 16,
                        borderRadius: 8,
                      }}
                    >
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

          {/* Sugar Section */}
          <View
            onLayout={(e) => setSugY(e.nativeEvent.layout.y)}
            style={{ marginTop: 32 }}
          >
            <Text style={styles.title}>Zuckerberechnung zur Nachgärung</Text>
            <RadioButton.Group
              onValueChange={(v) => setSUnit(v as any)}
              value={sunit}
            >
              <View style={styles.radioCol}>
                <View style={styles.radioRow}>
                  <RadioButton value="sugar" />
                  <Text style={styles.radioText}>Haushaltszucker</Text>
                </View>
                <View style={styles.radioRow}>
                  <RadioButton value="wort" />
                  <Text style={styles.radioText}>Speise</Text>
                </View>
                <View style={styles.radioRow}>
                  <RadioButton value="glucose" />
                  <Text style={styles.radioText}>Traubenzucker</Text>
                </View>
              </View>
            </RadioButton.Group>
            <TextInput
              style={styles.input}
              placeholder="Gärtemperatur (°C)"
              keyboardType="decimal-pad"
              value={ftemp}
              onChangeText={setFTemp}
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={[styles.input, { marginBottom: 0 }]}
              placeholder="Zielgehalt CO&#8322; (g/Liter)"
              keyboardType="decimal-pad"
              value={carb}
              onChangeText={setCarb}
              placeholderTextColor={colors.outline}
            />
            <Text
              style={[
                styles.note,
                { marginTop: 4, marginLeft: 4, marginBottom: 12 },
              ]}
            >
              (Stout~4.0g/L - Pils/Hell~5.0g/L - Weizen~6.0g/L)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Stammwürze der Speise (°P)"
              keyboardType="decimal-pad"
              value={ogSugar}
              onChangeText={setOgSugar}
              editable={sunit === "wort"}
              placeholderTextColor={placeholderFor(sunit === "wort")}
            />
            <TextInput
              style={styles.input}
              placeholder="Restextrakt Jungbier (°P)"
              keyboardType="decimal-pad"
              value={fgSugar}
              onChangeText={setFgSugar}
              editable={sunit === "wort"}
              placeholderTextColor={placeholderFor(sunit === "wort")}
            />

            {carbTooHigh ? (
              <View style={{ padding: 12 }}>
                <Text style={styles.note}>
                  Der Ziel-CO₂-Gehalt darf {maxCarb.toFixed(1)} g/L nicht
                  überschreiten!
                </Text>
              </View>
            ) : sunit !== "wort" ? (
              ftemp && carb ? (
                (() => {
                  const [
                    co2Pressure,
                    co2Difference,
                    amountToAdd,
                    additionalAlc,
                  ] = calculateSugar(
                    parseFloat(ftemp),
                    parseFloat(carb),
                    sunit
                  );

                  return renderResult(
                    co2Pressure,
                    co2Difference,
                    amountToAdd,
                    additionalAlc,
                    "sugar"
                  );
                })()
              ) : null
            ) : ftemp && carb && ogSugar && fgSugar ? (
              (() => {
                const [co2Pressure, co2Difference, amountToAdd, additionalAlc] =
                  calculateSugar(
                    parseFloat(ftemp),
                    parseFloat(carb),
                    sunit,
                    parseFloat(ogSugar),
                    parseFloat(fgSugar)
                  );

                return renderResult(
                  co2Pressure,
                  co2Difference,
                  amountToAdd,
                  additionalAlc,
                  "wort"
                );
              })()
            ) : null}
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
                <Text style={styles.radioText}>°Brix</Text>
                <RadioButton value="plato" />
                <Text style={styles.radioText}>°Plato</Text>
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
                <Text style={styles.radioText}>°Brix</Text>
                <RadioButton value="plato" />
                <Text style={styles.radioText}>°Plato</Text>
                <RadioButton value="gravity" />
                <Text style={styles.radioText}>Gravity</Text>
              </View>
            </RadioButton.Group>

            <TextInput
              style={styles.input}
              placeholder={
                convFrom === "plato"
                  ? "Wert in °Plato"
                  : convFrom === "brix"
                  ? "Wert in °Brix"
                  : convFrom === "gravity"
                  ? "Wert in SG"
                  : "Wert eingeben"
              }
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
        </ScrollView>
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
    inputDisabled: {
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
    radioCol: {
      flexDirection: "column",
      textAlign: "left",
      marginBottom: 4,
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
