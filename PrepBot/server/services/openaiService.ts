import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ✅ Generate Questions
export async function generateInterviewQuestions(): Promise<string[]> {
  const prompt = `
Generate exactly 5 unique and realistic interview questions for a software engineer / developer role,
suitable for 18–23 year olds applying for their first job.

Only return plain text bullet points like:
- Question 1
- Question 2

No explanations or extra text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You generate interview questions." },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0].message.content || "";

    return text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 5);

  } catch (error) {
    console.error("❌ OpenAI Question Error:", error);
    throw new Error("Failed to generate questions");
  }
}

// ✅ Evaluate Answer
export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<{ feedback: string }> {

 const prompt = `
You are an AI interview coach helping a candidate improve their answer.

Your goal is to give natural, human-like feedback — similar to real interview coaching tools.

Instructions:
- Be conversational and supportive, not robotic
- Do NOT use headings or bullet points
- Do NOT mention evaluation criteria like "clarity", "confidence", etc.
- Do NOT explicitly mention frameworks like STAR
- Keep the response concise (4–6 sentences max)
- If the answer is weak or unclear, gently explain what is missing
- Guide the user toward improving structure (situation, actions, results) WITHOUT naming it
- Give 1–2 practical suggestions they can apply immediately
- Avoid repeating the question

Adapt your tone based on the answer:
- If the answer is very short or unclear → point out missing detail
- If the answer is somewhat okay → suggest improvements
- If the answer is strong → reinforce and suggest refinement

Question:
${question}

User Answer:
${answer}

Feedback:
`;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000); // 15s

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful interview evaluator." },
        { role: "user", content: prompt },
      ],
    });

   clearTimeout(timeout);

  return {
    feedback: response.choices[0].message.content || "",
  };

  } catch (error) {
    clearTimeout(timeout);

  console.error("❌ OpenAI Evaluation Error:", error);

  // ✅ FALLBACK (VERY IMPORTANT)
  return {
    feedback: "⚠️ Feedback could not be generated due to network delay. Please try again.",
  };
  }
}