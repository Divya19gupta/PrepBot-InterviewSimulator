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
- Evaluate the answer strictly based ONLY on the exact transcript.
- Treat all transcription as fully accurate.
- Penalize:
    → unclear phrasing
    → grammatical issues
    → incomplete structure
- DO NOT infer or assume intended meaning.
- If wording is unclear, treat it as poor communication.
- Focus strongly on clarity, precision, and structure.
- Strongly evaluate language quality (clarity, fluency, structure)
`;

  // 🟢 MODE B → UNCERTAINTY + INTENT AWARE
  const modeB = `
IMPORTANT:
- First, assess whether parts of the answer may be unreliable due to transcription uncertainty.
- Ignore language issues unless they prevent understanding of core idea
- If confidence is below 95% OR lowConfidenceRatio > 0.1:
    → DO NOT penalize unclear phrasing
    → DO NOT criticize grammar or wording
    → Focus ONLY on what can be reasonably inferred
    → Explicitly acknowledge uncertainty when judging

- You MUST prioritize meaning over wording.

- If the answer is partially unclear:
    → Assume the candidate may have expressed it correctly but transcription failed
    → Evaluate based on likely intent

- Only criticize content if the core idea itself is missing (not language).

- Use cautious reasoning internally, not just softer tone.
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