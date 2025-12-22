import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
export function LegendRow({
  label,
  color,
  value,
  base,
}: {
  label: string;
  color: string;
  value: number;
  base: number;
}) {
  const percent = Math.round((value / base) * 100);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: color,
          marginRight: 8,
        }}
      />
      <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
        {percent}%
      </Text>
    </View>
  );
}
