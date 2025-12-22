import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutChartProps {
  size: number;
  correct: number;
  wrong: number;
  skipped: number;
}

export function DonutChart({
  size,
  correct,
  wrong,
  skipped,
}: DonutChartProps) {
  const total = Math.max(correct + wrong + skipped, 1);
  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const correctAnim = useRef(new Animated.Value(0)).current;
  const wrongAnim = useRef(new Animated.Value(0)).current;
  const skippedAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    correctAnim.setValue(0);
    wrongAnim.setValue(0);
    skippedAnim.setValue(0);

    Animated.sequence([
      Animated.timing(correctAnim, {
        toValue: correct / total,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(wrongAnim, {
        toValue: wrong / total,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(skippedAnim, {
        toValue: skipped / total,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [correct, wrong, skipped]);

  const correctDash = Animated.multiply(correctAnim, circumference);
  const wrongDash = Animated.multiply(wrongAnim, circumference);
  const skippedDash = Animated.multiply(skippedAnim, circumference);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Correct */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#22C55E"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={correctDash.interpolate({
              inputRange: [0, circumference],
              outputRange: [`0, ${circumference}`, `${circumference}, ${circumference}`],
            })}
            strokeLinecap="round"
          />

          {/* Wrong */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F97373"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={wrongDash.interpolate({
              inputRange: [0, circumference],
              outputRange: [`0, ${circumference}`, `${circumference}, ${circumference}`],
            })}
            strokeDashoffset={Animated.multiply(correctDash, -1)}
            strokeLinecap="round"
          />

          {/* Skipped */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#FBBF24"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={skippedDash.interpolate({
              inputRange: [0, circumference],
              outputRange: [`0, ${circumference}`, `${circumference}, ${circumference}`],
            })}
            strokeDashoffset={Animated.multiply(
              Animated.add(correctDash, wrongDash),
              -1
            )}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center text */}
      <View
        style={{
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
          {correct} / {total}
        </Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
          Correct
        </Text>
      </View>
    </View>
  );
}
