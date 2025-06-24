# 🎙️ PrepBot: AI Interview Simulator

PrepBot is an AI-powered interview simulator that asks questions, records spoken answers, transcribes them using speech-to-text, and provides instant feedback using an LLM (e.g., Gemini or GPT).

---
## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/Divya19gupta/PrepBot.git
cd PrepBot
```

### 2. Add Your API Keys

Create a `.env` file in the `server/` folder with the following format:

```env
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```
### 3. Run the App

#### Backend

```bash
# In /server
npm i
npm run dev
```

#### Frontend

```bash
cd ../client
npm i
npm run dev
```
---

## 🛠 Features

- 🎤 Voice recording with `MediaRecorder`
- 🧠 Answer transcription (via Whisper API or whisper.cpp)
- 🤖 AI feedback scoring using Gemini or GPT
- 📊 Scored on clarity, relevance, structure, and confidence

---

## 📌 Notes

- Be sure to **not commit your `.env`** file or `node_modules/`.
- You can deploy this locally or host with services like Render, Railway, or Vercel.

---


