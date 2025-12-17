<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/45739268-fe40-41e2-a2b9-3f336ff8ab40" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/72828712-f932-4951-860e-778af0296c6a" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/07b163e1-2717-49e5-af47-241520da963f" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/335dedec-ec5c-4b47-bca0-e3ac7a30ef10" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/c6063c2e-91f7-4739-9e8e-82e9f22fb5c0" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/d63286df-589e-4473-84fb-de19f48653aa" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/7c6cdf73-c351-462e-8497-67ec219dabf9" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/2eedf662-8c55-43bd-9f96-664236126c86" />

<img width="540" height="1207" alt="Image" src="https://github.com/user-attachments/assets/e3098fed-16c4-4df9-9dc7-bc6d08dfa435" />

https://github.com/user-attachments/assets/34d7b1e5-a192-44b5-b5ed-18a2d0f12150

# StudyAI — PDF to Smart Study Pack

An intelligent web app that extracts text from PDFs, summarizes key concepts, and generates flashcards, quizzes, and recommended educational videos.

## 🚀 Features
- 📄 Upload any PDF (supports scanned and digital text)
- 🧩 Auto OCR with Tesseract for scanned documents
- ✍️ Gemini AI–powered summary, key points & flashcards
- 🧠 Auto–generated quiz questions
- 🎥 Recommended YouTube videos based on key topics
- 🌐 Built with Flask (backend) + React (frontend)

## 🛠️ Tech Stack
**Frontend:** React + Vite  
**Backend:** Flask + PyMuPDF + Tesseract OCR  
**AI:** Google Gemini API  
**Video Source:** YouTube Data API (optional)  
## Usage

-Upload a PDF

-Wait for AI summary & flashcards

-View Recommended Videos in the final tab
## ⚙️ Setup

### 1. Clone & install
```bash
git clone https://github.com/yourname/studyai.git
cd studyai
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install -r requirements.txt
export GEMINI_API_KEY="your_gemini_key"
export YOUTUBE_API_KEY="your_youtube_key"
python app.py
```

### 3. Frontend setup
```bash
cd ../frontend
npm install
npm run dev
```

Then open 👉 [http://localhost:5173](http://localhost:5173)


