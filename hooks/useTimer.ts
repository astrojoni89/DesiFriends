// hooks/useTimer.ts
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TimerState {
  id: string;
  startTimestamp: number;
  duration: number;
  isPaused: boolean;
  pauseTimestamp?: number;
}

interface UseTimerProps {
  id: string;
  onFinish?: () => void;
}

export function useTimer({ id, onFinish }: UseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = `TIMER_STATE_${id}`;

  const tick = (start: number, duration: number) => {
    const now = Date.now();
    const elapsed = now - start;
    const remaining = Math.max(0, duration - elapsed);
    setTimeLeft(remaining);

    if (remaining <= 0) {
      clearInterval(intervalRef.current!);
      setIsRunning(false);
      setIsPaused(false);
      AsyncStorage.removeItem(storageKey);
      onFinish?.();
    }
  };

  const start = async (duration: number) => {
    const startTimestamp = Date.now();

    const timerState: TimerState = {
      id,
      startTimestamp,
      duration,
      isPaused: false,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(timerState));
    setTimeLeft(duration);
    setIsRunning(true);
    setIsPaused(false);
    tick(startTimestamp, duration);
    intervalRef.current = setInterval(
      () => tick(startTimestamp, duration),
      1000
    );
  };

  const pause = async () => {
    if (!isRunning) return;

    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return;

    const state = JSON.parse(raw) as TimerState;
    const now = Date.now();
    const elapsed = now - state.startTimestamp;
    const remaining = Math.max(0, state.duration - elapsed);

    const updatedState: TimerState = {
      ...state,
      duration: remaining,
      isPaused: true,
      pauseTimestamp: now,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedState));
    clearInterval(intervalRef.current!);
    setTimeLeft(remaining);
    setIsRunning(false);
    setIsPaused(true);
  };

  const resume = async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return;

    const state = JSON.parse(raw) as TimerState;
    if (!state.isPaused) return;

    const startTimestamp = Date.now();

    const updatedState: TimerState = {
      id,
      startTimestamp,
      duration: state.duration,
      isPaused: false,
    };

    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedState));
    setTimeLeft(state.duration);
    setIsRunning(true);
    setIsPaused(false);
    tick(startTimestamp, state.duration);
    intervalRef.current = setInterval(
      () => tick(startTimestamp, state.duration),
      1000
    );
  };

  const reset = async () => {
    clearInterval(intervalRef.current!);
    await AsyncStorage.removeItem(storageKey);
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
  };

  const restore = async () => {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return;
    const state = JSON.parse(raw) as TimerState;

    if (state.isPaused) {
      setTimeLeft(state.duration);
      setIsRunning(false);
      setIsPaused(true);
    } else {
      const now = Date.now();
      const elapsed = now - state.startTimestamp;
      const remaining = Math.max(0, state.duration - elapsed);
      setTimeLeft(remaining);
      setIsRunning(true);
      setIsPaused(false);
      intervalRef.current = setInterval(
        () => tick(state.startTimestamp, state.duration),
        1000
      );
    }
  };

  useEffect(() => {
    restore();
    return () => clearInterval(intervalRef.current!);
  }, []);

  return {
    timeLeft,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
  };
}
