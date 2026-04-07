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
  answer: string,
  prototype: "A" | "B" = "A",
  confidence?: number,
  lowConfidenceRatio?: number
): Promise<{ feedback: string }> {


const uncertaintyContext =
    prototype === "B" && confidence !== undefined && lowConfidenceRatio !== undefined
      ? `
  TRANSCRIPTION CONTEXT:
  - Average confidence: ${(confidence * 100).toFixed(0)}%
  - Uncertain word ratio: ${(lowConfidenceRatio * 100).toFixed(0)}%

  If confidence is not high or uncertain ratio is noticeable:
  - Be cautious in judging unclear or incomplete parts
  - Do not assume the user performed poorly solely based on phrasing
  `
      : "";

  const basePrompt = `
  You are an AI interview coach evaluating a candidate’s answer.

  Write natural, human-like feedback similar to real interview preparation tools.

  STRICT RULES:
  - No headings or bullet points
  - No mentioning evaluation criteria explicitly
  - No mentioning frameworks
  - Keep it concise (4–6 sentences)
  - Do not repeat the question
  `;

  // 🔴 MODE A → DEFAULT INDUSTRY BEHAVIOR
  const modeA = `
  IMPORTANT:
  - Evaluate the answer exactly as written.
  - Focus on clarity, coherence, and structure of the response.
  - If parts are difficult to follow, point that out clearly.
  - Do NOT reinterpret or fill in missing meaning.
  - Base your feedback only on what is explicitly stated.
  `;

  // 🟢 MODE B → UNCERTAINTY + INTENT AWARE
  const modeB = `
  IMPORTANT:
  - Focus on understanding the intended meaning behind the answer rather than exact wording.
  - If phrasing is unclear or slightly incorrect, try to infer what the user likely meant.
  - Do NOT penalize minor grammatical issues if the core idea is understandable.
  - If parts seem confusing, assume they may be due to transcription or expression issues.
  - Use slightly cautious language such as "it seems like" or "it sounds like".
  - Prioritize the idea and intent over surface-level fluency.
  - If transcription confidence is low, be cautious in judging missing or unclear parts.
  `;

  const prompt = `
  ${basePrompt}

  ${prototype === "A" ? modeA : modeB}

  ${uncertaintyContext}

  Adapt based on answer quality:
  - Very short/unclear → explain what is missing
  - Average → suggest improvements
  - Strong → reinforce and refine

  Question:
  ${question}

  User Answer:
  ${answer}

  Feedback:
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise interview evaluator." },
        { role: "user", content: prompt },
      ],
    });

    return {
      feedback: response.choices[0].message.content || "",
    };

  } catch (error) {
    console.error("❌ OpenAI Evaluation Error:", error);

    return {
      feedback: "⚠️ Feedback could not be generated. Please try again.",
    };
  }
}