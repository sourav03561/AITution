// app/dashboard/index.tsx
import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useStudy } from "../../StudyContext";
import { DonutChart } from "./DonutChart";
import { DonutLegend } from "./DonutLegend";
import SmallStatCard from "./smallcard";
type HistoryItem = {
  score: number; // equals "correct" in backend
  wrong: number;
  correct: number;
  skipped: number;
  attempted: number; // answered (not skipped)
  attempt_no?: number;
  created_at?: string;
  total_questions: number; // total shown in that attempt (includes skipped)
};

type PerQuestionStats = {
  [index: string]: {
    attempts: number;
    correct: number;
    skipped: number;
  };
};

export default function QuizDashboard() {
  const { apiData } = useStudy();

  if (!apiData) {
    return messageScreen("No study data yet. Upload a PDF and take a quiz.");
  }

  const quizStats: any = (apiData as any).quiz_stats || null;
  const history: HistoryItem[] = quizStats?.history || [];
  const perQuestion: PerQuestionStats = quizStats?.per_question || {};

  if (!history.length) {
    return messageScreen("No quiz attempts yet. Take a quiz to see stats.");
  }

  const quiz = apiData.quiz || [];

  // --------- Derived Metrics ----------
const {
  totalAttempts,
  avgScore,
  avgAccuracy,
  bestScore,
  bestBase,
  lastAttempt,
  weakestQuestions,
  
  totalCorrect,        // ✅ ADD THIS
  totalAttempted,      // ✅ ADD THIS
} = useMemo(() => {
const totalAttempts = history.length;
let totalScore = 0;
let totalAccuracy = 0;

let bestAccuracy = 0;
let bestScore = 0;
let bestBase = 0;
let totalCorrect = 0;
let totalAttempted = 0;
history.forEach((h) => {
  // ✅ answered questions only
  const base = h.attempted;

  if (base === 0) return;

  const accuracy = h.correct / base;
  totalCorrect += h.correct;
  totalAttempted += h.attempted;
  totalScore += h.correct;
  totalAccuracy += accuracy;

  if (accuracy > bestAccuracy) {
    bestAccuracy = accuracy;
    bestScore = h.correct;
    bestBase = base;
  }
});

    const avgScore = totalAttempts > 0 ? totalScore / totalAttempts : 0;
    const avgAccuracy = totalAttempts > 0 ? totalAccuracy / totalAttempts : 0;
    const lastAttempt = history[history.length - 1];

    // Weakest questions
    const weak: {
      index: number;
      attempts: number;
      correct: number;
      skipped: number;
      wrong: number;
      accuracy: number;
      question: string;
    }[] = [];

    Object.entries(perQuestion).forEach(([idxStr, stats]) => {
      const idx = parseInt(idxStr, 10);
      const attempts = stats.attempts || 0;
      const correct = stats.correct || 0;
      const skipped = stats.skipped || 0;
      const wrong = Math.max(0, attempts - correct - skipped);

      if (!quiz[idx]) return;

      // accuracy on answered questions only (correct / (correct + wrong))
      const answered = correct + wrong;
      const accuracy = answered > 0 ? correct / answered : 0;

      weak.push({
        index: idx,
        attempts,
        correct,
        skipped,
        wrong,
        accuracy,
        question: quiz[idx].question,
      });
    });

    weak.sort((a, b) => {
      if (a.accuracy === b.accuracy) {
        return b.attempts - a.attempts;
      }
      return a.accuracy - b.accuracy;
    });

    const weakestQuestions = weak.slice(0, 3);

    return {
      totalAttempts,
      avgScore,
      avgAccuracy,
      bestScore,
      bestBase,
      lastAttempt,
      weakestQuestions,
        totalCorrect,
  totalAttempted,
    };
  }, [history, perQuestion, quiz]);

  // --------- Donut chart data for last attempt ----------
  const screenWidth = Dimensions.get("window").width;
  const donutSize = Math.min(screenWidth * 0.55, 220);

// Always derive base from last attempt itself
const lastCorrect = lastAttempt?.correct ?? 0;
const lastWrong = lastAttempt?.wrong ?? 0;
const lastSkipped = lastAttempt?.skipped ?? 0;

// ✅ This is the ONLY correct base for the donut
const lastBase = lastCorrect + lastWrong + lastSkipped;


const pieData = [
  {
    name: "Correct",
    population: lastCorrect,
    color: "#22C55E",
  },
  {
    name: "Wrong",
    population: lastWrong,
    color: "#F97373",
  },
  {
    name: "Skipped",
    population: lastSkipped,
    color: "#FBBF24",
  },
].filter(d => d.population > 0);

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: () => "#22C55E",
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Track your quiz performance and focus on weak areas.</Text>
        {/* High-level stats */}
{/* BIG Accuracy Card */}
<View style={styles.accuracyCard}>
  <Text style={styles.accuracyLabel}>Accuracy</Text>
  <Text style={styles.accuracyValue}>
    {(avgAccuracy * 100).toFixed(0)}%
  </Text>
  <Text style={styles.accuracySub}>Overall performance</Text>
</View>

{/* Row of two cards */}
<View style={styles.row}>
  <SmallStatCard
    label="Best Score"
    value={`${Math.round((bestScore / (bestBase  || quiz.length)) * 100)}%`}
  />
  <SmallStatCard
    label="Total Attempts"
    value={String(totalAttempts)}
  />
</View>

{/* Single card */}
<SmallStatCard
  label="Avg. Accuracy"
  value={`${totalCorrect} / ${totalAttempted}`}
/>





        {/* Last Attempt – Donut chart */}
        {lastAttempt && (
<View style={styles.donutContainer}>
  <View style={styles.breakdownHeader}>
  <Text style={styles.breakdownTitle}>Performance Breakdown</Text>
  <Text style={styles.breakdownSubtitle}>Your last attempt results</Text>
</View>


  <DonutChart
    size={donutSize}
    correct={lastCorrect}
    wrong={lastWrong}
    skipped={lastSkipped}
  />

  {/* Legend must stretch */}
  <View style={styles.legendContainer}>
<DonutLegend
  correct={lastCorrect}
  wrong={lastWrong}
  skipped={lastSkipped}
  base={lastBase}
/>

  </View>
</View>


 )}

        {/* Score by Attempt */}
        <Card style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>Score by Attempt</Text>
          <Text style={styles.smallMuted}>
            Each bar shows score proportion for that attempt.
          </Text>
          <View style={{ marginTop: 10 }}>
            {history.map((h, idx) => {
              const base =
                h.attempted > 0 ? h.attempted : h.total_questions;
              const ratio = base > 0 ? h.correct / base : 0;
              return (
                <View key={idx} style={{ marginBottom: 8 }}>
                  <View style={styles.attemptHeader}>
                    <Text style={styles.attemptLabel}>
                      Attempt #{h.attempt_no ?? idx + 1}
                    </Text>
                    <Text style={styles.attemptValue}>
                      {h.correct}/{base}
                    </Text>
                  </View>
                  <Bar ratio={ratio} />
                </View>
              );
            })}
          </View>
        </Card>

        {/* Weakest questions */}
        {weakestQuestions.length > 0 && (
          <Card style={styles.weakCard}>
            <Text style={styles.sectionTitle}>Worst Performing Questions</Text>
            <Text style={styles.smallMuted}>
              Focus your revision on these topics.
            </Text>

            {weakestQuestions.map((q) => {
              const accuracyPct = q.accuracy * 100;

              return (
                <View key={q.index} style={styles.worstCard}>
                  {/* Top row: Q chip + badge */}
                  <View style={styles.worstHeaderRow}>
                    <View style={styles.worstChip}>
                      <Text style={styles.worstChipText}>
                        Q{q.index + 1}
                      </Text>
                    </View>

                    <View style={styles.worstBadge}>
                      <Text style={styles.worstBadgeText}>
                        Revision Priority
                      </Text>
                    </View>
                  </View>

                  {/* Question text */}
                  <Text style={styles.worstQuestionText}>
                    {q.question}
                  </Text>

                  {/* Meta row */}
                  <View style={styles.worstMetaRow}>
                    <Text style={styles.worstMetaText}>
                      Attempts: {q.attempts}
                    </Text>
                    <Text style={styles.worstMetaText}>
                      Accuracy: {accuracyPct.toFixed(0)}%
                    </Text>
                    <Text style={styles.worstMetaText}>
                      Correct: {q.correct}
                    </Text>
                  </View>

                  {/* Orange accuracy bar */}
                  <Bar ratio={q.accuracy} barColor="#FB923C" />
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------- Reusable components ------- */

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SmallCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.cardSmall}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </Card>
  );
}

function Bar({
  ratio,
  barColor = "#22C55E",
}: {
  ratio: number;
  barColor?: string;
}) {
  // keep it safely between 0 and 1
  const safeRatio = Math.max(0, Math.min(1, isNaN(ratio) ? 0 : ratio));
  const width = safeRatio * 100; // 0–100%, directly from accuracy

  return (
    <View style={styles.barBackground}>
      <View
        style={[
          styles.barFill,
          { width: `${width}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}


function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

/* Helper screen for no data */
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

/* ------- Styles ------- */

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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
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
    marginTop: 6,
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

  // Donut chart styles
  donutRow: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 30,
  },
  donutWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  donutCenter: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  donutCenterValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  donutCenterLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  donutLegend: {
    flex: 1,
    marginLeft: 5,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  // Weak questions outer card
  weakCard: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#FFF7ED", // light orange section background
  },

  // New "worst question" card styles
  worstCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  worstHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  worstChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#FFEDD5",
  },
  worstChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FB923C",
  },
  worstBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FB923C",
  },
  worstBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  worstQuestionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  worstMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 4,
  },
  worstMetaText: {
    fontSize: 11,
    color: "#6B7280",
  },
donutContainer: {
  alignItems: "center",
  marginTop: 16,
  backgroundColor: "white",
  borderRadius: 16,
},

legendContainer: {
  width: "100%",        // 🔥 THIS FIXES THE ISSUE
  marginTop: 12,
  paddingHorizontal: 24,
},
accuracyCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 20,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#DCFCE7", // subtle green
  shadowColor: "#22C55E",
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 3,
},

accuracyLabel: {
  fontSize: 13,
  color: "#6B7280",
},

accuracyValue: {
  fontSize: 34,
  fontWeight: "800",
  color: "#F97316", // orange like screenshot
  marginVertical: 4,
},

accuracySub: {
  fontSize: 12,
  color: "#6B7280",
},

row: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 10,
},

sectionHeader: {
  marginBottom: 12,
},

sectionTitle1: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111827",
  textAlign: "left",
},

sectionSubtitle: {
  fontSize: 12,
  color: "#6B7280",
  marginTop: 2,
  textAlign: "left",
},
breakdownHeader: {
  width: "100%",          // 🔥 THIS FIXES IT
  marginBottom: 12,
  marginTop: 8,
  paddingLeft:15,
},

breakdownTitle: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111827",
  textAlign: "left",
},

breakdownSubtitle: {
  fontSize: 12,
  color: "#6B7280",
  marginTop: 2,
  textAlign: "left",
},

});

