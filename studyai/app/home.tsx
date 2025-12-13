// app/home.tsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import {
  Upload,
  FileText as FileTextIcon,
  X,
  UserCircle,
  TrendingUp,
  ChevronRight,
  FileText as SummaryIcon,
  CreditCard,
  ClipboardCheck,
  ListChecks,
  GitBranch,
  MessageCircleQuestion,
  Video as VideoIcon,
  BookOpenCheck,
  LayoutDashboard,
} from "lucide-react-native";

import { supabase } from "../lib/supabaseClient";
import {
  useStudy,
  BASE_URL,
  STUDY_URL,
  REVISION_QUIZ_URL,
} from "../StudyContext";

/* --------------------------------------------------------
   TIME AGO FORMAT
--------------------------------------------------------- */
const timeAgo = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/* ICON COLORS */
const ICON_COLOR_MAP = {
  summary: "#DBEAFE",
  flashcards: "#EDE9FE",
  quiz: "#DCFCE7",
  "revision-quiz": "#FFE4E6",
  mindmap: "#FFE4E6",
  questions: "#FCE7F3",
  videos: "#FEE2E2",
  "mock-test": "#DCFCE7",
  dashboard: "#DBEAFE",
};

/* QUICK ACTION BUTTON */
const QuickAction = ({ icon: Icon, label, featureKey, onPress }) => {
  const bg = ICON_COLOR_MAP[featureKey];

  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
        <Icon size={22} color="#111827" />
      </View>
      <Text style={styles.quickActionText}>{label}</Text>
    </TouchableOpacity>
  );
};

