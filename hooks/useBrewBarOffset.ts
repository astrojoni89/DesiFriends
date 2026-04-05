import { usePathname } from "expo-router";
import { useTimerContext } from "@/context/TimerContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Returns extra bottom padding to apply to ScrollViews so the floating
 * TimerWidget never obscures content. Returns 0 when the bar is not visible.
 *
 * The widget sits at `bottom: insets.bottom + 56` with a height of ~44px.
 *
 * - Tab screens: the tab navigator already ends the content area above the tab
 *   bar, so only the widget height needs clearance (~44px + breathing = 60px).
 *   No insets.bottom term is needed — the navigator handles that.
 *
 * - Modal screens: the viewport extends to the screen bottom, so we need the
 *   full insets.bottom + 56 + 44 + breathing = insets.bottom + 108px.
 */
export function useBrewBarOffset(): number {
  const { mash, boil, brewSession } = useTimerContext();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isInBrewflow = pathname.includes("brewflow");
  const isBarVisible =
    !isInBrewflow && !!(mash.timer || boil.timer || brewSession);

  if (!isBarVisible) return 0;

  const isModal = pathname.includes("/modal/");
  return isModal ? insets.bottom + 108 : 60;
}
