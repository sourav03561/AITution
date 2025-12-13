import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useStudy } from "../StudyContext";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function FlashcardsScreen() {
  const { apiData } = useStudy();
  const flashcards = apiData?.flashcards || [];

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rotate = useSharedValue(0);

  if (!flashcards.length) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text>No flashcards yet.</Text>
      </SafeAreaView>
    );
  }

  const card = flashcards[index];

  // Flip
  const flipCard = () => {
    rotate.value = withTiming(flipped ? 0 : 180, { duration: 400 });
    setFlipped(!flipped);
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value}deg` }],
    backfaceVisibility: "hidden",
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value + 180}deg` }],
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  const nextCard = () => {
    setIndex((i) => Math.min(i + 1, flashcards.length - 1));
    rotate.value = 0;
    setFlipped(false);
  };

  const prevCard = () => {
    setIndex((i) => Math.max(i - 1, 0));
    rotate.value = 0;
    setFlipped(false);
  };

  const reset = () => {
    setIndex(0);
    rotate.value = 0;
    setFlipped(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topRow}>
        <Text style={styles.title}>Flashcards</Text>
        <TouchableOpacity onPress={reset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Tap card to reveal answer</Text>

      {/* PROGRESS */}
      <Text style={styles.counter}>
        Card {index + 1} of {flashcards.length}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((index + 1) / flashcards.length) * 100}%` },
          ]}
        />
      </View>

      {/* CARD */}
      <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
        <View style={styles.cardContainer}>
          {/* FRONT */}
          <Animated.View style={[styles.cardFront, frontStyle]}>
            <View style={styles.flashcardTagFront}>
              <Text style={styles.flashcardTagFrontText}>
                Flashcard {index + 1}
              </Text>
            </View>

            <Text style={styles.smallLabel}>QUESTION</Text>

            <Text style={styles.question}>{card.front}</Text>
            <Text style={styles.hint}>Tap to show answer</Text>
          </Animated.View>

          {/* BACK */}
          <Animated.View style={[styles.cardBack, backStyle]}>
            <LinearGradient
              colors={["#6D6DFE", "#9333EA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              <View style={styles.flashcardTagBack}>
                <Text style={styles.flashcardTagBackText}>
                  Flashcard {index + 1}
                </Text>
              </View>

              <Text style={styles.answerLabel}>ANSWER</Text>

              <Text style={styles.answerText}>{card.back}</Text>

              <Text style={styles.hintOnPurple}>Tap to show question</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* NAV */}
      <View style={styles.navRow}>
        <TouchableOpacity
          disabled={index === 0}
          onPress={prevCard}
          style={[styles.navButton, index === 0 && styles.disabledButton]}
        >
          <Text style={styles.navBtnText}>◀ Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={index === flashcards.length - 1}
          onPress={nextCard}
          style={[
            styles.navButton,
            index === flashcards.length - 1 && styles.disabledButton,
          ]}
        >
          <Text style={styles.navBtnText}>Next ▶</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ---------------------------------------------------------
   STYLES
--------------------------------------------------------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F2FF",
    alignItems: "center",
    paddingTop: 20,
  },

  topRow: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  title: { fontSize: 20, fontWeight: "700", color: "#4C4CFF" },
  resetText: { color: "#6C63FF", fontWeight: "600" },
  subtitle: { fontSize: 13, color: "#7D7D8C", marginBottom: 10, marginTop: 10 },

  counter: { fontSize: 12, color: "#8F8F9D", marginBottom: 6 },

  progressTrack: {
    width: "90%",
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 20,
  },
  progressFill: {
    height: 4,
    backgroundColor: "#8A4DFF",
    borderRadius: 3,
  },

  cardContainer: {
    width: SCREEN_WIDTH * 0.85,
    height: 260,
  },

cardFront: {
  width: "100%",
  height: "100%",
  borderRadius: 28,
  backgroundColor: "white",
  padding: 22,

  shadowColor: "#9CA3AF",
  shadowOpacity: 0.20,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 10,
},

cardBack: {
  width: "100%",
  height: "100%",
  borderRadius: 28,
  overflow: "hidden",  // IMPORTANT
},


  gradientCard: {
    flex: 1,
    borderRadius: 28,
    padding: 22,
  },

  /* FRONT TAG */
  flashcardTagFront: {
    alignSelf: "flex-start",
    backgroundColor: "#E0E7FF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },

  flashcardTagFrontText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },

  /* BACK TAG */
  flashcardTagBack: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },

  flashcardTagBackText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },

  smallLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 6,
  },

  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 30,
  },

  answerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E4E6FF",
    marginTop: 6,
    marginBottom: 6,
  },

  answerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 24,
  },

  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: "auto",
  },

  hintOnPurple: {
    fontSize: 12,
    color: "#E4E6FF",
    textAlign: "center",
    marginTop: "auto",
  },

  navRow: {
    flexDirection: "row",
    width: "80%",
    justifyContent: "space-between",
    marginTop: 20,
  },

  navButton: {
    backgroundColor: "#4e39f4",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },

  disabledButton: {
    backgroundColor: "#D1D1E6",
  },

  navBtnText: {
    color: "white",
    fontWeight: "600",
  },
});
