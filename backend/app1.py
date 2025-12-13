#!/usr/bin/env python3
"""
Flask backend — PDF → Summary, Flashcards, Quiz, Ask Q&A, Mindmap (Graphviz),
Video Recommendations, Mock Test

This version uses ONLY a local LLM (Ollama → deepseek-r1:8b).
Gemini has been fully removed.

- Summaries, flashcards, quiz, Q&A, mock test: Local LLM
- Video recommendations: YouTube Data API
- Mindmap: Graphviz → PNG (base64)
- Supabase:
    - study_materials: stores per-user materials + quiz_stats
    - quiz_performance: per-quiz summary rows
"""

from __future__ import annotations

import base64
import io
import json
import os
import random
import re
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request
from flask_cors import CORS
from PIL import Image
import fitz  # PyMuPDF
import pytesseract
import requests

# ----------------------- Supabase -----------------------
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("✅ Supabase client initialized")
else:
    print("⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. DB features disabled.")

# Graphviz (optional)
try:
    import graphviz
except ImportError:
    graphviz = None

# -------------------------------------------------------------------
# Local LLM (Ollama → deepseek-r1:8b)
# -------------------------------------------------------------------

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "deepseek-r1:8b"

def call_llm(prompt: str) -> str:
    """
    Send a single prompt to the local LLM (DeepSeek-R1:8b via Ollama).
    Always uses non-streaming responses.
    """

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=600)
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "")
    except Exception as e:
        print("❌ Local LLM error:", e)
        return ""

# -------------------------------------------------------------------
# FLASK
# -------------------------------------------------------------------
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config["MAX_CONTENT_LENGTH"] = 140 * 1024 * 1024  # 140 MB

DEFAULT_DPI = 300
DEFAULT_MIN_CHAR_THRESHOLD = 40
LLM_TRIM_LIMIT = 120_000

# -------------------------------------------------------------------
# PDF extraction
# -------------------------------------------------------------------
def _ocr_page(page: fitz.Page, dpi: int = DEFAULT_DPI, lang: str = "eng") -> str:
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(img, lang=lang).strip()


def extract_text(pdf_path: str, lang: str = "eng") -> str:
    """Hybrid text extraction: embedded text first, fallback to Tesseract OCR."""
    doc = fitz.open(pdf_path)
    pages: List[str] = []
    for page in doc:
        txt = page.get_text("text").strip()
        if len(txt) < DEFAULT_MIN_CHAR_THRESHOLD:
            txt = _ocr_page(page, dpi=DEFAULT_DPI, lang=lang)
        pages.append(txt)
    doc.close()
    return "\n\n".join(pages)


