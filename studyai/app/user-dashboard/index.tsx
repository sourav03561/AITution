// app/user-dashboard/index.tsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable
} from "react-native";
import { useStudy, BASE_URL } from "../../StudyContext";
import { Feather } from "@expo/vector-icons";

// charts
import { LineChart, BarChart } from "react-native-gifted-charts";
import { useRouter } from "expo-router";
type Summary = {
  total_attempts: number;
  distinct_materials: number;
  overall_accuracy: number; // %
  avg_score: number; // raw score
  avg_accuracy: number; // %
  best_score: number;
  best_accuracy: number; // %
};

type AttemptRow = {
  attempt_no: number;
  material_id: string;
  created_at: string;
  score: number;
  total_questions: number;
  accuracy: number; // %
  correct: number;
  wrong: number;
  skipped: number;
  
};

type ByDateRow = {
  date: string; // "YYYY-MM-DD"
  attempts: number;
  avg_score: number;
  avg_accuracy: number; // %
};

type DashboardUserResponse = {
  summary: Summary;
  attempts: AttemptRow[];
  by_date: ByDateRow[];
};

export default function UserDashboardScreen() {
  const router = useRouter();
  const { user } = useStudy();
  const [data, setData] = useState<DashboardUserResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setErr(null);
      try {
        const resp = await fetch(`${BASE_URL}/api/dashboard/user/${user.id}`);
        const json = await resp.json();
        if (!resp.ok || json.error) {
          setErr(json.error || "Failed to load performance");
        } else {
          setData(json);
        }
      } catch (e: any) {
        console.log("User dashboard fetch error:", e);
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  if (!user?.id) {
    return messageScreen("Log in to see your overall quiz performance.");
  }

  if (loading && !data) {
    return loadingScreen("Loading your performance...");
  }

  if (err) {
    return messageScreen(`Error: ${err}`);
  }

  if (!data) {
    return messageScreen("No performance data found yet.");
  }

  const { summary, attempts, by_date } = data;

  if (!summary || summary.total_attempts === 0) {
    return messageScreen(
      "You haven't taken any quizzes yet. Start a quiz to see your stats!"
    );
  }
const toggleExpand = (materialId: string) => {
  setExpanded((prev) => ({
    ...prev,
    [materialId]: !prev[materialId],
  }));
};

  const accuracyTrendData = by_date.map((d) => ({
    date: d.date,
    accuracy: d.avg_accuracy,
  }));
  const today = by_date.length > 0 ? by_date[by_date.length - 1] : null;
const groupedAttempts =
  attempts?.reduce((acc: Record<string, AttemptRow[]>, a) => {
    if (!acc[a.material_id]) {
      acc[a.material_id] = [];
    }
    acc[a.material_id].push(a);
    return acc;
  }, {}) || {};
const getTodayMessage = (accuracy: number, attempts: number) => {
  if (attempts === 0) {
    return "No attempts yet today. Start a quick quiz to build momentum.";
  }

  if (accuracy >= 80) {
    return `Excellent work! You scored ${accuracy.toFixed(
      1
    )}% accuracy today 🎉`;
  }

  if (accuracy >= 60) {
    return `Nice progress! You achieved ${accuracy.toFixed(
      1
    )}% accuracy today.`;
  }

  if (accuracy >= 40) {
    return `You practiced today — accuracy is ${accuracy.toFixed(
      1
    )}%. Reviewing mistakes will help improve.`;
  }

  return `Tough day, but effort matters. Reviewing today’s quiz will help a lot.`;
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your Performance</Text>
        <Text style={styles.subtitle}>
          Overall statistics across all quizzes and study materials.
        </Text>

        {/* Top summary cards */}
<Card style={styles.heroCard}>
  {/* Title */}
  <Text style={styles.heroLabel}>Overall Accuracy</Text>

  {/* Main value row */}
  <View style={styles.heroValueRow}>
    <Text style={styles.heroValue}>
      {summary.overall_accuracy.toFixed(1)}%
    </Text>

    {/* Change indicator (static or dynamic) */}
    <View style={styles.heroChange}>
      <Text style={styles.heroChangeText}>↗ +4.2%</Text>
    </View>
  </View>

  <Text style={styles.heroSubtext}>vs last week</Text>

  {/* Divider */}
  <View style={styles.heroDivider} />

  {/* Bottom stats */}
  <View style={styles.heroStatsRow}>
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>Best Score</Text>
      <Text style={styles.heroStatValue}>
        {summary.best_accuracy.toFixed(0)}%
      </Text>
    </View>

    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>Avg Accuracy</Text>
      <Text style={styles.heroStatValue}>
        {summary.avg_accuracy.toFixed(1)}%
      </Text>
    </View>

    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>Total Attempts</Text>
      <Text style={styles.heroStatValue}>
        {summary.total_attempts}
      </Text>
    </View>
  </View>
</Card>
{today && (
  <Card style={styles.todayCard}>
    {/* Header: green icon + text */}
    <View style={styles.todayHeaderRow}>
      <View style={styles.todayIconCircle}>
        {/* you can replace this with an icon component if you use one */}
        <Text style={styles.todayIcon}>↗</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.todayTitle}>Today's Performance</Text>
<Text
  style={[
    styles.todaySubtitle,
    {
      color:
        today.avg_accuracy >= 60
          ? "#166534"
          : today.avg_accuracy >= 40
          ? "#92400E"
          : "#7F1D1D",
    },
  ]}
>
  {getTodayMessage(today.avg_accuracy, today.attempts)}
</Text>
      </View>
    </View>

    {/* Stats row: two white pills */}
    <View style={styles.todayStatsRow}>
      <View style={styles.todayStatPill}>
        <Text style={styles.todayStatLabel}>Attempts Today</Text>
        <Text style={styles.todayStatValue}>{today.attempts}</Text>
      </View>

      <View style={[styles.todayStatPill, { marginLeft: 12 }]}>
        <Text style={styles.todayStatLabel}>Accuracy</Text>
        <Text style={styles.todayStatValue}>
          {today.avg_accuracy.toFixed(1)}%
        </Text>
      </View>
    </View>
    {/* Action buttons */}
<View style={styles.todayActionsRow}>
  <Pressable style={styles.reviewButton} onPress={() => router.push("/dashboard")}>
    <Text style={styles.reviewButtonText}>Review Quiz</Text>
  </Pressable>

  <Pressable style={styles.tryAnotherButton} onPress={() => router.push("/quiz")}>
    <Text style={styles.tryAnotherButtonText}>Try Another</Text>
  </Pressable>
</View>

  </Card>
)}

       {by_date.length > 0 && (
          <>
            <View style={[styles.row, { marginTop: 12 }]}>
              <Card style={styles.cardLarge}>
                <Text style={styles.sectionTitle}>Daily Performance</Text>
                <Text style={styles.smallMuted}>
                  Average accuracy & attempts per day.
                </Text>
                <View style={styles.chartContainer}>
                  <DailyPerformanceChart data={by_date} />
                </View>
              </Card>
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <Card style={styles.cardLarge}>
                <Text style={styles.sectionTitle}>Accuracy Trend</Text>
                <Text style={styles.smallMuted}>
                  Your performance improvement over time.
                </Text>
                <View style={styles.chartContainer}>
                  <AccuracyTrendChart data={accuracyTrendData} />
                </View>
              </Card>
            </View>
          </>
        )}

        {/* Score by Attempt */}
        {attempts.length > 0 && (
 <View style={{ marginTop: 12 }}>
  <Text style={styles.sectionTitle}>Quiz Performance</Text>

  <View style={{ marginTop: 12 }}>
    {Object.entries(groupedAttempts).map(
      ([materialId, list]: any) => {
        const best = Math.max(...list.map((a: AttemptRow) => a.accuracy));
        const avg =
          list.reduce((s: number, a: AttemptRow) => s + a.accuracy, 0) /
          list.length;

        const isOpen = expanded[materialId];

        return (
          <View
            key={materialId}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            {/* HEADER */}
            <Pressable
              onPress={() => toggleExpand(materialId)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={{ fontSize: 14, fontWeight: "700" }}>
                  Quiz - {list[0].material_name}
                </Text>
                <Text style={styles.smallMuted}>
                  {list.length} attempts
                </Text>
              </View>
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
  }}
>
  <View style={{ alignItems: "flex-end", marginRight: 6 }}>
    <Text style={{ fontSize: 12 }}>
      Best: {best.toFixed(0)}%
    </Text>
    <Text style={styles.smallMuted}>
      Avg: {avg.toFixed(1)}%
    </Text>
  </View>

<Feather
  name="chevron-down"
  size={20}
  color="#6B7280"
  style={{
    transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
  }}
/>

</View>

            </Pressable>

            {/* SUMMARY BAR */}
            <View style={{ marginTop: 10}}>
              <Bar percentage={avg} barColor="#111827"/>
            </View>

            {/* EXPANDED ATTEMPTS */}
            {isOpen && (
              <View style={{ marginTop: 12 }}>
                {list.map((a: AttemptRow) => (
                  <View
                    key={`${a.material_id}-${a.attempt_no}`}
                    style={{ marginBottom: 8 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#4B5563" }}>
                        Attempt #{a.attempt_no}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            a.accuracy >= 70
                              ? "#22C55E"
                              : a.accuracy >= 40
                              ? "#F59E0B"
                              : "#EF4444",
                        }}
                      >
                        {a.correct}/{a.total_questions} •{" "}
                        {a.accuracy.toFixed(0)}%
                      </Text>
                    </View>

                    <Bar
                      percentage={a.accuracy}
                      barColor={
                        a.accuracy >= 70
                          ? "#22C55E"
                          : a.accuracy >= 40
                          ? "#F59E0B"
                          : "#EF4444"
                      }
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      }
    )}
  </View>
</View>

        )}

        {/* Daily Performance + Accuracy Trend */}
 
        {/* Today's Performance card */}


      </ScrollView>
    </SafeAreaView>
  );
}

/* -------- CHART COMPONENTS -------- */

interface AccuracyTrendData {
  date: string;
  accuracy: number;
}

interface AccuracyTrendChartProps {
  data: AccuracyTrendData[];
}

function AccuracyTrendChart({ data }: AccuracyTrendChartProps) {
  if (data.length < 2) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={styles.smallMuted}>
          Need at least 2 days of activity to display a trend.
        </Text>
      </View>
    );
  }

  const chartData = data.map((item) => ({
    value: item.accuracy,
    label: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <LineChart
      data={chartData}
      areaChart
      curved
      startFillColor="rgba(22,163,74,0.25)"
      endFillColor="rgba(22,163,74,0)"
      startOpacity={1}
      endOpacity={0}
      thickness={3}
      color="#16a34a"
      hideDataPoints={false}
      dataPointsHeight={8}
      dataPointsWidth={8}
      dataPointsColor="#16a34a"
      xAxisLabelTexts={chartData.map((d) => d.label)}
      xAxisLabelTextStyle={{ fontSize: 10, color: "#6b7280" }}
      yAxisTextStyle={{ fontSize: 10, color: "#9ca3af" }}
      noOfSections={4}
      maxValue={100}
      yAxisLabelTexts={["0", "25", "50", "75", "100"]}
      animateOnDataChange
      animationDuration={600}
      xAxisThickness={0}
      yAxisThickness={0}
      rulesColor="#f3f4f6"
      rulesType="dashed"
      rulesThickness={1}
      spacing={30}
    />
  );
}

interface DailyPerformanceChartProps {
  data: ByDateRow[];
}

function DailyPerformanceChart({ data }: DailyPerformanceChartProps) {
  if (data.length === 0) return null;

  const maxAttempts = Math.max(...data.map((d) => d.attempts), 1);

  const barWidth = 12;
  const spacing = 28;
  const initialSpacing = 20;

  // green bars = accuracy
  const accuracyData = data.map((d) => ({
    value: d.avg_accuracy,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    frontColor: "#22C55E",
  }));

  // blue bars = attempts (scaled to 0–100), with count above bar
  const attemptsData = data.map((d) => ({
    value: (d.attempts / maxAttempts) * 10,
    frontColor: "#3B82F6",
    topLabelComponent: () => (
      <Text style={styles.dailyTopLabel}>{d.attempts}</Text>
    ),
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Green accuracy bars (with axes & labels) */}
      <BarChart
        data={accuracyData}
        barWidth={barWidth}
        noOfSections={4}
        maxValue={100}
        barBorderRadius={4}
        yAxisTextStyle={{ fontSize: 10, color: "#9ca3af" }}
        xAxisLabelTextStyle={{ fontSize: 10, color: "#6b7280" }}
        rulesThickness={1}
        rulesType="dashed"
        rulesColor="#f3f4f6"
        xAxisThickness={0}
        yAxisThickness={0}
        spacing={spacing}
        initialSpacing={initialSpacing}
        animateOnDataChange
        animationDuration={600}
      />

      {/* Blue attempts bars overlayed and shifted right */}
      <View style={StyleSheet.absoluteFill}>
        <BarChart
          data={attemptsData}
          barWidth={barWidth}
          noOfSections={4}
          maxValue={100}
          barBorderRadius={4}
          spacing={spacing}
          initialSpacing={initialSpacing + barWidth + 4}
          animateOnDataChange
          animationDuration={600}
          // hide axes/labels for overlay chart
          yAxisTextStyle={{ color: "transparent" }}
          xAxisLabelTextStyle={{ color: "transparent" }}
          rulesThickness={0}
          xAxisThickness={0}
          yAxisThickness={0}
        />
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", marginTop: 6, alignItems: "center" ,marginLeft: "30%"}}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: "#22C55E" }]}
          />
          <Text style={styles.legendLabel}>Accuracy</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: "#3B82F6" }]}
          />
          <Text style={styles.legendLabel}>Attempts</Text>
        </View>
      </View>
    </View>
  );
}

/* -------- SMALL HELPERS -------- */

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Bar({
  percentage,
  barColor = "#22C55E",
}: {
  percentage: number;
  barColor?: string;
}) {
  const clamped = Math.max(8, Math.min(percentage, 100));

  return (
    <View style={styles.barBackground}>
      <View
        style={[
          styles.barFill,
          { width: `${clamped}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}

function messageScreen(text: string) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 16,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text>{text}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function loadingScreen(text: string) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: "white",
            padding: 16,
            borderRadius: 16,
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <ActivityIndicator style={{ marginBottom: 8 }} />
          <Text>{text}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------- STYLES -------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSmall: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardLarge: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  smallMuted: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  barBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginTop: 4,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  attemptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attemptLabel: {
    fontSize: 12,
    color: "#4B5563",
  },
  attemptValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
  chartContainer: {
    marginTop: 10,
    height: 220,
  },
todayCard: {
  marginTop: 14,
  backgroundColor: "#ECFDF3",
  borderWidth: 1,
  borderColor: "#BBF7D0",
  borderRadius: 16,
  padding: 16,
},

todayHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
},

todayIconCircle: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#16A34A",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

todayIcon: {
  color: "white",
  fontSize: 22,
  fontWeight: "700",
},

todayTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#166534",
},

todaySubtitle: {
  fontSize: 13,
  color: "#166534",
  marginTop: 4,
},

todayStatsRow: {
  flexDirection: "row",
  marginTop: 16,
},

todayStatPill: {
  flex: 1,
  backgroundColor: "white",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 12,
  alignItems: "center",
},

todayStatLabel: {
  fontSize: 11,
  color: "#4B5563",
},

todayStatValue: {
  fontSize: 18,
  fontWeight: "700",
  color: "#111827",
  marginTop: 2,
},

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: "#4B5563",
  },
  legendNote: {
    fontSize: 10,
    color: "#6B7280",
  },
  dailyTopLabel: {
    fontSize: 10,
    color: "#111827",
    marginBottom: 1,
    fontWeight: "600",
  },heroCard: {
  marginTop: 12,
  padding: 16,
  borderRadius: 16,
  backgroundColor: "#FFFFFF",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
},

heroLabel: {
  fontSize: 13,
  color: "#6B7280",
  fontWeight: "500",
},

heroValueRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 6,
},

heroValue: {
  fontSize: 32,
  fontWeight: "800",
  color: "#111827",
},

heroChange: {
  marginLeft: 8,
  backgroundColor: "#ECFDF3",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 999,
},

heroChangeText: {
  fontSize: 12,
  color: "#16A34A",
  fontWeight: "600",
},

heroSubtext: {
  fontSize: 12,
  color: "#6B7280",
  marginTop: 2,
},

heroDivider: {
  height: 1,
  backgroundColor: "#E5E7EB",
  marginVertical: 14,
},

heroStatsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
},

heroStat: {
  alignItems: "center",
  flex: 1,
},

heroStatLabel: {
  fontSize: 11,
  color: "#6B7280",
},

heroStatValue: {
  fontSize: 16,
  fontWeight: "700",
  color: "#111827",
  marginTop: 2,
},
todayActionsRow: {
  flexDirection: "row",
  marginTop: 16,
},

reviewButton: {
  flex: 1,
  borderWidth: 1,
  borderColor: "#22C55E",
  borderRadius: 10,
  paddingVertical: 10,
  alignItems: "center",
  marginRight: 8,
  backgroundColor: "#FFFFFF",
},

reviewButtonText: {
  color: "#166534",
  fontWeight: "600",
  fontSize: 14,
},

tryAnotherButton: {
  flex: 1,
  backgroundColor: "#22C55E",
  borderRadius: 10,
  paddingVertical: 10,
  alignItems: "center",
  marginLeft: 8,
},

tryAnotherButtonText: {
  color: "#FFFFFF",
  fontWeight: "600",
  fontSize: 14,
},

});
