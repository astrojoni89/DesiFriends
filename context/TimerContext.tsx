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
  targetSize?: string;
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
  extendTimer: (extraSeconds: number) => void;
  getTimeLeft: () => number;
  getFormattedTime: () => string;
  isPaused: () => boolean;
  isRunning: () => boolean;
  setNotificationId: (stepIndex: number, id: string) => void;
  getNotificationId: (stepIndex: number) => string | undefined;
  cancelNotification: (stepIndex: number) => Promise<void>;
  isRestoring: boolean;
}

type BrewSession = { recipeId: string; targetSize?: string; phase?: "mash" | "lauter" | "boil" };

type TimerContextValue = {
  mash: TimerMethods;
  boil: TimerMethods;
  stopAllTimers: () => Promise<void>;
  brewSession: BrewSession | null;
  startBrewSession: (recipeId: string, targetSize?: string) => Promise<void>;
  setBrewPhase: (phase: "mash" | "lauter" | "boil") => Promise<void>;
};

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

function useDualTimer(type: TimerType): TimerMethods {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<number | null>(null);
  const storageKey = `activeTimer-${type}`;
  const [isRestoring, setIsRestoring] = useState(true);

  // Single tick function — used by the interval and for immediate updates.
  // Uses a functional setTimer updater so it never closes over stale state.
  const tick = () => {
    setTimer((prev) => {
      if (!prev || prev.paused || prev.startTimestamp === null) return prev;

      const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
      const timeLeft = Math.max(0, prev.duration - elapsed);

      if (timeLeft === 0) {
        return { ...prev, timeLeft: 0, paused: true, startTimestamp: null };
      }

      return { ...prev, timeLeft };
    });
  };

  // Persist timer state to AsyncStorage on every change.
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

  // Restore timer state on mount.
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const parsed: TimerState = JSON.parse(saved);
          const now = Date.now();

          if (!parsed.paused && parsed.startTimestamp) {
            const elapsed = Math.floor((now - parsed.startTimestamp) / 1000);
            const remaining = parsed.duration - elapsed;

            if (remaining <= 0) {
              // Timer expired while app was closed. Preserve as an expired
              // state (timeLeft: 0, paused: true) so the screen can react —
              // e.g. boil.tsx will auto-navigate to the complete screen.
              setTimer({
                ...parsed,
                timeLeft: 0,
                paused: true,
                startTimestamp: null,
              });
            } else {
              setTimer({ ...parsed, timeLeft: remaining, paused: false });
            }
          } else {
            // Paused timer — restore as-is.
            setTimer(parsed);
          }
        }
      } catch (err) {
        console.warn("Failed to restore timer:", err);
      } finally {
        // Always mark restore as complete, even if there was nothing to restore
        // or an error occurred. Without this, isRestoring stays true forever
        // and blocks the auto-redirect in TimerProvider.
        setIsRestoring(false);
      }
    };
    restore();
  }, []);

  // Single interval — uses the shared tick function directly.
  useEffect(() => {
    intervalRef.current = setInterval(tick, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = ({
    id,
    stepIndex,
    duration,
    targetSize,
  }: Omit<
    TimerState,
    "notificationIds" | "paused" | "timeLeft" | "startTimestamp"
  >) => {
    setTimer({
      id,
      type,
      stepIndex,
      duration,
      targetSize,
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
      return { ...prev, paused: true, startTimestamp: null, timeLeft: remaining };
    });
  };

  const resumeTimer = () => {
    setTimer((prev) => {
      if (!prev || !prev.paused) return prev;
      return {
        ...prev,
        paused: false,
        startTimestamp: Date.now(),
        // duration becomes "remaining to count from" so the tick stays correct
        duration: prev.timeLeft,
      };
    });
  };

  const resetTimer = () => setTimer(null);

  // Adds extra seconds to the current step. Updates both duration (so the
  // running tick stays accurate) and timeLeft (for immediate UI feedback).
  const extendTimer = (extraSeconds: number) => {
    setTimer((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        duration: prev.duration + extraSeconds,
        timeLeft: prev.timeLeft + extraSeconds,
      };
    });
  };

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
        ? { ...prev, notificationIds: { ...prev.notificationIds, [stepIndex]: id } }
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

  const getNotificationId = (stepIndex: number) =>
    timer?.notificationIds?.[stepIndex];

  return {
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    extendTimer,
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

  const [brewSession, setBrewSessionState] = useState<BrewSession | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("brewSession").then((saved) => {
      if (saved) setBrewSessionState(JSON.parse(saved));
    });
  }, []);

  const startBrewSession = async (recipeId: string, targetSize?: string) => {
    const session: BrewSession = { recipeId, targetSize, phase: "mash" };
    await AsyncStorage.setItem("brewSession", JSON.stringify(session));
    setBrewSessionState(session);
  };

  const setBrewPhase = async (phase: "lauter" | "boil") => {
    setBrewSessionState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, phase };
      AsyncStorage.setItem("brewSession", JSON.stringify(updated));
      return updated;
    });
  };

  const stopAllTimers = async () => {
    const notifee = await loadNotifee();
    if (notifee) {
      // Cancel every scheduled notification in one call rather than
      // iterating stored IDs, which may be incomplete if a notification
      // was scheduled before its ID was saved back to state.
      await notifee.default.cancelAllNotifications();
    }
    mash.resetTimer();
    boil.resetTimer();
    await AsyncStorage.removeItem("brewSession");
    setBrewSessionState(null);
  };

  return (
    <TimerContext.Provider value={{ mash, boil, stopAllTimers, brewSession, startBrewSession, setBrewPhase }}>
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
