import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";

export type TimerType = "mash" | "boil";

interface TimerState {
  id: string;
  type: TimerType;
  stepIndex: number;
  duration: number; // in seconds
  timeLeft: number; // remaining seconds
  paused: boolean;
  startTimestamp: number | null; // Unix ms
  notificationIds: Record<number, string>; // stepIndex => notifId
}

interface TimerContextValue {
  timer: TimerState | null;
  startTimer: (
    opts: Omit<
      TimerState,
      "notificationIds" | "paused" | "timeLeft" | "startTimestamp"
    >
  ) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  getTimeLeft: () => number;
  getFormattedTime: () => string;
  isPaused: () => boolean;
  isRunning: () => boolean;
  setNotificationId: (stepIndex: number, id: string) => void;
  cancelNotification: (stepIndex: number) => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const [timer, setTimer] = useState<TimerState | null>(null);

  useEffect(() => {
    const persistTimer = async () => {
      if (timer) {
        await AsyncStorage.setItem("activeTimer", JSON.stringify(timer));
      } else {
        await AsyncStorage.removeItem("activeTimer");
      }
    };
    persistTimer();
  }, [timer]);

  useEffect(() => {
    const restoreTimer = async () => {
      const saved = await AsyncStorage.getItem("activeTimer");
      if (!saved) return;

      try {
        const parsed: TimerState = JSON.parse(saved);
        const now = Date.now();

        if (!parsed.paused && parsed.startTimestamp) {
          const elapsed = Math.floor((now - parsed.startTimestamp) / 1000);
          const remaining = parsed.duration - elapsed;

          if (remaining <= 0) {
            setTimer(null);
            await AsyncStorage.removeItem("activeTimer");
            return;
          }

          setTimer({
            ...parsed,
            timeLeft: remaining,
          });

          // 🔔 Schedule fallback notification again
          if (Device.isDevice) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Timer abgelaufen",
                body: "Der nächste Schritt kann beginnen.",
              },
              trigger: {
                type: "timeInterval",
                seconds: remaining,
                repeats: false,
              } as Notifications.TimeIntervalTriggerInput,
            });
          }
        } else {
          setTimer(parsed); // paused or not started
        }
      } catch (err) {
        console.warn("Failed to restore timer state:", err);
        setTimer(null);
      }
    };

    restoreTimer();
  }, []);

  const intervalRef = useRef<number | null>(null);

  const tick = () => {
    setTimer((prev) => {
      if (!prev || prev.paused || prev.startTimestamp === null) return prev;

      const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
      const newTimeLeft = Math.max(0, prev.duration - elapsed);

      return {
        ...prev,
        timeLeft: newTimeLeft,
      };
    });
  };

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = ({
    id,
    type,
    stepIndex,
    duration,
  }: Omit<
    TimerState,
    "notificationIds" | "paused" | "timeLeft" | "startTimestamp"
  >) => {
    setTimer({
      id,
      type,
      stepIndex,
      duration,
      paused: false,
      startTimestamp: Date.now(),
      timeLeft: duration,
      notificationIds: {},
    });
  };

  const pauseTimer = () => {
    setTimer((prev) => {
      if (!prev || prev.paused || prev.startTimestamp === null) return prev;

      const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
      const remaining = Math.max(0, prev.duration - elapsed);

      return {
        ...prev,
        paused: true,
        startTimestamp: null,
        timeLeft: remaining,
      };
    });
  };

  const resumeTimer = () => {
    setTimer((prev) => {
      if (!prev || !prev.paused) return prev;

      return {
        ...prev,
        paused: false,
        startTimestamp: Date.now(),
        duration: prev.timeLeft, // resume from here
      };
    });
  };

  const resetTimer = () => {
    setTimer(null);
  };

  const getTimeLeft = () => timer?.timeLeft ?? 0;

  const getFormattedTime = () => {
    const secs = getTimeLeft();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isPaused = () => timer?.paused ?? true;
  const isRunning = () => {
    return !!timer && !timer.paused && timer.timeLeft > 0;
  };

  const setNotificationId = (stepIndex: number, id: string) => {
    setTimer((prev) =>
      prev
        ? {
            ...prev,
            notificationIds: {
              ...prev.notificationIds,
              [stepIndex]: id,
            },
          }
        : prev
    );
  };

  const cancelNotification = async (stepIndex: number) => {
    const notifId = timer?.notificationIds?.[stepIndex];
    if (notifId) {
      await Notifications.cancelScheduledNotificationAsync(notifId);
      setTimer((prev) =>
        prev
          ? {
              ...prev,
              notificationIds: Object.fromEntries(
                Object.entries(prev.notificationIds).filter(
                  ([k]) => Number(k) !== stepIndex
                )
              ),
            }
          : prev
      );
    }
  };

  return (
    <TimerContext.Provider
      value={{
        timer,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        getTimeLeft,
        getFormattedTime,
        isPaused,
        isRunning,
        setNotificationId,
        cancelNotification,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimerContext = () => {
  const ctx = useContext(TimerContext);
  if (!ctx)
    throw new Error("useTimerContext must be used within TimerProvider");
  return ctx;
};
