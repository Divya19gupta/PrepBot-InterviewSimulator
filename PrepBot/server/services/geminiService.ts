import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Use the correct model for AI Studio (not Vertex AI)
const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

export async function generateInterviewQuestions(): Promise<string[]> {
  const prompt = `Generate exactly 5 realistic related to software engineer / developer role, job interview questions suitable for 18 – 23 year olds applying for their first job. 

Only return the questions in plain text bullet points (e.g., "- Question 1", "- Question 2") with no additional explanation or formatting. 

Do not include introductions, commentary, or what the interviewer is looking for — just the questions`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const response = await result.response;
    const text = response.text();

    // console.log("✅ Gemini response text:", text);
    return text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 5);
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    throw new Error("Gemini API call failed");
  }
}

export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<{ feedback: string }> {
  const prompt = `
You are an interview coach. A candidate answered the following interview question:

Question: "${question}"
Answer: "${answer}"

Evaluate the response for:
- Clarity
- Relevance
- Confidence
- Communication skills

Provide specific feedback and improvement tips in conversational tone, as if you were coaching the candidate directly and keep only the feedback section concise.
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const response = await result.response;
    return { feedback: response.text() };
  } catch (error) {
    console.error("❌ Gemini Evaluation Error:", error);
    throw new Error("Failed to evaluate answer");
  }
}
