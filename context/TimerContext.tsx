import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  // Sorted descending. The tick auto-pauses when timeLeft crosses each value,
  // so the timer stops at hop thresholds even when no brewflow screen is mounted.
  hopThresholds?: number[];
}

interface TimerMethods {
  timer: TimerState | null;
  startTimer: (
    opts: Omit<
      TimerState,
      "notificationIds" | "paused" | "timeLeft" | "startTimestamp"
    >
  ) => void;
  pauseTimer: (atTimeLeft?: number) => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  extendTimer: (extraSeconds: number) => void;
  setHopThresholds: (thresholds: number[]) => void;
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
  // Always-current mirror of timer state. Read by getTimeLeft/getFormattedTime/
  // isPaused/isRunning so those functions stay accurate even when the context
  // memo hasn't propagated a new value to consumers yet.
  const timerRef = useRef<TimerState | null>(null);
  const intervalRef = useRef<number | null>(null);
  const storageKey = `activeTimer-${type}`;
  const [isRestoring, setIsRestoring] = useState(true);

  // Single tick function — reads directly from timerRef (always current) so
  // it never needs a functional setTimer updater for the normal path.
  // Critically, normal ticks do NOT call setTimer at all — getTimeLeft()
  // computes from startTimestamp dynamically so there is zero object
  // allocation and zero React state churn per second. setTimer is only called
  // on structural transitions (threshold crossed, timer reaches zero).
  const tick = () => {
    const prev = timerRef.current;
    if (!prev || prev.paused || prev.startTimestamp === null) return;

    const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
    const timeLeft = Math.max(0, prev.duration - elapsed);

    // Auto-pause at the next hop threshold. hopThresholds is sorted descending
    // so index 0 is always the soonest upcoming threshold. This stops the timer
    // even when the user is on a different screen — the DELIVERED foreground
    // event from Notifee is unreliable for AlarmManager triggers on Android.
    const nextThreshold = prev.hopThresholds?.[0];
    if (nextThreshold !== undefined && timeLeft <= nextThreshold) {
      setTimer((s) => {
        if (!s || s.paused || s.startTimestamp === null) return s;
        const next = {
          ...s,
          paused: true,
          startTimestamp: null,
          timeLeft: nextThreshold,
          hopThresholds: s.hopThresholds!.slice(1),
        };
        timerRef.current = next;
        AsyncStorage.setItem(storageKey, JSON.stringify(next));
        loadNotifee().then((n) => n?.default.cancelAllNotifications());
        return next;
      });
      return;
    }

    if (timeLeft === 0) {
      setTimer((s) => {
        if (!s || s.paused || s.startTimestamp === null) return s;
        const next = { ...s, timeLeft: 0, paused: true, startTimestamp: null };
        timerRef.current = next;
        AsyncStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
      return;
    }

    // Normal tick: nothing to do. getTimeLeft() computes from startTimestamp
    // so consumers always read the correct value without a state update.
  };

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
              const restored = { ...parsed, timeLeft: 0, paused: true, startTimestamp: null };
              timerRef.current = restored;
              setTimer(restored);
            } else {
              const restored = { ...parsed, timeLeft: remaining, paused: false };
              timerRef.current = restored;
              setTimer(restored);
            }
          } else {
            // Paused timer — restore as-is.
            timerRef.current = parsed;
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

  // Only tick while the timer is actively running. Re-runs whenever the timer
  // starts, resumes (new startTimestamp), or is cleared (startTimestamp → null).
  // This means zero JS wake-ups when both timers are idle or paused.
  useEffect(() => {
    if (!timer || timer.paused || timer.startTimestamp === null) return;
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer?.startTimestamp]);

  // All timer mutation functions write directly to AsyncStorage (fire-and-forget)
  // rather than relying on a React effect. This guarantees the state is on disk
  // even if the app is killed immediately after the call — the effect approach
  // was unreliable because effects run after render and may not flush before kill.

  const startTimer = ({
    id,
    stepIndex,
    duration,
    targetSize,
  }: Omit<
    TimerState,
    "notificationIds" | "paused" | "timeLeft" | "startTimestamp"
  >) => {
    const newTimer: TimerState = {
      id,
      type,
      stepIndex,
      duration,
      targetSize,
      paused: false,
      startTimestamp: Date.now(),
      timeLeft: duration,
      notificationIds: {},
    };
    timerRef.current = newTimer;
    setTimer(newTimer);
    AsyncStorage.setItem(storageKey, JSON.stringify(newTimer));
  };

  const pauseTimer = (atTimeLeft?: number) => {
    setTimer((prev) => {
      if (!prev || prev.paused || prev.startTimestamp === null) return prev;
      const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
      const remaining = atTimeLeft ?? Math.max(0, prev.duration - elapsed);
      const next = { ...prev, paused: true, startTimestamp: null, timeLeft: remaining };
      timerRef.current = next;
      AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const resumeTimer = () => {
    setTimer((prev) => {
      if (!prev || !prev.paused) return prev;
      const next = {
        ...prev,
        paused: false,
        startTimestamp: Date.now(),
        duration: prev.timeLeft,
      };
      timerRef.current = next;
      AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const resetTimer = () => {
    timerRef.current = null;
    setTimer(null);
    AsyncStorage.removeItem(storageKey);
  };

  // Adds extra seconds to the current step. Updates both duration (so the
  // running tick stays accurate) and timeLeft (for immediate UI feedback).
  const extendTimer = (extraSeconds: number) => {
    setTimer((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        duration: prev.duration + extraSeconds,
        timeLeft: prev.timeLeft + extraSeconds,
      };
      timerRef.current = next;
      AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  // Read from ref so these stay accurate even when the context memo hasn't
  // propagated a new value — screens drive their own re-renders via a local
  // interval and call these during each render to get the fresh value.
  // When the timer is running, compute from startTimestamp rather than the
  // stored timeLeft field (which is no longer updated on normal ticks).
  const getTimeLeft = () => {
    const t = timerRef.current;
    if (!t) return 0;
    if (t.paused || t.startTimestamp === null) return t.timeLeft;
    const elapsed = Math.floor((Date.now() - t.startTimestamp) / 1000);
    return Math.max(0, t.duration - elapsed);
  };

  const getFormattedTime = () => {
    const secs = getTimeLeft();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isPaused = () => timerRef.current?.paused ?? true;
  const isRunning = () => {
    const t = timerRef.current;
    return !!t && !t.paused && t.timeLeft > 0;
  };

  const setNotificationId = (stepIndex: number, id: string) => {
    setTimer((prev) => {
      if (!prev) return prev;
      const next = { ...prev, notificationIds: { ...prev.notificationIds, [stepIndex]: id } };
      timerRef.current = next;
      AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const cancelNotification = async (stepIndex: number) => {
    const notifee = await loadNotifee();
    if (!notifee) return;

    const notifId = timer?.notificationIds?.[stepIndex];
    if (notifId) {
      await notifee.default.cancelNotification(notifId);
      setTimer((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          notificationIds: Object.fromEntries(
            Object.entries(prev.notificationIds).filter(
              ([k]) => Number(k) !== stepIndex
            )
          ),
        };
        AsyncStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    }
  };

  const getNotificationId = (stepIndex: number) =>
    timer?.notificationIds?.[stepIndex];

  const setHopThresholds = (thresholds: number[]) => {
    setTimer((prev) => {
      if (!prev) return prev;
      const sorted = [...thresholds].sort((a, b) => b - a);
      const next = { ...prev, hopThresholds: sorted };
      timerRef.current = next;
      AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return {
    timer,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    extendTimer,
    setHopThresholds,
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

  const setBrewPhase = async (phase: "mash" | "lauter" | "boil") => {
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

  const contextValue = useMemo(
    () => ({ mash, boil, stopAllTimers, brewSession, startBrewSession, setBrewPhase }),
    // Only structural changes (start, pause, resume, reset, restore) push a new
    // context value to consumers. timeLeft is excluded — screens that need to
    // display the countdown drive their own re-renders via a local interval and
    // read fresh values through getTimeLeft()/getFormattedTime() which read from
    // timerRef rather than the memoized state snapshot.
    [
      mash.timer?.id, mash.timer?.paused,
      boil.timer?.id, boil.timer?.paused,
      mash.isRestoring, boil.isRestoring,
      brewSession,
    ]
  );

  return (
    <TimerContext.Provider value={contextValue}>
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
