// app/quiz.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useStudy, QUIZ_PERFORMANCE_URL } from "../StudyContext";

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export default function QuizScreen() {
  const { apiData, user } = useStudy();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSavedScore, setLastSavedScore] = useState<number | null>(null);

  // NEW: which question is currently visible
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  if (!apiData) return messageScreen("No study data yet. Upload a PDF.");
  const quiz = apiData.quiz || [];
  if (!quiz.length) return messageScreen("No quiz questions generated.");

  const totalQuestions = quiz.length;

  const materialId = (apiData as any)?.material_id || null;
  const quizStats = (apiData as any)?.quiz_stats || null;
  const perQuestionStats =
    (quizStats && (quizStats as any).per_question) || {};

  // ---------- helper to compute score ----------
  const calculateScore = (currentAnswers: Record<number, string>) => {
    return quiz.reduce((acc: number, q: any, idx: number) => {
      return currentAnswers[idx] === q.answer ? acc + 1 : acc;
    }, 0);
  };

  /**
   * Submit full attempt to backend:
   * - all answers
   * - server computes stats + last_unsolved
   */
  const syncPerformance = async (
    newAnswers: Record<number, string>,
    finalScore: number
  ) => {
    if (!user?.id || !materialId) return;

    // convert {0: "opt"} to {"0": "opt or null"}
    const answersPayload: Record<string, string | null> = {};
    quiz.forEach((q: any, idx: number) => {
      const sel = newAnswers[idx];
      answersPayload[String(idx)] = sel ?? null;
    });

    // list of questions not solved (wrong or not answered)
    const unsolvedQuestions = quiz
      .map((q: any, idx: number) => {
        const sel = newAnswers[idx];
        if (!sel || sel !== q.answer) {
          return {
            index: idx,
            question: q.question,
            correct_answer: q.answer,
            selected_answer: sel ?? null,
            options: q.options || [],
          };
        }
        return null;
      })
      .filter(Boolean);

    const payload = {
      user_id: user.id,
      material_id: materialId,
      answers: answersPayload,
      unsolved_questions: unsolvedQuestions,
    };

    try {
      setSaving(true);
      setSyncError(null);

      const resp = await fetch(QUIZ_PERFORMANCE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.log("quiz_performance error:", resp.status, text);
        setSyncError("Sync failed");
        return;
      }

      const json = await resp.json();
      console.log("quiz_performance saved:", json);
      setLastSavedScore(finalScore);
    } catch (err: any) {
      console.log("quiz_performance request error:", err);
      setSyncError("Sync error");
    } finally {
      setSaving(false);
    }
  };

  // -------- answer selection (no network here) --------
  const selectOption = (qIdx: number, opt: string) => {
    const newAnswers = { ...answers, [qIdx]: opt };
    setAnswers(newAnswers);

    // update score locally for UI
    const newScore = calculateScore(newAnswers);
    setScore(newScore);
  };

  // -------- submit button handler --------
  const submitQuiz = () => {
    if (!user?.id || !materialId) return;
    if (!Object.keys(answers).length) return;

    const finalScore = calculateScore(answers);
    setScore(finalScore);
    syncPerformance(answers, finalScore);
  };

  const syncStatusLabel = () => {
    if (!user?.id || !materialId) return "Not synced (no user / material)";
    if (saving) return "Saving...";
    if (syncError) return syncError;
    if (lastSavedScore !== null) return "Saved";
    if (!Object.keys(answers).length) return "Answer questions, then submit";
    return "Tap Submit to save";
  };

  const canSubmit =
    !!user?.id && !!materialId && Object.keys(answers).length > 0 && !saving;

  const answeredCount = Object.keys(answers).length;

  // navigation
  const goNext = () => {
    setCurrentQuestionIndex((prev) =>
      prev < totalQuestions - 1 ? prev + 1 : prev
    );
  };

  const goPrev = () => {
    setCurrentQuestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const currentQuestion = quiz[currentQuestionIndex];
  const currentStats = perQuestionStats[String(currentQuestionIndex)] || null;
  const currentSelected = answers[currentQuestionIndex];

  const needsRevision =
    currentStats &&
    typeof currentStats.attempts === "number" &&
    typeof currentStats.correct === "number" &&
    currentStats.correct === 0 &&
    currentStats.attempts >= 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Main content scrolls vertically, but only one question at a time */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.quizContent}
      >
        <Card style={styles.questionCard}>
          {/* Top header like "Question 1 of 5" with circle */}
          <View style={styles.questionHeaderRow}>
            <View style={styles.questionIndexCircle}>
              <Text style={styles.questionIndexCircleText}>
                {currentQuestionIndex + 1}
              </Text>
            </View>
            <View>
              <Text style={styles.questionHeaderTitle}>
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 10, marginTop: 8 }}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>

            {currentStats && (
              <Text
                style={[
                  styles.revisionTag,
                  needsRevision && styles.revisionTagHighlight,
                ]}
              >
                {needsRevision
                  ? "Revision: you often miss this"
                  : `Attempts: ${currentStats.attempts ?? 0}, Correct: ${
                      currentStats.correct ?? 0
                    }`}
              </Text>
            )}
          </View>

          {currentQuestion.options?.map((opt: string, i: number) => {
            const hasSelected = !!currentSelected;
            const isSelected = currentSelected === opt;
            const isCorrect = currentQuestion.answer === opt;

            let bg = "#F3F4F6";
            if (hasSelected) {
              if (isCorrect) bg = "#DCFCE7";
              else if (isSelected && !isCorrect) bg = "#FECACA";
            }

            const optionLetter = String.fromCharCode(65 + i);

            return (
              <Pressable
                key={i}
                onPress={() => selectOption(currentQuestionIndex, opt)}
                style={[styles.optionButton, { backgroundColor: bg }]}
              >
                <View style={styles.optionCircle}>
                  <Text style={styles.optionCircleText}>{optionLetter}</Text>
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            );
          })}

          {currentSelected && (
            <View style={styles.explanationBlock}>
              <View style={styles.explanationDivider} />
              <Text style={styles.explanationLabel}>Explanation</Text>
              <Text style={styles.explanationBody}>
                {currentQuestion.explanation}
              </Text>
            </View>
          )}
        </Card>

        {/* Pagination dots + Prev/Next like the screenshot */}
        <View style={styles.paginationWrapper}>
          <View style={styles.paginationDotsRow}>
            {quiz.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.paginationDot,
                  idx === currentQuestionIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.paginationButtonsRow}>
            <Pressable
              onPress={goPrev}
              disabled={currentQuestionIndex === 0}
              style={[
                styles.navButton,
                styles.navButtonSecondary,
                currentQuestionIndex === 0 && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.navButtonSecondaryText}>Previous</Text>
            </Pressable>

            <Pressable
              onPress={goNext}
              disabled={currentQuestionIndex === totalQuestions - 1}
              style={[
                styles.navButton,
                styles.navButtonPrimary,
                currentQuestionIndex === totalQuestions - 1 && { opacity: 0.5 },
              ]}
            >
              <LinearGradient
                colors={["#2563EB", "#9333EA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.navButtonGradient}
              >
                <Text style={styles.navButtonPrimaryText}>Next</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar (keeps your existing submit + sync logic) */}
      <View style={styles.scoreBarWrapper}>
        <LinearGradient
          colors={["#2563EB", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scoreBarContainer}
        >
          <View style={styles.scoreBarInner}>
            <View>
              <Text style={styles.scoreLabel}>Progress</Text>
              <Text style={styles.scoreValue}>
                {answeredCount} of {totalQuestions} 
              </Text>
            </View>

            <Text style={styles.syncStatusText}>{syncStatusLabel()}</Text>

            <Pressable
              onPress={submitQuiz}
              disabled={!canSubmit}
              style={[
                styles.submitButton,
                !canSubmit && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.submitButtonText}>
                {saving ? "Saving..." : "Submit"}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

/* Helper screen for no quiz / no data */
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F6F6",
  },
  scroll: { flex: 1 },
  quizContent: {
    padding: 16,
    paddingBottom: 140,
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  // NEW: question header row (circle + "Question 1 of 5")
  questionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionIndexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  questionIndexCircleText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  questionHeaderTitle: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },

  questionNumber: {
    fontWeight: "700",
    fontSize: 15,
    color: "#2563EB",
    marginBottom: 4,
  },
  questionText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#111827",
  },
  revisionTag: {
    marginTop: 4,
    fontSize: 11,
    color: "#6B7280",
  },
  revisionTagHighlight: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  optionButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  optionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  optionCircleText: {
    fontWeight: "600",
    color: "#374151",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
  },
  explanationBlock: {
    marginTop: 12,
  },
  explanationDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  explanationLabel: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 4,
  },
  explanationBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },

  // NEW: pagination nav like screenshot
  paginationWrapper: {
    marginTop: 8,
  },
  paginationDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
  },
  paginationButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  navButtonSecondary: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonSecondaryText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 14,
  },
  navButtonPrimary: {
    backgroundColor: "transparent",
  },
  navButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonPrimaryText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  scoreBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    height: 80,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  scoreBarContainer: {
    width: "88%",
    height: 55,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "88%",
  },
  scoreLabel: {
    fontWeight: "600",
    color: "white",
    fontSize: 15,
  },
  scoreValue: {
    fontWeight: "700",
    color: "white",
    fontSize: 15,
  },
  syncStatusText: {
    color: "white",
    fontSize: 11,
    textAlign: "right",
    maxWidth: 170,
  },
  submitButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  submitButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
});
