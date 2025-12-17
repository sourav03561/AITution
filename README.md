# StudyAI — PDF to Smart Study Pack

StudyAI is an intelligent web application that transforms PDFs into complete study materials. It extracts text from PDFs (including scanned documents), summarizes key concepts, and automatically generates flashcards, quizzes, and recommended educational videos.

---

## 🚀 Features

* 📄 Upload any PDF (supports both digital and scanned files)
* 🧩 Automatic OCR using **Tesseract** for scanned documents
* ✍️ **Gemini AI**–powered summaries and key concept extraction
* 🧠 Auto-generated flashcards and quiz questions
* 🎥 Recommended YouTube videos based on extracted topics
* 🌐 Full-stack web app with Flask (backend) and React (frontend)

---

## 🛠️ Tech Stack

**Frontend**

* React
* Vite

**Backend**

* Flask
* PyMuPDF
* Tesseract OCR

**AI & APIs**

* Google Gemini API
* YouTube Data API (optional, for video recommendations)

---

## 📸 Screenshots

Screenshots of the application UI are available in this repository and demonstrate:
<img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/45739268-fe40-41e2-a2b9-3f336ff8ab40" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/72828712-f932-4951-860e-778af0296c6a" /> <img width="540" height="620" alt="Image" src="https://github.com/user-attachments/assets/07b163e1-2717-49e5-af47-241520da963f" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/335dedec-ec5c-4b47-bca0-e3ac7a30ef10" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/c6063c2e-91f7-4739-9e8e-82e9f22fb5c0" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/d63286df-589e-4473-84fb-de19f48653aa" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/7c6cdf73-c351-462e-8497-67ec219dabf9" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/2eedf662-8c55-43bd-9f96-664236126c86" /> <img width="300" height="620" alt="Image" src="https://github.com/user-attachments/assets/e3098fed-16c4-4df9-9dc7-bc6d08dfa435" /> https://github.com/user-attachments/assets/34d7b1e5-a192-44b5-b5ed-18a2d0f12150
* PDF upload flow
* AI-generated summaries
* Flashcards and quizzes
* Recommended educational videos

---

## 📚 How It Works

1. Upload a PDF file
2. The backend extracts text (OCR is applied if needed)
3. Gemini AI processes the content to generate:

   * A concise summary
   * Key points
   * Flashcards
   * Quiz questions
4. Relevant YouTube videos are recommended based on extracted topics

---

## ⚙️ Setup & Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourname/studyai.git
cd studyai
```

---

### 2️⃣ Backend Setup (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set environment variables:

```bash
export GEMINI_API_KEY="your_gemini_api_key"
export YOUTUBE_API_KEY="your_youtube_api_key"  # optional
```

Run the backend server:

```bash
python app.py
```

The backend will start on **[http://localhost:5000](http://localhost:5000)** by default.

---

### 3️⃣ Frontend Setup (React + Vite)

```bash
cd ../frontend
npm install
npm run dev
```

Open the app in your browser:

👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 Usage

* Upload a PDF file
* Wait for AI processing to complete
* Navigate through tabs to view:

  * Summary
  * Flashcards
  * Quiz questions
  * Recommended videos

---

## 🔐 Environment Variables

| Variable          | Description                     |
| ----------------- | ------------------------------- |
| `GEMINI_API_KEY`  | Google Gemini API key           |
| `YOUTUBE_API_KEY` | YouTube Data API key (optional) |

---

## 📝 Future Improvements

* User authentication
* Downloadable study packs (PDF / Anki)
* Multiple quiz difficulty levels
* Support for more AI models

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit a pull request.

---

## ⭐ Acknowledgements

* Google Gemini
* Tesseract OCR
* PyMuPDF
* React & Flask communities
