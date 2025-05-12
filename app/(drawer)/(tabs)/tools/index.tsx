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
import { RadioButton, Menu } from "react-native-paper";

import {
  calculateAlc,
  adjustHopAmount,
  correctPlatoTemp,
  calculateDilutionVolume,
} from "@/utils/calcUtils";
// import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function CalcsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = createStyles(isDark);

  // Sidebar animation
  // const sidebarWidth = 250;
  // const [sidebarOpen, setSidebarOpen] = useState(false);
  // const slideAnim = useRef(new Animated.Value(-sidebarWidth)).current;
  // const toggleSidebar = () => {
  //   Animated.timing(slideAnim, {
  //     toValue: sidebarOpen ? -sidebarWidth : 0,
  //     duration: 200,
  //     easing: Easing.ease,
  //     useNativeDriver: true,
  //   }).start();
  //   setSidebarOpen(!sidebarOpen);
  // };

  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Scroll‐to logic (using onLayout)
  const scrollRef = useRef<ScrollView>(null);
  const [abvY, setAbvY] = useState(0);
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

  // 2) Hop AA% conversion
  const [originalAmount, setOriginalAmount] = useState("");
  const [originalAA, setOriginalAA] = useState("");
  const [actualAA, setActualAA] = useState("");

  // 3) Temperature correction (Plato)
  const [calTemp, setCalTemp] = useState("");
  const [measTemp, setMeasTemp] = useState("");
  const [measPlato, setMeasPlato] = useState("");

  // 4) Diluting wort with water to get desired gravity
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
          {/* <KeyboardAwareScrollView
  enableOnAndroid
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={styles.content}
> */}
          {/* Hamburger */}
          {/* <Pressable onPress={toggleSidebar} style={styles.hamburger}>
            <Ionicons name="menu" size={28} color={isDark ? "#fff" : "#000"} />
          </Pressable> */}

          {/* Sidebar */}
          {/* <Animated.View
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
            <Text style={styles.sidebarItem} onPress={() => scrollTo(diluY)}>
              Würzeverdünnung
            </Text>
          </Animated.View> */}

          {/* Backdrop */}
          {/* {sidebarOpen && (
            <Pressable style={styles.backdrop} onPress={toggleSidebar} />
          )} */}

          <View style={{ position: "absolute", top: 32, left: 16, zIndex: 10 }}>
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <Pressable onPress={openMenu}>
                  <Ionicons
                    name="menu"
                    size={28}
                    color={isDark ? "#fff" : "#000"}
                  />
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

            {og && fg ? (
              <>
                <Text style={styles.result}>
                  Alkoholgehalt:{" "}
                  {calculateAlc(parseFloat(og), parseFloat(fg), unit)}%vol
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
              </>
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
              placeholderTextColor={isDark ? "#aaa" : "#555"}
            />
            <TextInput
              style={styles.input}
              placeholder="Alpha-Säure laut Rezept (%α)"
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
              placeholderTextColor={isDark ? "#aaa" : "#555"}
            />
            <TextInput
              style={styles.input}
              placeholder="Würzemenge (L)"
              keyboardType="decimal-pad"
              value={originalWortVolume}
              onChangeText={setOriginalWortVolume}
              placeholderTextColor={isDark ? "#aaa" : "#555"}
            />
            <TextInput
              style={styles.input}
              placeholder="Gewünschte Stammwürze (°P)"
              keyboardType="decimal-pad"
              value={desiredGravity}
              onChangeText={setDesiredGravity}
              placeholderTextColor={isDark ? "#aaa" : "#555"}
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

function createStyles(isDark: boolean) {
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
      marginTop: 0,
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
