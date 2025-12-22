function SmallStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.smallStatCard}>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={styles.smallValue}>{value}</Text>
    </View>
  );
}
export default SmallStatCard;
import { View, Text, StyleSheet } from "react-native";

const styles = StyleSheet.create({smallStatCard: {
  flex: 1,
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 16,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
},

smallLabel: {
  fontSize: 12,
  color: "#6B7280",
},

smallValue: {
  fontSize: 22,
  fontWeight: "700",
  color: "#10B981", // green like screenshot
  marginTop: 4,
},
});