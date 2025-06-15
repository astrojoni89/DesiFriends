import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TimerState {
  startTimestamp: number | null;
  duration: number;
  paused: boolean;
  frozenTime: number | null;
}

export function useTimer(id: string, initialDuration: number) {
  const [paused, setPaused] = useState(true);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [frozenTime, setFrozenTime] = useState<number | null>(initialDuration);
  const appState = useRef(AppState.currentState);
  const storageKey = `TIMER_STATE_${id}`;

  // --- Restore on mount
  useEffect(() => {
    const restore = async () => {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const state: TimerState = JSON.parse(saved);
        if (state.paused) {
          setFrozenTime(state.frozenTime ?? initialDuration);
          setPaused(true);
          setEndTime(null);
        } else if (state.startTimestamp) {
          const remaining = Math.max(
            0,
            Math.floor(
              (state.startTimestamp + state.duration * 1000 - Date.now()) / 1000
            )
          );
          if (remaining > 0) {
            setEndTime(Date.now() + remaining * 1000);
            setPaused(false);
            setFrozenTime(null);
          } else {
            // Timer expired while app was closed
            await AsyncStorage.removeItem(storageKey);
            setFrozenTime(initialDuration);
            setPaused(true);
            setEndTime(null);
          }
        }
      }
    };
    restore();
  }, []);

  // --- Save on state change
  useEffect(() => {
    const persist = async () => {
      const state: TimerState = {
        startTimestamp:
          !paused && endTime ? endTime - initialDuration * 1000 : null,
        duration: initialDuration,
        paused,
        frozenTime,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(state));
    };
    persist();
  }, [paused, endTime, frozenTime, initialDuration]);

  // --- App state awareness
  useEffect(() => {
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      setNow(Date.now());
    }
    appState.current = nextAppState;
  };

  // --- Ticker
  useEffect(() => {
    if (!endTime || paused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [endTime, paused]);

  const timeLeft =
    endTime && !paused
      ? Math.max(0, Math.floor((endTime - now) / 1000))
      : frozenTime ?? 0;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const togglePause = () => {
    if (!paused) {
      setFrozenTime(timeLeft);
      setEndTime(null);
    } else {
      if (frozenTime !== null) {
        const newEndTime = Date.now() + frozenTime * 1000;
        setEndTime(newEndTime);
      }
      setFrozenTime(null);
      setNow(Date.now());
    }
    setPaused((p) => !p);
  };

  const reset = async (startImmediately = false) => {
    if (startImmediately) {
      const targetEnd = Date.now() + initialDuration * 1000;
      setEndTime(targetEnd);
      setPaused(false);
      setFrozenTime(null);
    } else {
      setFrozenTime(initialDuration);
      setPaused(true);
      setEndTime(null);
    }
    setNow(Date.now());
    await AsyncStorage.removeItem(storageKey);
  };

  return {
    timeLeft,
    minutes,
    seconds,
    paused,
    togglePause,
    reset,
  };
}
