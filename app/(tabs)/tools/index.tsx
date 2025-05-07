import { useState, useRef, RefObject } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
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
import { RadioButton } from "react-native-paper";

export default function CalcsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = createStyles(isDark);

  // Sidebar animation
  const sidebarWidth = 250;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-sidebarWidth)).current;
  const toggleSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: sidebarOpen ? -sidebarWidth : 0,
      duration: 200,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
    setSidebarOpen(!sidebarOpen);
  };

  // Scroll‐to logic (using onLayout)
  const scrollRef = useRef<ScrollView>(null);
  const [abvY, setAbvY] = useState(0);
  const [aaY, setAaY] = useState(0);
  const [tempY, setTempY] = useState(0);
  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y, animated: true });
    toggleSidebar();
  };

  // 1) ABV calculator
  const [og, setOg] = useState("");
  const [fg, setFg] = useState("");
  const [unit, setUnit] = useState<"gravity" | "plato" | "brix">("plato");
  const convertToGravity = (val: string) => {
    const n = parseFloat(val);
    if (unit === "gravity") return n;
    return 1 + n / (258.6 - (n / 258.2) * 227.1);
  };
  const abv =
    og && fg
      ? (
          ((76.08 * (convertToGravity(og) - convertToGravity(fg))) /
            (1.775 - convertToGravity(og))) *
          (convertToGravity(fg) / 0.794)
        ).toFixed(2)
      : null;

  // 2) Hop AA% conversion
  const [originalAmount, setOriginalAmount] = useState("");
  const [originalAA, setOriginalAA] = useState("");
  const [actualAA, setActualAA] = useState("");
  const adjustedAmount =
    originalAmount && originalAA && actualAA
      ? (
          (parseFloat(originalAmount) * parseFloat(originalAA)) /
          parseFloat(actualAA)
        ).toFixed(2)
      : null;

  // 3) Temperature correction (Plato)
  const [calTemp, setCalTemp] = useState("");
  const [measTemp, setMeasTemp] = useState("");
  const [measPlato, setMeasPlato] = useState("");
  const tempCorr =
    calTemp && measTemp && measPlato
      ? (() => {
          const Tcal = parseFloat(calTemp);
          const Tobs = parseFloat(measTemp);
          const Pobs = parseFloat(measPlato);
          // Plato → SG
          const sgObs = 1 + Pobs / (258.6 - (Pobs / 258.2) * 227.1);
          // linear correction ≈ 0.000303 × Δ°C
          const sgCorr = sgObs + 0.000303 * (Tobs - Tcal);
          // SG → Plato polynomial
          const Pcorr =
            -616.868 +
            1111.14 * sgCorr -
            630.272 * sgCorr * sgCorr +
            135.997 * sgCorr * sgCorr * sgCorr;
          return Pcorr.toFixed(2);
        })()
      : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content]} keyboardShouldPersistTaps="handled">
          {/* Hamburger */}
          <Pressable onPress={toggleSidebar} style={styles.hamburger}>
            <Ionicons name="menu" size={28} color={isDark ? "#fff" : "#000"} />
          </Pressable>

          {/* Sidebar */}
          <Animated.View
            style={[
              styles.sidebarContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <Text style={styles.sidebarItem} onPress={() => scrollTo(abvY)}>
              Alkoholgehalt
            </Text>
            <Text style={styles.sidebarItem} onPress={() => scrollTo(aaY)}>
              Hopfen-Anpassung
            </Text>
            <Text style={styles.sidebarItem} onPress={() => scrollTo(tempY)}>
              Temperatur-Korrektur Plato
            </Text>
          </Animated.View>

          {/* Backdrop */}
          {sidebarOpen && (
            <Pressable style={styles.backdrop} onPress={toggleSidebar} />
          )}

          {/* Main content */}
          {/* <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { minHeight: "100%" }]} keyboardShouldPersistTaps="handled"> */}
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
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              <TextInput
                style={styles.input}
                placeholder="Endwert"
                keyboardType="decimal-pad"
                value={fg}
                onChangeText={setFg}
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              {abv && (
                <>
                  <Text style={styles.result}>Alkoholgehalt: {abv}%vol</Text>
                  <Text style={styles.note}>
                    Berechnet mit der Balling-Formel.
                  </Text>
                </>
              )}
            </View>

            {/* Hop AA% Section */}
            <View
              onLayout={(e) => setAaY(e.nativeEvent.layout.y)}
              style={{ marginTop: 32 }}
            >
              <Text style={styles.title}>Hopfen-Anpassung (Alpha-Säure)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ursprüngliche Menge (g)"
                keyboardType="decimal-pad"
                value={originalAmount}
                onChangeText={setOriginalAmount}
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              <TextInput
                style={styles.input}
                placeholder="Originale Alpha-Säure (%α)"
                keyboardType="decimal-pad"
                value={originalAA}
                onChangeText={setOriginalAA}
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              <TextInput
                style={styles.input}
                placeholder="Tatsächliche Alpha-Säure (%α)"
                keyboardType="decimal-pad"
                value={actualAA}
                onChangeText={setActualAA}
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              {adjustedAmount && (
                <Text style={styles.result}>
                  Angepasste Menge: {adjustedAmount} g
                </Text>
              )}
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
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              <TextInput
                style={styles.input}
                placeholder="Gemessen bei (°C)"
                keyboardType="decimal-pad"
                value={measTemp}
                onChangeText={setMeasTemp}
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              <TextInput
                style={styles.input}
                placeholder="Gemessene Dichte (°P)"
                keyboardType="decimal-pad"
                value={measPlato}
                onChangeText={setMeasPlato}
                placeholderTextColor={isDark ? "#aaa" : "#555"}
              />
              {tempCorr && (
                <Text style={styles.result}>
                  Korrigierte Dichte: {tempCorr} °P
                </Text>
              )}
            </View>
          {/* </ScrollView> */}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function createStyles(isDark: boolean) {
  const sidebarWidth = 250;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#000" : "#fff",
    },
    content: {
      padding: 16,
      paddingTop: 76,
      flexGrow: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: isDark ? "#fff" : "#000",
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? "#444" : "#ccc",
      backgroundColor: isDark ? "#111" : "#f9f9f9",
      color: isDark ? "#fff" : "#000",
      padding: 10,
      marginBottom: 12,
      borderRadius: 8,
    },
    result: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 8,
      marginBottom: 16,
      color: isDark ? "#fff" : "#000",
    },
    note: {
      fontSize: 12,
      color: isDark ? "#aaa" : "#666",
      fontStyle: "italic",
      marginTop: 4,
    },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    radioText: {
      marginRight: 16,
      color: isDark ? "#ccc" : "#333",
    },
    hamburger: {
      position: "absolute",
      top: 16,
      left: 16,
      zIndex: 10,
      paddingTop: 16,
    },
    sidebarContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      width: sidebarWidth,
      bottom: 0,
      backgroundColor: isDark ? "#222" : "#eee",
      paddingTop: 76,
      paddingHorizontal: 8,
      zIndex: 9,
    },
    sidebarItem: {
      paddingVertical: 12,
      color: isDark ? "#fff" : "#000",
      fontWeight: "600",
    },
    backdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.3)",
      zIndex: 8,
    },
  });
}