# -------------------------------------------------------------------
# JSON helper
# -------------------------------------------------------------------
def trim(text: str, limit: int = LLM_TRIM_LIMIT) -> str:
    if len(text) <= limit:
        return text
    return text[: limit // 2] + "\n\n...[truncated]...\n\n" + text[-limit // 2 :]


def robust_json(s: str):
    s = (s or "").strip()
    s = re.sub(r"^```(?:json)?\s*", "", s)
    s = re.sub(r"\s*```$", "", s)
    m = re.search(r"\{.*\}", s, flags=re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None
# -------------------------------------------------------------------
# Study Material Generator (summary, topics, points, flashcards, quiz)
# -------------------------------------------------------------------
def generate_study_material(text: str, topic: Optional[str]) -> dict:
    """
    Uses the LOCAL DeepSeek-R1:8b model via Ollama.
    Produces:
    - summary
    - key_topics
    - key_points
    - flashcards
    - quiz
    """

    prompt = f"""
You are a teaching assistant. Produce STRICT JSON only (no commentary, no markdown).

JSON schema:
{{
  "summary": "string",
  "key_topics": ["string"],
  "key_points": ["string"],
  "flashcards": [
    {{"front": "string", "back": "string"}}
  ],
  "quiz": [
    {{
      "question": "string",
      "options": ["string"],
      "answer": "string",
      "explanation": "string"
    }}
  ]
}}

Rules:
- key_topics: 8–12 short, distinct topics.
- key_points: 10–20 concise bullets.
- flashcards: 25–40.
- quiz: 20–30 questions, each 3–5 options, one correct.
- NO duplicates, NO empty values.
- Respond ONLY with JSON. No prose.

Topic hint: {topic or "none"}

DOCUMENT:
{trim(text)}
"""

    llm_output = call_llm(prompt)
    parsed = robust_json(llm_output)

    if not parsed:
        print("⚠️ LLM returned invalid JSON. Output was:\n", llm_output)
        return {
            "summary": "",
            "key_topics": [],
            "key_points": [],
            "flashcards": [],
            "quiz": [],
            "error": "LLM JSON parsing failed"
        }

    return parsed


# -------------------------------------------------------------------
# YouTube Recommendations (unchanged)
# -------------------------------------------------------------------
YOUTUBE_API_URL_SEARCH = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_API_URL_VIDEOS = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

def parse_iso8601_duration(duration: Optional[str]) -> int:
    if not duration:
        return 0
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not m:
        return 0
    hours = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    seconds = int(m.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def fetch_youtube_videos(query: str, max_results: int = 6, api_key: Optional[str] = None) -> List[Dict]:
    if not api_key:
        return []
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": api_key,
        "relevanceLanguage": "en",
    }
    r = requests.get(YOUTUBE_API_URL_SEARCH, params=params, timeout=15)
    r.raise_for_status()
    items = r.json().get("items", [])

    if not items:
        return []

    video_ids = ",".join(it["id"]["videoId"] for it in items if "videoId" in it.get("id", {}))
    if not video_ids:
        return []

    vparams = {"part": "contentDetails,statistics", "id": video_ids, "key": api_key}
    vr = requests.get(YOUTUBE_API_URL_VIDEOS, params=vparams, timeout=15)
    vr.raise_for_status()
    videos_meta = {v["id"]: v for v in vr.json().get("items", [])}

    videos = []
    for item in items:
        vid = item["id"]["videoId"]
        snippet = item["snippet"]
        meta = videos_meta.get(vid, {})
        stats = meta.get("statistics", {})

        videos.append({
            "videoId": vid,
            "title": snippet.get("title"),
            "channelTitle": snippet.get("channelTitle"),
            "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"),
            "publishedAt": snippet.get("publishedAt"),
            "description": snippet.get("description"),
            "duration": meta.get("contentDetails", {}).get("duration"),
            "viewCount": stats.get("viewCount"),
            "likeCount": stats.get("likeCount"),
            "statistics": stats,
        })
    return videos
# -------------------------------------------------------------------
# Mindmap: Graphviz → PNG (base64)
# -------------------------------------------------------------------
def build_mindmap(summary: str, key_topics: List[str], key_points: List[str]) -> Dict[str, Any]:
    if graphviz is None:
        return {
            "error": "Graphviz not installed",
            "details": "Run: pip install graphviz & install system Graphviz (dot)"
        }

    root_title = (key_topics[0] if key_topics else summary.split("\n")[0]).strip() or "Mind Map"

    try:
        dot = graphviz.Digraph(comment=root_title, format="png")
        dot.attr(rankdir="LR")
        dot.graph_attr.update(dpi="300", size="12,7!", ratio="compress")

        dot.node("root", root_title, shape="box", style="filled",
                 fillcolor="#1D4ED8", fontcolor="white")

        topic_ids = []
        for i, topic in enumerate(key_topics):
            tid = f"t{i}"
            topic_ids.append(tid)
            dot.node(tid, topic, shape="box", style="filled", fillcolor="#BFDBFE")
            dot.edge("root", tid)

        for j, point in enumerate(key_points):
            pid = f"p{j}"
            dot.node(pid, point, shape="note", style="filled", fillcolor="#EFF6FF")
            parent = topic_ids[j % len(topic_ids)] if topic_ids else "root"
            dot.edge(parent, pid)

        png_bytes = dot.pipe(format="png")
        img = Image.open(io.BytesIO(png_bytes))
        width, height = img.size
        b64 = base64.b64encode(png_bytes).decode()

        structure = {
            "root": root_title,
            "topics": key_topics,
            "points_by_topic": {}
        }

        if key_topics and key_points:
            for i, t in enumerate(key_topics):
                structure["points_by_topic"][t] = []
            for i, p in enumerate(key_points):
                structure["points_by_topic"][key_topics[i % len(key_topics)]].append(p)

        return {
            "topic": root_title,
            "image_base64": b64,
            "mime": "image/png",
            "width": width,
            "height": height,
            "structure": structure,
        }

    except Exception as e:
        return {"error": "Mindmap generation failed", "details": str(e)}


# -------------------------------------------------------------------
# Mock Test Generator (using local DeepSeek-R1:8b)
# -------------------------------------------------------------------
def generate_mock_test(text: str, pattern: List[Dict[str, int]], topic: Optional[str] = None) -> dict:
    cleaned = []
    total_marks = 0
    total_questions = 0

    for p in pattern:
        try:
            m = int(p.get("marks", 0))
            c = int(p.get("count", 0))
        except:
            continue
        if m > 0 and c > 0:
            cleaned.append({"marks": m, "count": c})
            total_marks += m * c
            total_questions += c

    if not cleaned:
        return {"error": "Invalid pattern"}

    lines = [f"- {p['count']} questions of {p['marks']} marks each" for p in c]()
# -------------------------------------------------------------------
# ENDPOINT: /api/study_material
# -------------------------------------------------------------------
@app.post("/api/study_material")
def study_material():
    """
    Accepts PDF or text from:
      - multipart/form-data (file + optional text)
      - application/json (text)
      - application/json (base64 file)
      - Incorrect Content-Type but still parse JSON safely
    """

    # Try to extract user_id from ANY source
    user_id = (
        request.form.get("user_id")
        or (request.get_json(silent=True) or {}).get("user_id")
    )

    # STEP 1 — Try to read PDF file normally
    pdf_file = None
    try:
        pdf_file = request.files.get("file")
    except:
        pdf_file = None

    # STEP 2 — Try to read text from ANY source
    incoming_text = None
    data_json = request.get_json(silent=True) or {}

    # Priority order: form → json → fallback
    incoming_text = (
        (request.form.get("text") if request.form else None)
        or data_json.get("text")
        or None
    )

    topic = (
        (request.form.get("topic") if request.form else None)
        or data_json.get("topic")
        or ""
    )

    # SPECIAL FIX:
    # Expo sometimes sends empty form-data with no file → treat as missing
    if pdf_file and pdf_file.filename == "":
        pdf_file = None

    # If we received NEITHER file nor text, DO NOT 400 — return helpful message
    if not pdf_file and not incoming_text:
        return jsonify({
            "error": True,
            "message": "No PDF or text received. The backend now expects either:\n"
                       "1) multipart/form-data with file\n"
                       "2) JSON with { text: \"...\" }",
            "received_form": dict(request.form),
            "received_json": data_json,
            "received_files": list(request.files.keys())
        }), 200   # <— CHANGED from 400 to 200 so frontend does not break

    # Extract text (PDF or raw text)
    if pdf_file:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
            pdf_file.save(tmp.name)
            text = extract_text(tmp.name)
        source_type = "pdf"
        source_name = pdf_file.filename
    else:
        text = incoming_text or ""
        source_type = "text"
        source_name = None

    # Generate study materials using local LLM
    data = {}
    try:
        data = generate_study_material(text, topic)
    except Exception as e:
        print("❌ study_material generation failed:", e)
        data = {}

    summary = data.get("summary", "")
    key_topics = data.get("key_topics", [])
    key_points = data.get("key_points", [])
    flashcards = data.get("flashcards", [])
    quiz = data.get("quiz", [])
    material_id = None

    # Save to Supabase if enabled
    if supabase and user_id:
        try:
            payload = {
                "user_id": user_id,
                "topic": topic,
                "source_type": source_type,
                "source_name": source_name,
                "original_text": text,
                "summary": summary,
                "key_topics": key_topics,
                "key_points": key_points,
                "flashcards": flashcards,
                "quiz": quiz,
                "quiz_stats": {
                    "history": [],
                    "per_question": {},
                    "last_unsolved": [],
                },
            }
            resp = supabase.table("study_materials").insert(payload).execute()
            if resp.data:
                material_id = resp.data[0].get("id")
        except Exception as e:
            print("Supabase insert failed:", e)

    return jsonify({
        "material_id": material_id,
        "source_type": source_type,
        "source_name": source_name,
        "text": text,
        "summary": summary,
        "key_topics": key_topics,
        "key_points": key_points,
        "flashcards": flashcards,
        "quiz": quiz,
        "raw_input_debug": {
            "form": dict(request.form),
            "json": data_json,
            "files": list(request.files.keys()),
        }
    })


# -------------------------------------------------------------------
# ENDPOINT: /api/recommend_videos
# (UNCHANGED except Gemini removed)
# -------------------------------------------------------------------
@app.post("/api/recommend_videos")
def recommend_videos():
    data = request.get_json(silent=True) or request.form or {}
    max_results = int(data.get("max_results") or 6)

    key_topics = data.get("key_topics")
    key_points = data.get("key_points")

    kp_list = []
    if isinstance(key_topics, list) and key_topics:
        kp_list = [str(k).strip() for k in key_topics]
    elif isinstance(key_points, list) and key_points:
        kp_list = [str(k).strip() for k in key_points]

    query_str = (data.get("query") or data.get("text") or "").strip()

    if not YOUTUBE_API_KEY:
        return jsonify({"videos": []})

    collected = []
    search_terms = []

    if kp_list:
        search_terms = kp_list[:6]
    elif query_str:
        search_terms = [query_str]

    for term in search_terms:
        try:
            vids = fetch_youtube_videos(term, max_results=6, api_key=YOUTUBE_API_KEY)
            collected.extend(vids)
        except Exception as e:
            print("YouTube error:", e)

    uniq = {}
    for v in collected:
        vid = v.get("videoId")
        if vid and vid not in uniq:
            uniq[vid] = v

    videos = list(uniq.values())[:max_results]
    return jsonify({"videos": videos})


# -------------------------------------------------------------------
# ENDPOINT: /api/ask_question (DeepSeek instead of Gemini)
# -------------------------------------------------------------------
@app.post("/api/ask_question")
def ask_question():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    question = (data.get("question") or "").strip()

    if not text or not question:
        return jsonify({"error": "Missing text or question"}), 400

    prompt = f"""
Answer the following question using ONLY the provided text.

Question:
{question}

TEXT:
{trim(text)}
"""

    answer = call_llm(prompt).strip()
    if not answer:
        answer = "No answer found."

    return jsonify({"answer": answer})
# -------------------------------------------------------------------
# ENDPOINT: /api/mindmap
# -------------------------------------------------------------------
@app.post("/api/mindmap")
def mindmap():
    data = request.get_json(silent=True) or {}
    summary = data.get("summary") or ""
    key_topics = data.get("key_topics") or []
    key_points = data.get("key_points") or []

    result = build_mindmap(summary, key_topics, key_points)
    return jsonify(result)


# -------------------------------------------------------------------
# ENDPOINT: /api/mock_test
# -------------------------------------------------------------------
@app.post("/api/mock_test")
def mock_test():
    data = request.get_json(silent=True) or {}

    raw_text = (data.get("text") or "").strip()
    topic = (data.get("topic") or "").strip() or None
    pattern_in = data.get("pattern") or []

    # If text empty → fallback to summary + key points
    if not raw_text:
        summary = data.get("summary") or ""
        kp = data.get("key_points") or []
        raw_text = summary + "\n\n" + "\n".join(f"- {p}" for p in kp)

    if not raw_text:
        return jsonify({"error": "No text provided"}), 400

    if not pattern_in:
        pattern_in = [
            {"marks": 10, "count": 3},
            {"marks": 5,  "count": 4},
            {"marks": 3,  "count": 10},
            {"marks": 2,  "count": 5},
            {"marks": 1,  "count": 10},
        ]

    cleaned = []
    for p in pattern_in:
        try:
            m = int(p.get("marks", 0))
            c = int(p.get("count", 0))
        except:
            continue
        if m > 0 and c > 0:
            cleaned.append({"marks": m, "count": c})

    if not cleaned:
        return jsonify({"error": "Invalid pattern"}), 400

    result = generate_mock_test(raw_text, cleaned, topic)
    return jsonify(result)


# -------------------------------------------------------------------
# ENDPOINT: /api/revision_quiz
# -------------------------------------------------------------------
@app.post("/api/revision_quiz")
def revision_quiz():
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    material_id = data.get("material_id")
    limit = int(data.get("limit", 10))

    if not user_id or not material_id:
        return jsonify({"error": "user_id and material_id required"}), 400

    try:
        sm_resp = (
            supabase.table("study_materials")
            .select("id, quiz, quiz_stats")
            .eq("id", material_id)
            .single()
            .execute()
        )
        sm = sm_resp.data
    except Exception as e:
        return jsonify({"error": "Database load failed", "details": str(e)}), 500

    if not sm:
        return jsonify({"error": "Material not found"}), 404

    quiz = sm.get("quiz") or []
    quiz_stats = sm.get("quiz_stats") or {}
    per_question = quiz_stats.get("per_question", {})

    revision_indices = []
    for idx_str, stats in per_question.items():
        try:
            idx = int(idx_str)
        except:
            continue
        attempts = stats.get("attempts", 0)
        correct = stats.get("correct", 0)
        accuracy = correct / attempts if attempts > 0 else 0

        needs_revision = (attempts >= 1 and correct == 0) or (attempts >= 3 and accuracy < 0.5)
        if needs_revision and 0 <= idx < len(quiz):
            revision_indices.append(idx)

    revision_indices = revision_indices[:limit]
    revision_questions = [quiz[i] for i in revision_indices]

    return jsonify({
        "revision_questions": revision_questions,
        "revision_indices": revision_indices,
        "stats": quiz_stats,
    })


# -------------------------------------------------------------------
# ENDPOINT: /api/quiz_performance
# -------------------------------------------------------------------
@app.post("/api/quiz_performance")
def quiz_performance():
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    data = request.get_json(force=True, silent=True) or {}

    user_id = data.get("user_id")
    material_id = data.get("material_id")
    answers = data.get("answers") or {}
    mode = (data.get("mode") or "normal").lower()
    raw_indices = data.get("question_indices")

    if not user_id or not material_id:
        return jsonify({"error": "user_id and material_id required"}), 400

    # Load material
    sm_resp = (
        supabase.table("study_materials")
        .select("id, quiz, quiz_stats")
        .eq("id", material_id)
        .single()
        .execute()
    )
    sm = sm_resp.data

    if not sm:
        return jsonify({"error": "Material not found"}), 404

    quiz = sm.get("quiz") or []
    quiz_stats = sm.get("quiz_stats") or {}

    n_quiz = len(quiz)

    # Determine which questions were attempted
    if mode == "revision" and isinstance(raw_indices, list) and raw_indices:
        attempt_indices = []
        for r in raw_indices:
            try:
                idx = int(r)
                if 0 <= idx < n_quiz:
                    attempt_indices.append(idx)
            except:
                pass
        # Remove duplicates
        seen = set()
        attempt_indices = [x for x in attempt_indices if not (x in seen or seen.add(x))]
    else:
        attempt_indices = list(range(n_quiz))

    if not attempt_indices:
        return jsonify({"error": "No valid question indices"}), 400

    # Evaluate attempt
    correct = wrong = skipped = 0
    details = []

    for idx in attempt_indices:
        q = quiz[idx]
        idx_str = str(idx)

        selected = answers.get(idx_str)
        correct_answer = q.get("answer")

        if selected is None:
            skipped += 1
            is_correct = False
        else:
            if selected == correct_answer:
                correct += 1
                is_correct = True
            else:
                wrong += 1
                is_correct = False

        # Update per-question stats
        qstats = quiz_stats.get("per_question", {}).get(idx_str, {"correct": 0, "skipped": 0, "attempts": 0})
        qstats["attempts"] += 1
        if selected is None:
            qstats["skipped"] += 1
        elif is_correct:
            qstats["correct"] += 1

        quiz_stats.setdefault("per_question", {})[idx_str] = qstats

        details.append({
            "index": idx,
            "question": q["question"],
            "options": q.get("options"),
            "correct_answer": correct_answer,
            "selected_answer": selected,
            "is_correct": is_correct,
        })

    total_questions = len(attempt_indices)
    score = float(correct)
    accuracy = correct / total_questions if total_questions > 0 else 0

    # Update history
    history = quiz_stats.get("history", [])
    attempt_no = len(history) + 1
    item = {
        "mode": mode,
        "score": score,
        "correct": correct,
        "wrong": wrong,
        "skipped": skipped,
        "attempted": correct + wrong,
        "total_questions": total_questions,
        "accuracy": accuracy,
        "attempt_no": attempt_no,
        "created_at": datetime.utcnow().isoformat(),
    }
    history.append(item)

    # Rebuild last_unsolved
    last_unsolved = []
    for idx, q in enumerate(quiz):
        stats = quiz_stats["per_question"].get(str(idx), {})
        if stats.get("attempts", 0) > 0 and stats.get("correct", 0) == 0:
            last_unsolved.append({
                "index": idx,
                "question": q["question"],
                "options": q.get("options"),
                "correct_answer": q.get("answer"),
            })

    quiz_stats["history"] = history
    quiz_stats["last_unsolved"] = last_unsolved

    # Update Supabase
    supabase.table("study_materials").update({"quiz_stats": quiz_stats}).eq("id", material_id).execute()

    # Insert row into quiz_performance
    qp_row = {
        "user_id": user_id,
        "material_id": material_id,
        "correct_answers": correct,
        "wrong_answers": wrong,
        "skipped": skipped,
        "total_questions": total_questions,
        "score": score,
        "accuracy": accuracy,
        "attempt_no": attempt_no,
        "answers": answers,
        "details": details,
    }

    qp_resp = supabase.table("quiz_performance").insert(qp_row).execute()

    return jsonify({
        "ok": True,
        "attempt": item,
        "quiz_stats": quiz_stats,
        "quiz_performance_row": qp_resp.data,
    })
# -------------------------------------------------------------------
# DASHBOARD: Overview of all materials
# -------------------------------------------------------------------
@app.get("/api/dashboard/overview/<user_id>")
def dashboard_overview(user_id):
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        qp_resp = (
            supabase.table("quiz_performance")
            .select("material_id, accuracy, created_at")
            .eq("user_id", user_id)
            .execute()
        )
        qp_rows = qp_resp.data or []

        if not qp_rows:
            return jsonify({"materials": [], "global_stats": {}})

        materials_summary = {}

        for row in qp_rows:
            m_id = row["material_id"]
            if m_id not in materials_summary:
                materials_summary[m_id] = {
                    "material_id": m_id,
                    "total_attempts": 0,
                    "accuracies": [],
                    "last_attempt_at": row.get("created_at"),
                }

            m = materials_summary[m_id]
            m["total_attempts"] += 1
            m["accuracies"].append(float(row.get("accuracy", 0)))
            if row.get("created_at") and (
                m["last_attempt_at"] is None or row["created_at"] > m["last_attempt_at"]
            ):
                m["last_attempt_at"] = row["created_at"]

        materials = []
        all_acc = []

        for m in materials_summary.values():
            avg_acc = (
                sum(m["accuracies"]) / len(m["accuracies"])
                if m["accuracies"]
                else 0.0
            )
            materials.append({
                "material_id": m["material_id"],
                "total_attempts": m["total_attempts"],
                "avg_accuracy": round(avg_acc * 100, 2),
                "last_attempt_at": m["last_attempt_at"],
            })
            all_acc.append(avg_acc)

        global_stats = {
            "total_materials": len(materials),
            "total_attempts": len(qp_rows),
            "avg_accuracy": round((sum(all_acc) / len(all_acc)) * 100, 2)
            if all_acc else 0,
        }

        return jsonify({"materials": materials, "global_stats": global_stats})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------------------------
# DASHBOARD: Per-material breakdown
# -------------------------------------------------------------------
@app.get("/api/dashboard/material/<material_id>/<user_id>")
def dashboard_material(material_id, user_id):
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        # Load quiz performance for this material
        qp_resp = (
            supabase.table("quiz_performance")
            .select("*")
            .eq("material_id", material_id)
            .eq("user_id", user_id)
            .order("attempt_no", desc=False)
            .execute()
        )
        qp_rows = qp_resp.data or []

        sm_resp = (
            supabase.table("study_materials")
            .select("quiz_stats, topic, source_name")
            .eq("id", material_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        sm = sm_resp.data or {}

        stats = sm.get("quiz_stats", {}).get("per_question", {})
        last_unsolved = sm.get("quiz_stats", {}).get("last_unsolved", [])

        history = []
        for row in qp_rows:
            correct = row.get("correct_answers", 0)
            wrong = row.get("wrong_answers", 0)
            skipped = row.get("skipped", 0)
            total_q = correct + wrong  # skipped not counted

            acc = correct / total_q if total_q > 0 else 0
            history.append({
                "attempt_no": row.get("attempt_no"),
                "created_at": row.get("created_at"),
                "accuracy": round(acc * 100, 2),
                "correct": correct,
                "wrong": wrong,
                "skipped": skipped,
                "total_questions": total_q,
                "mode": row.get("mode", "quiz"),
            })

        return jsonify({
            "material_info": {
                "material_id": material_id,
                "topic": sm.get("topic"),
                "source_name": sm.get("source_name"),
            },
            "quiz_history": history,
            "per_question": stats,
            "last_unsolved": last_unsolved,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------------------------------------------------
# DASHBOARD: User-level analytics
# -------------------------------------------------------------------
@app.get("/api/dashboard/user/<user_id>")
def user_dashboard(user_id):
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    try:
        qp = (
            supabase.table("quiz_performance")
            .select("material_id, created_at, attempt_no, correct_answers, wrong_answers, skipped")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        rows = qp.data or []

        if not rows:
            return jsonify({
                "summary": {
                    "total_attempts": 0,
                    "distinct_materials": 0,
                    "overall_accuracy": 0.0,
                    "avg_score": 0.0,
                    "avg_accuracy": 0.0,
                    "best_score": 0.0,
                    "best_accuracy": 0.0,
                },
                "attempts": [],
                "by_date": [],
            })

        total_attempts = len(rows)
        material_ids = set()

        overall_correct = 0
        overall_total_q = 0

        sum_scores = 0
        sum_accuracy_frac = 0
        best_score = 0
        best_accuracy = 0

        attempts_out = []
        by_date = {}

        for row in rows:
            mid = row["material_id"]
            material_ids.add(mid)

            c = int(row.get("correct_answers", 0))
            w = int(row.get("wrong_answers", 0))
            s = int(row.get("skipped", 0))

            total_q = c + w
            score = float(c)
            acc = c / total_q if total_q > 0 else 0

            overall_correct += c
            overall_total_q += total_q

            sum_scores += score
            sum_accuracy_frac += acc
            best_score = max(best_score, score)
            best_accuracy = max(best_accuracy, acc)

            date_key = (row.get("created_at") or "")[:10]
            bd = by_date.setdefault(date_key, {"attempts": 0, "score": 0, "acc": 0})
            bd["attempts"] += 1
            bd["score"] += score
            bd["acc"] += acc

            attempts_out.append({
                "attempt_no": row.get("attempt_no"),
                "material_id": mid,
                "created_at": row.get("created_at"),
                "score": score,
                "total_questions": total_q,
                "accuracy": acc * 100,
                "correct": c,
                "wrong": w,
                "skipped": s,
            })

        overall_accuracy = (overall_correct / overall_total_q * 100) if overall_total_q else 0
        avg_score = sum_scores / total_attempts
        avg_accuracy = (sum_accuracy_frac / total_attempts * 100) if total_attempts else 0

        by_date_out = []
        for date_key, d in sorted(by_date.items()):
            by_date_out.append({
                "date": date_key,
                "attempts": d["attempts"],
                "avg_score": d["score"] / d["attempts"],
                "avg_accuracy": (d["acc"] / d["attempts"]) * 100,
            })

        summary = {
            "total_attempts": total_attempts,
            "distinct_materials": len(material_ids),
            "overall_accuracy": round(overall_accuracy, 1),
            "avg_score": round(avg_score, 2),
            "avg_accuracy": round(avg_accuracy, 2),
            "best_score": round(best_score, 2),
            "best_accuracy": round(best_accuracy * 100, 1),
        }

        return jsonify({
            "summary": summary,
            "attempts": attempts_out,
            "by_date": by_date_out,
        })

    except Exception as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500


# -------------------------------------------------------------------
# MAIN APPLICATION START
# -------------------------------------------------------------------
if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "0").lower() in ("1", "true", "yes", "on")

    print("\n==== FLASK ROUTES ====")
    for rule in app.url_map.iter_rules():
        print(rule.endpoint, rule.rule, list(rule.methods))
    print("=======================\n")

    print(f"🚀 Backend running on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
