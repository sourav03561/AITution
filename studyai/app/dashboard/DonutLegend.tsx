import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LegendRow } from "./LegendRow";
interface DonutLegendProps {
  correct: number;
  wrong: number;
  skipped: number;
  base: number; // ✅ ADD THIS
}

export function DonutLegend({
  correct,
  wrong,
  skipped,
  base,
}: DonutLegendProps) {
  const safeBase = Math.max(base, 1);

  return (
    <View style={{ marginTop: 16, width: "100%" }}>
      <LegendRow label="Correct" color="#22C55E" value={correct} base={safeBase} />
      <LegendRow label="Wrong" color="#EF4444" value={wrong} base={safeBase} />
      <LegendRow label="Skipped" color="#F59E0B" value={skipped} base={safeBase} />
    </View>
  );
}
