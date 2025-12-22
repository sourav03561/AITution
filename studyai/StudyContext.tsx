// app/StudyContext.tsx
import React, { createContext, useContext, useState } from "react";
import { Platform } from "react-native";

// Backend base URL
export const BASE_URL = Platform.select({
  web: "http://127.0.0.1:8000",
 // browser
  // 🔁 replace with your machine IP on Wi-Fi (e.g. 192.168.1.2)
  default: "http://192.168.1.5:8000", // device / simulator
});

export const STUDY_URL = `${BASE_URL}/api/study_material`;
export const ASK_URL = `${BASE_URL}/api/ask_question`;
export const RECOMMEND_URL = `${BASE_URL}/api/recommend_videos`;
export const MINDMAP_URL = `${BASE_URL}/api/mindmap`;
export const MOCK_TEST_URL = `${BASE_URL}/api/mock_test`;
export const QUIZ_PERFORMANCE_URL = `${BASE_URL}/api/quiz_performance`;
export const REVISION_QUIZ_URL = `${BASE_URL}/api/revision_quiz`;

// 🔹 (Optional) if you want to keep dashboard API here as well:
// export const QUIZ_DASHBOARD_URL = `${BASE_URL}/api/quiz_dashboard`;

type FileInfo = {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  fileObject?: any;
};

// match what your backend actually returns
type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
};

type QuizStatsHistoryItem = {
  score: number;
  wrong: number;
  correct: number;
  skipped: number;
  attempted: number;
  total_questions: number;
  attempt_no?: number;
  created_at: string;
};

type PerQuestionStats = {
  [index: string]: {
    correct: number;
    skipped: number;
    attempts: number;
  };
};

type LastUnsolvedItem = {
  index: number;
  question: string;
  options: string[];
  correct_answer: string;
  selected_answer: string | null;
};

type QuizStats = {
  history: QuizStatsHistoryItem[];
  per_question: PerQuestionStats;
  last_unsolved: LastUnsolvedItem[];
};

type RevisionQuestion = {
  index: number;            // original quiz index
  question: string;
  options: string[];
  correct_answer: string;
  selected_answer: string | null;
};

type ApiData = {
  summary?: string;
  key_topics?: string[];
  key_points?: string[];
  flashcards?: { front: string; back: string }[];
  quiz?: QuizQuestion[];
  text?: string;

  // 👇 these three are what you’re already using in home.tsx / quiz screens
  material_id?: string;
  quiz_stats?: QuizStats;
  revision_questions?: RevisionQuestion[];
};

type StudyContextType = {
  user: any | null;
  setUser: (u: any | null) => void;
  fileInfo: FileInfo | null;
  setFileInfo: (f: FileInfo | null) => void;
  uploading: boolean;
  setUploading: (b: boolean) => void;
  apiData: ApiData | null;
  setApiData: (d: ApiData | null) => void;
  videoResults: any[];
  setVideoResults: (v: any[]) => void;
  videoLoading: boolean;
  setVideoLoading: (b: boolean) => void;
  videoError: string | null;
  setVideoError: (s: string | null) => void;
};

const StudyContext = createContext<StudyContextType | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [apiData, setApiData] = useState<ApiData | null>(null);

  const [videoResults, setVideoResults] = useState<any[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  return (
    <StudyContext.Provider
      value={{
        user,
        setUser,
        fileInfo,
        setFileInfo,
        uploading,
        setUploading,
        apiData,
        setApiData,
        videoResults,
        setVideoResults,
        videoLoading,
        setVideoLoading,
        videoError,
        setVideoError,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used inside StudyProvider");
  return ctx;
}
