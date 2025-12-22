// app/_layout.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StudyProvider } from "../StudyContext";

export default function RootLayout() {
  return (
    <StudyProvider>
      <Stack>
        {/* Home screen with custom header */}
        <Stack.Screen
          name="index"
          options={{
            header: () => (
              <View style={styles.header}>
                <View style={styles.headerRow}>
                  <View style={styles.logoCircle}>
                    <Text style={styles.logoEmoji}>✨</Text>
                  </View>
                  <View>
                    <Text style={styles.appTitle}>StudyAI</Text>
                    <Text style={styles.appSubtitle}>
                      AI-Powered Study Assistant
                    </Text>
                  </View>
                </View>
              </View>
            ),
          }}
        />
         <Stack.Screen
  name="home"
  options={{ headerShown: false }}
/>

        {/* Inner screens */}
        <Stack.Screen name="summary" options={{ title: "Summary" }} />
        <Stack.Screen name="flashcards" options={{ title: "Flashcards" }} />
        <Stack.Screen name="quiz" options={{ title: "Quiz" }} />
        <Stack.Screen name="ask" options={{ title: "Ask Questions" }} />
        <Stack.Screen name="videos" options={{ title: "Recommended Videos" }} />
        <Stack.Screen name="mindmap" options={{ title: "Mind Map" }} />
        <Stack.Screen name="mock-test" options={{ title: "Mock Test" }} />
        <Stack.Screen name="user-dashboard/index" options={{title: "My Dashboard",}}/>
        <Stack.Screen name="dashboard/index" options={{title: "quiz Dashboard",}}/>
     </Stack>
    </StudyProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoEmoji: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2563EB",
  },
  appSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
});
