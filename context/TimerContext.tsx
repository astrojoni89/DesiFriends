// context/TimerContext.tsx
import React, { createContext, useContext } from "react";
import { useTimer } from "@/hooks/useTimer";

interface TimerControl {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  start: (duration: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
}

interface TimerContextType {
  mash: TimerControl;
  boil: TimerControl;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const mash = useTimer({ id: "mash" });
  const boil = useTimer({ id: "boil" });

  return (
    <TimerContext.Provider value={{ mash, boil }}>
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
