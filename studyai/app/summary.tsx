import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
} from "react-native";
import { useStudy } from "../StudyContext";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

function CollapsibleCard({ header, children }) {
  const [open, setOpen] = useState(true);

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      {/* HEADER */}
      <Pressable onPress={() => setOpen((o) => !o)}>{header(open)}</Pressable>

      {/* CONTENT */}
      {open && (
        <View style={{ padding: 16, paddingTop: 0 }}>{children}</View>
      )}
    </View>
  );
}

// ---- SPECIAL SUMMARY HEADER ----
function SummaryHeader(open: boolean) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        <LinearGradient
          colors={["#8B5CF6", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 24, color: "white" }}>📚</Text>
        </LinearGradient>
      </View>

      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        Summary
      </Text>

      <MaterialIcons
        name={open ? "expand-less" : "expand-more"}
        size={24}
        color="#4B5563"
        style={{ marginLeft: "auto" }}
      />
    </View>
  );
}

// ---- KEY POINTS HEADER WITH ICON ----
function KeyPointsHeader(open: boolean) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
      }}
    >
      {/* Gradient square - same as Summary */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        <LinearGradient
          colors={["#8B5CF6", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={24}
            color="white"
          />
        </LinearGradient>
      </View>

      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        Key Points
      </Text>

      <MaterialIcons
        name={open ? "expand-less" : "expand-more"}
        size={24}
        color="#4B5563"
        style={{ marginLeft: "auto" }}
      />
    </View>
  );
}

export default function SummaryScreen() {
  const { apiData } = useStudy();

  const summary =
    apiData?.summary ?? apiData?.summaryText ?? apiData?.data?.summary ?? "";

  const key_topics =
    apiData?.key_topics ??
    apiData?.topics ??
    apiData?.data?.topics ??
    [];

  const key_points =
    apiData?.key_points ??
    apiData?.points ??
    apiData?.data?.points ??
    [];

  const chipColors = [
    "#A855F7",
    "#3B82F6",
    "#22C55E",
    "#F97316",
    "#EC4899",
    "#6366F1",
    "#14B8A6",
  ];

  const pointColors = [
    ["#E9D5FF", "#E5DEFF"],
    ["#DBEAFE", "#D8EEFF"],
    ["#DCFCE7", "#D3F9E7"],
    ["#FEEDE2", "#FFE8D9"],
    ["#FFE4E6", "#FFDDE1"],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>

        {/* SUMMARY */}
        {summary ? (
          <CollapsibleCard header={(open) => SummaryHeader(open)}>
            <Text style={{ color: "#374151", lineHeight: 20 }}>{summary}</Text>
          </CollapsibleCard>
        ) : null}

        {/* KEY TOPICS */}
<CollapsibleCard
  header={(open) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
      }}
    >
      {/* Gradient Icon */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        <LinearGradient
          colors={["#8B5CF6", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons
            name="tag-outline"
            size={24}
            color="white"
          />
        </LinearGradient>
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        Key Topics
      </Text>

      {/* Expand arrow */}
      <MaterialIcons
        name={open ? "expand-less" : "expand-more"}
        size={24}
        color="#4B5563"
        style={{ marginLeft: "auto" }}
      />
    </View>
  )}
>
  {/* CONTENT */}
  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
    {key_topics.map((topic, index) => {
      return (
        <View
          key={topic}
          style={{
            backgroundColor: chipColors[index % chipColors.length],
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            marginRight: 8,
            marginBottom: 8,
            elevation: 2,
          }}
        >
          <Text style={{ color: "white" }}>{topic}</Text>
        </View>
      );
    })}
  </View>
</CollapsibleCard>


        {/* KEY POINTS */}
        {key_points.length > 0 && (
          <CollapsibleCard header={(open) => KeyPointsHeader(open)}>
            {key_points.map((point, index) => {
              const gradient = pointColors[index % pointColors.length];

              return (
                <View
                  key={index}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 20,
                    padding: 14,
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      marginRight: 14,
                    }}
                  />

                  <Text style={{ color: "#374151", lineHeight: 20, flex: 1 }}>
                    {point}
                  </Text>
                </View>
              );
            })}
          </CollapsibleCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
