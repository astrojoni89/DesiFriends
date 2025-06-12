import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useTimer(initialDuration: number) {
  const [paused, setPaused] = useState(true);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [frozenTime, setFrozenTime] = useState<number | null>(initialDuration);
  const appState = useRef(AppState.currentState);

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

  const reset = (startImmediately = false) => {
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