/* --------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
export default function HomeScreen() {
  const router = useRouter();

  const {
    setUser,
    user,
    fileInfo,
    setFileInfo,
    uploading,
    setUploading,
    apiData,
    setApiData,
  } = useStudy();

  const [name, setName] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_attempts: 0,
    total_materials: 0,
    avg_accuracy: 0,
  });

  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);

  /* --------------------------------------------------------
     LOAD REVISION QUIZ
  --------------------------------------------------------- */
  const loadRevisionQuiz = async () => {
    if (!user?.id) {
      return Alert.alert(
        "Not logged in",
        "Please log in to use Revision Quiz."
      );
    }

    if (!apiData?.material_id) {
      return Alert.alert("No study material", "Upload a PDF first.");
    }

    try {
      const resp = await fetch(REVISION_QUIZ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          material_id: apiData.material_id,
          limit: 10,
        }),
      });

      const json = await resp.json();
      if (!resp.ok || json.error) {
        return Alert.alert(
          "Error",
          json.error || "Could not load revision quiz."
        );
      }

      if (!json.revision_questions?.length) {
        return Alert.alert(
          "Nothing to revise",
          "All questions solved or no quiz attempts."
        );
      }

      setApiData({
        ...(apiData as any),
        revision_questions: json.revision_questions,
        quiz_stats: json.stats ?? apiData.quiz_stats,
      });

      router.push("/revision-quiz");
    } catch (e) {
      Alert.alert("Error", "Failed to load revision quiz.");
    }
  };

  /* --------------------------------------------------------
     LOAD USER + DASHBOARD DATA
  --------------------------------------------------------- */
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (!authUser) return;
      setUser(authUser);

      /* Load profile name */
      let displayName = null;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", authUser.id)
        .single();

      if (profileRow?.name) {
        displayName = profileRow.name;
      } else if (authUser.user_metadata?.name) {
        displayName = authUser.user_metadata.name;
      } else {
        displayName = authUser.email?.split("@")[0] ?? "User";
      }

      setName(displayName);

      /* Load global stats */
      const statsResp = await fetch(
        `${BASE_URL}/api/dashboard/overview/${authUser.id}`
      );
      const statsJson = await statsResp.json();

      setStats({
        total_attempts: statsJson.global_stats?.total_attempts ?? 0,
        total_materials: statsJson.global_stats?.total_materials ?? 0,
        avg_accuracy: statsJson.global_stats?.avg_accuracy ?? 0,
      });

      /* Recent attempts */
      const dash = await fetch(`${BASE_URL}/api/dashboard/user/${authUser.id}`);
      const dashJson = await dash.json();

      const reversed = [...dashJson.attempts].reverse();
      const uniq: any[] = [];
      const seen = new Set();

      for (const a of reversed) {
        if (!seen.has(a.material_id)) {
          seen.add(a.material_id);
          uniq.push(a);
        }
        if (uniq.length === 3) break;
      }

      const ids = uniq.map((a) => a.material_id);

      const { data: materials } = await supabase
        .from("study_materials")
        .select("id, source_name")
        .in("id", ids);

      setRecentAttempts(
        uniq.map((a) => {
          const match = materials?.find((m) => m.id === a.material_id);
          return { ...a, file_name: match?.source_name ?? "Unknown PDF" };
        })
      );
    };

    loadData();
  }, []);

  /* --------------------------------------------------------
     PICK PDF FILE
  --------------------------------------------------------- */
  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });

    if (res.canceled) return;

    const asset = res.assets?.[0];
    setFileInfo({ uri: asset.uri, name: asset.name });
    setApiData(null);
  };

  /* --------------------------------------------------------
     UPLOAD PDF → BACKEND
  --------------------------------------------------------- */
  const upload = async () => {
    if (!fileInfo) return;

    setUploading(true);
    try {
      const formData = new FormData();

      formData.append("file", {
        uri: fileInfo.uri,
        name: fileInfo.name,
        type: "application/pdf",
      } as any);

      formData.append("user_id", user?.id);

      const resp = await fetch(STUDY_URL, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Upload failed");

      setApiData(json);
      router.push("/summary");
    } catch (e) {
      Alert.alert("Upload Error", String(e));
    } finally {
      setUploading(false);
    }
  };

  /* --------------------------------------------------------
     UI
  --------------------------------------------------------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <Text style={styles.appTitle}>StudyAI</Text>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={styles.profileButton}
          >
            <UserCircle size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* HEADER CARD */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Hey, {name ?? "User"} 👋</Text>
          <Text style={styles.statsSubtitle}>Ready to boost your learning?</Text>

          <View style={{ flexDirection: "row", marginTop: 16 }}>
            <View style={styles.statsItem}>
              <Text style={styles.statsValue}>{stats.total_attempts}</Text>
              <Text style={styles.statsLabel}>Quizzes</Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsValue}>{stats.avg_accuracy}%</Text>
              <Text style={styles.statsLabel}>Accuracy</Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsValue}>{stats.total_materials}</Text>
              <Text style={styles.statsLabel}>Documents</Text>
            </View>
          </View>
        </View>

        {/* UPLOAD CARD */}
        <View style={styles.card}>
          {!fileInfo ? (
            <TouchableOpacity style={styles.uploadZone} onPress={pickFile}>
              <View style={styles.uploadIconBox}>
                <Upload size={30} color="white" />
              </View>
              <Text style={styles.uploadLabel}>Tap to choose or drag & drop</Text>
              <Text style={styles.uploadHint}>PDF only</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.filePreview}>
                <FileTextIcon size={20} color="#16A34A" />
                <Text style={styles.fileName}>{fileInfo.name}</Text>
                <TouchableOpacity onPress={() => setFileInfo(null)}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.generateButtonWide}
                onPress={upload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.generateBtnText}>
                    Generate Study Materials
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* DASHBOARD BUTTON */}
        <TouchableOpacity onPress={() => router.push("/user-dashboard")} style={{ marginTop: 20 }}>
          <LinearGradient
            colors={["#4F46E5", "#9333EA", "#EC4899", "#F43F5E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dashboardGradient}
          >
            <TrendingUp size={22} color="white" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.dashboardTitle}>User Dashboard</Text>
              <Text style={styles.dashboardSub}>View full stats & insights</Text>
            </View>
            <ChevronRight size={22} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* QUICK ACTIONS */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          <QuickAction icon={SummaryIcon} label="Summary" featureKey="summary" onPress={() => router.push("/summary")} />
          <QuickAction icon={CreditCard} label="Flashcards" featureKey="flashcards" onPress={() => router.push("/flashcards")} />
          <QuickAction icon={ClipboardCheck} label="Quiz" featureKey="quiz" onPress={() => router.push("/quiz")} />
          <QuickAction icon={ListChecks} label="Revision" featureKey="revision-quiz" onPress={loadRevisionQuiz} />
          <QuickAction icon={GitBranch} label="Mind Map" featureKey="mindmap" onPress={() => router.push("/mindmap")} />
          <QuickAction icon={MessageCircleQuestion} label="Questions" featureKey="questions" onPress={() => router.push("/ask")} />
          <QuickAction icon={VideoIcon} label="Videos" featureKey="videos" onPress={() => router.push("/videos")} />
          <QuickAction icon={BookOpenCheck} label="Mock Test" featureKey="mock-test" onPress={() => router.push("/mock-test")} />
          <QuickAction icon={LayoutDashboard} label="Dashboard" featureKey="dashboard" onPress={() => router.push("/dashboard")} />
        </View>

        {/* RECENT ACTIVITY */}
        {recentAttempts.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push("/user-dashboard")}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentAttempts.map((a, i) => (
              <View key={i} style={styles.recentCard}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.recentIconBox}>
                    <FileTextIcon size={18} color="#2563EB" />
                  </View>

                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.recentPdf}>{a.file_name}</Text>
                    <Text style={styles.recentSub}>Quiz Completed</Text>
                  </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.recentPercent}>{a.accuracy}%</Text>
                  <Text style={styles.recentTime}>{timeAgo(a.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* --------------------------------------------------------
   STYLES
--------------------------------------------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f1ff" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingBottom: 12,
  },
  appTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  statsCard: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  statsSubtitle: { color: "#E5E7EB", marginTop: 4 },

  statsItem: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    padding: 10,
    flex: 1,
    marginRight: 10,
  },
  statsValue: { color: "white", fontWeight: "700", fontSize: 16 },
  statsLabel: { color: "#E5E7EB", fontSize: 12 },

  /* Upload */
  card: {
    backgroundColor: "#f8f9fb",
    padding: 20,
    borderRadius: 24,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginBottom: 16,
  },

  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 24,
    paddingVertical: 30,
    alignItems: "center",
  },
  uploadIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  uploadLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  uploadHint: { fontSize: 12, color: "#6B7280", marginTop: 4 },

  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  fileName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },

  generateButtonWide: {
    backgroundColor: "#2563EB",
    borderRadius: 32,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateBtnText: { color: "white", fontSize: 15, fontWeight: "700" },

  /* Dashboard CTA */
  dashboardGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dashboardTitle: { color: "white", fontSize: 15, fontWeight: "700" },
  dashboardSub: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  /* Quick Actions */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickAction: {
    width: "30%",
    backgroundColor: "white",
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionText: { fontSize: 12, fontWeight: "600", color: "#111827" },

  /* Recent activity */
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  seeAll: { color: "#2563EB", fontSize: 12, fontWeight: "600" },

  recentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  recentPdf: { fontSize: 14, fontWeight: "600", color: "#111827" },
  recentSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  recentPercent: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
  recentTime: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  recentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
});

