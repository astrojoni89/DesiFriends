import { usePathname } from "expo-router";
import { useTimerContext } from "@/context/TimerContext";

/**
 * Returns extra bottom padding to apply to ScrollViews so the floating
 * TimerWidget never obscures content. Returns 0 when the bar is not visible.
 */
export function useBrewBarOffset(): number {
  const { mash, boil, brewSession } = useTimerContext();
  const pathname = usePathname();

  const isInBrewflow = pathname.includes("brewflow");
  const isBarVisible =
    !isInBrewflow && !!(mash.timer || boil.timer || brewSession);

  // Widget height (~44px) + position above tab bar (56px) - tab bar already
  // accounted for by screen layout, so 72px clears the widget with room to spare.
  return isBarVisible ? 72 : 0;
}
