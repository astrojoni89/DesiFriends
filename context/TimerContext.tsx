import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { loadNotifee } from "@/utils/notifeeWrapper";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TimerType = "mash" | "boil";

interface TimerState {
  id: string;
  type: TimerType;
  stepIndex: number;
  duration: number;
  timeLeft: number;
  paused: boolean;
  startTimestamp: number | null;
  notificationIds: Record<number, string>;
}

interface TimerMethods {
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
  getNotificationId: (stepIndex: number) => string | undefined;
  cancelNotification: (stepIndex: number) => Promise<void>;
  isRestoring: boolean;
}

type TimerContextValue = {
  mash: TimerMethods;
  boil: TimerMethods;
  stopAllTimers: () => Promise<void>;
};

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

function useDualTimer(type: TimerType): TimerMethods {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<number | null>(null);
  const storageKey = `activeTimer-${type}`;
  const [isRestoring, setIsRestoring] = useState(true);

  const tick = () => {
    setTimer((prev) => {
      if (!prev || prev.paused || prev.startTimestamp === null) return prev;

      const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
      const timeLeft = Math.max(0, prev.duration - elapsed);

      if (timeLeft === 0 && !prev.paused) {
        return {
          ...prev,
          timeLeft: 0,
          paused: true,
          startTimestamp: null,
        };
      }

      return { ...prev, timeLeft };
    });
  };

  useEffect(() => {
    const persist = async () => {
      if (timer) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(timer));
      } else {
        await AsyncStorage.removeItem(storageKey);
      }
    };
    persist();
  }, [timer]);

  useEffect(() => {
    const restore = async () => {
      const saved = await AsyncStorage.getItem(storageKey);
      if (!saved) return;
      try {
        const parsed: TimerState = JSON.parse(saved);
        const now = Date.now();
        if (!parsed.paused && parsed.startTimestamp) {
          const elapsed = Math.floor((now - parsed.startTimestamp) / 1000);
          const remaining = parsed.duration - elapsed;
          if (remaining <= 0) {
            setTimer(null);
            await AsyncStorage.removeItem(storageKey);
          } else {
            setTimer({ ...parsed, timeLeft: remaining });
          }
        } else {
          setTimer(parsed);
        }
      } catch (err) {
        console.warn("Failed to restore timer:", err);
      }
      setIsRestoring(false);
    };
    restore();
  }, []);

  // useEffect(() => {
  //   intervalRef.current = setInterval(() => {
  //     setTimer((prev) => {
  //       if (!prev || prev.paused || prev.startTimestamp === null) return prev;
  //       const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
  //       const timeLeft = Math.max(0, prev.duration - elapsed);
  //       return { ...prev, timeLeft };
  //     });
  //   }, 1000);
  //   return () => {
  //     if (intervalRef.current) clearInterval(intervalRef.current);
  //   };
  // }, []);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (!prev || prev.paused || prev.startTimestamp === null) return prev;

        const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
        const timeLeft = Math.max(0, prev.duration - elapsed);

        // If time is up, pause the timer and clear startTimestamp
        if (timeLeft === 0 && !prev.paused) {
          return {
            ...prev,
            timeLeft: 0,
            paused: true,
            startTimestamp: null,
          };
        }

        return { ...prev, timeLeft };
      });
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = ({
    id,
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
        duration: prev.timeLeft,
      };
    });

    setTimeout(tick, 0); // force immediate update for UI responsiveness
  };

  const resetTimer = () => setTimer(null);

  const getTimeLeft = () => timer?.timeLeft ?? 0;

  const getFormattedTime = () => {
    const secs = getTimeLeft();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isPaused = () => timer?.paused ?? true;
  const isRunning = () => !!timer && !timer.paused && timer.timeLeft > 0;

  const setNotificationId = (stepIndex: number, id: string) => {
    setTimer((prev) =>
      prev
        ? {
            ...prev,
            notificationIds: { ...prev.notificationIds, [stepIndex]: id },
          }
        : prev
    );
  };

  const cancelNotification = async (stepIndex: number) => {
    const notifee = await loadNotifee();
    if (!notifee) return;

    const notifId = timer?.notificationIds?.[stepIndex];
    if (notifId) {
      await notifee.default.cancelNotification(notifId);
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

  const getNotificationId = (stepIndex: number) => {
    return timer?.notificationIds?.[stepIndex];
  };

  return {
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
    getNotificationId,
    isRestoring,
  };
}

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const mash = useDualTimer("mash");
  const boil = useDualTimer("boil");
  const [notifee, setNotifee] = useState<
    typeof import("@notifee/react-native") | null
  >(null);

  useEffect(() => {
    loadNotifee().then(setNotifee);
  }, []);

  const stopAllTimers = async () => {
    if (!notifee) return;

    // Cancel all mash notifications
    if (mash.timer) {
      const mashNotifs = Object.values(mash.timer.notificationIds);
      for (const id of mashNotifs) {
        await notifee?.default.cancelNotification(id);
      }
      mash.resetTimer();
    }

    // Cancel all boil notifications
    if (boil.timer) {
      const boilNotifs = Object.values(boil.timer.notificationIds);
      for (const id of boilNotifs) {
        await notifee?.default.cancelNotification(id);
      }
      boil.resetTimer();
    }
  };

  return (
    <TimerContext.Provider value={{ mash, boil, stopAllTimers }}>
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
