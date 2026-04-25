import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ==========================
// ✅ CORRECT FEEDBACK (A vs B)
// ==========================
export async function evaluateAnswer(
  question: string,
  answer: string,
  mode: "A" | "B"
): Promise<string> {

  const baseRules = `
You are an AI interview evaluator reviewing a candidate’s spoken answer.

GENERAL WRITING STYLE:
You must write in simple, natural, conversational English that sounds like a human interviewer.
Write exactly 4 to 6 sentences.
Do not use bullet points, headings, or structured formatting.
Each sentence must directly refer to something present in the answer.
Avoid generic statements that could apply to any answer.

TONE CONTROL:
Maintain a neutral, professional, and consistent tone.
Do not sound overly encouraging or overly critical.
Do not vary tone between different evaluation modes.
The tone must not reveal how the answer is being evaluated.

DIRECT ADDRESS (IMPORTANT):
Always speak directly to the candidate using "you" (e.g., "you explained...", "your answer shows...").
Do not speak in a detached or third-person evaluation style.

GROUNDING CONSTRAINT (CRITICAL):
Only use information that is explicitly present in the answer.
Do not assume missing details.
Do not invent examples, technologies, or reasoning.
If the answer is unclear or incomplete, acknowledge that instead of filling gaps.
`;

  const modePrompt =
    mode === "A"
      ? `
MODE: STRUCTURE-BASED EVALUATION

EVALUATION PHILOSOPHY:
Your role is to evaluate how clearly and effectively the answer is communicated, not what the candidate intended to say.

STRICT INTERPRETATION RULE:
You must treat the answer exactly as written or transcribed.
Do not interpret intent, do not infer meaning, and do not reconstruct what the candidate may have meant.

WHAT TO EVALUATE IN DETAIL:

1. CLARITY OF EXPRESSION:
Check whether the answer forms understandable sentences.
If the response contains unclear phrasing, broken language, or disconnected words, explicitly state that the communication is unclear.

2. SENTENCE STRUCTURE AND FORM:
Evaluate whether the answer contains complete and meaningful sentences.
If the response is made of fragments, numbers, or repeated words, treat it as structurally invalid communication.

3. LOGICAL FLOW:
Check whether ideas follow a logical progression.
If there is no clear connection between parts of the response, explicitly mention that the flow is disjointed or missing.

4. COMPLETENESS:
Check whether the answer actually addresses the question in a structured way.
If required elements are missing, state that the response is incomplete.

EDGE CASE HANDLING (VERY IMPORTANT):
If the answer contains:
- only numbers (e.g., "1, 2, 3")
- repeated words (e.g., "one one one")
- random phrases or unrelated words
- fragmented or incoherent speech

Then:
You must NOT attempt to interpret meaning.
You must explicitly state that the answer does not form a clear or complete response.

FORBIDDEN:
- Do NOT interpret intent
- Do NOT guess what the user meant
- Do NOT give benefit of doubt

STRICT LANGUAGE FOCUS:
If the answer is grammatically broken, fragmented, or unclear, you must explicitly state that the communication itself fails, regardless of whether any idea might exist.

FINAL GOAL:
Evaluate only how well the answer is communicated, and be strict about communication quality.
`
      : `
MODE: INTENT-BASED EVALUATION

EVALUATION PHILOSOPHY:
Your role is to evaluate what the candidate is trying to convey, regardless of how clearly it is expressed.

CORE BEHAVIOR:
You must focus on extracting possible meaning from the answer, even if it is poorly structured.
You must ignore grammar, sentence structure, and fluency issues.

INTERPRETATION STRATEGY (DETAILED):

1. HANDLING FRAGMENTED RESPONSES:
If the answer is incomplete or fragmented, try to extract any possible underlying idea without inventing new information.

2. HANDLING NUMBERS OR SEQUENCES:
If the answer contains numbers (e.g., "1, 2, 3"), interpret them as a possible attempt to describe steps or a sequence of actions.
However, do not assume what those steps are unless explicitly stated.

3. HANDLING REPETITION:
If the answer repeats words, interpret it as possible hesitation, emphasis, or uncertainty, not as meaningful structured content.

4. UNCERTAINTY HANDLING:
If meaning is unclear, explicitly say:
"The intended meaning is unclear, but the response appears to attempt..."

If no meaningful content exists, explicitly say:
"There is no clear relevant idea or problem-solving intent present in the response."

STRICT LIMITATION:
Do NOT invent details.
Do NOT assume specific examples, technologies, or explanations.
Only extract minimal reasonable meaning from what is present.

VALIDITY CHECK (CRITICAL):
If a concept in the answer appears incorrect, vague, or non-standard:
- You must NOT validate it as correct
- You must treat it as an unclear or incomplete attempt
Say:
"You mentioned X, but it is unclear or not well-defined"
NOT:
"This shows a good understanding"

INTENT SAFETY RULE (IMPORTANT):
Even if something sounds technical, do not assume it is valid.
Only acknowledge what is explicitly clear from the answer.

STRICT BAN:

You are NOT allowed to use words like:
- clarity
- grammar
- structure
- flow
- coherence

WHAT TO EVALUATE:
- Whether the response relates to the question at all
- Whether any reasoning or idea is present
- Whether the response attempts to answer the question

FORBIDDEN:
- Do NOT comment on grammar, fluency, or structure
- Do NOT penalize poor phrasing

INTENT PRIORITY:
Even if the wording is imperfect, focus on what the candidate is trying to achieve, decide, or explain.
If a decision, reasoning, or example is present, acknowledge it explicitly.

FINAL GOAL:
Evaluate the underlying intent, even if the communication is weak or unclear.
`;

  const prompt = `
${baseRules}

${modePrompt}

QUESTION:
${question}

ANSWER:
${answer}

Provide feedback now.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a strict but fair interview evaluator." },
      { role: "user", content: prompt },
    ],
  });

  return res.choices[0].message.content || "";
}


// ==========================
// 🔥 WRONG FEEDBACK
// ==========================
export type WrongFeedback = {
  feedback: string;
  errorType: "selective_blindness" | "misweighting" | "soft_misinterpretation";
  errorExplanation: string;
};

function pickErrorType(): WrongFeedback["errorType"] {
  const types: WrongFeedback["errorType"][] = [
    "selective_blindness",
    "misweighting",
    "soft_misinterpretation",
  ];
  return types[Math.floor(Math.random() * types.length)];
}

export async function generateWrongFeedback(
  question: string,
  answer: string,
  mode: "A" | "B",
  retryCount: number = 0
): Promise<WrongFeedback> {

  const errorType = pickErrorType();

  const generationPrompt = `
You are generating interview feedback that appears correct but contains ONE subtle evaluation mistake.

WRITING STYLE:
Write in natural, professional English.
Write 4 to 6 sentences.
Maintain the same tone as a correct evaluator.
The feedback must feel realistic and believable.

HARD CONSTRAINT (CRITICAL):
If the answer contains no meaningful content:
- You MUST NOT introduce specific concepts, technologies, or details that are not present
- You MUST keep the feedback grounded in the lack of content

The mistake should be:
- subtle misjudgment
NOT
- fabrication of content

CRITICAL RULE:
The feedback MUST contain a real mistake.

A valid mistake MUST be one of:
- Ignoring something clearly present in the answer
- Slightly misinterpreting what was said
- Overemphasizing a minor point while downplaying a major one

NOT ALLOWED:
- Being simply strict or incomplete
- Giving generally correct feedback
- Fabricating new information

EDGE CASE RULE:
If the answer has no meaningful content:
- You MUST NOT introduce fake meaning
- You MUST keep feedback grounded in lack of content

ERROR TYPE: ${errorType}

DETAILED ERROR IMPLEMENTATION:

1. SELECTIVE_BLINDNESS:
Identify an important part of the answer that is clearly present.
Completely ignore it in your feedback as if it does not exist.

2. MISWEIGHTING:
Identify both a major issue and a minor detail in the answer.
Overemphasize the minor detail while downplaying or briefly mentioning the main issue.

3. SOFT_MISINTERPRETATION:
Slightly distort what the answer conveys.
Do not invent new content, but reinterpret existing content incorrectly in a subtle way.

STRICT CONSTRAINTS:
- Do NOT hallucinate new facts
- Do NOT fabricate content that is not in the answer
- Only manipulate emphasis or interpretation

REALISM CONSTRAINT:
The feedback must still partially align with the answer.
Do NOT completely contradict the answer.
Instead, make a subtle shift in interpretation, emphasis, or omission.

SELF-CHECK BEFORE FINALIZING:
If your feedback does NOT clearly contain a mistake,
you MUST revise it to include one.

MODE:
${mode === "A"
  ? "Evaluate only communication quality (structure, clarity, flow)"
  : "Evaluate only meaning and reasoning (intent)"
}

QUESTION:
${question}

ANSWER:
${answer}

Return only the feedback.
`;

  const wrongRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You generate subtly incorrect but realistic feedback." },
      { role: "user", content: generationPrompt },
    ],
  });

  const wrongFeedback = wrongRes.choices[0].message.content || "";
// ==========================
// 🔍 WRONGNESS VALIDATION (ADD THIS)
// ==========================
const validationPrompt = `
Check if this feedback actually contains a real evaluation mistake.

Return ONLY:
VALID or INVALID

VALID = contains a real mistake (misinterpretation, ignoring content, or misweighting)
INVALID = feedback is actually correct, just strict, or incomplete

IMPORTANT:
- Strict feedback is NOT wrong
- Incomplete feedback is NOT wrong
- Only label INVALID if there is NO actual mistake

ANSWER:
${answer}

FEEDBACK:
${wrongFeedback}
`;

const validationRes = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "You detect whether feedback is actually incorrect." },
    { role: "user", content: validationPrompt },
  ],
});

const validation = validationRes.choices[0].message.content || "";

// 🔁 REGENERATE IF NOT ACTUALLY WRONG
if (validation.includes("INVALID")) {
  if (retryCount < 2) {
  return generateWrongFeedback(question, answer, mode, retryCount + 1);
}
}

  const explanationPrompt = `
Explain why the feedback is incorrect.

RULES:
- Write in 1 to 2 simple sentences
- Use direct comparison between answer and feedback

FORMAT:
- "The answer says X, but the feedback says Y"
- OR
- "The answer includes X, but the feedback ignores or misrepresents it"

DO NOT:
- use abstract terms like "fails to acknowledge"
- use theoretical language

VALIDITY CONSTRAINT:
If the answer does not contain meaningful or relevant content:
- Do NOT justify the answer as valid
- Do NOT treat random words as meaningful signals

Only identify mismatch if:
- the feedback contradicts actual content
NOT
- because the answer contains irrelevant or random words

INSTRUCTIONS:
- Identify what the answer actually contains
- Identify what the feedback incorrectly claims or ignores
- State the mismatch clearly

ADDITIONAL VALIDITY RULE (VERY IMPORTANT):
If the answer is random, meaningless, or unrelated:
- Do NOT treat it as valid or meaningful
- Do NOT justify it as creativity or intent
- Only call the feedback wrong if it invents meaning not present in the answer

ANSWER:
${answer}

FEEDBACK:
${wrongFeedback}

Return only the explanation.
`;

  const explanationRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You explain errors concisely and precisely." },
      { role: "user", content: explanationPrompt },
    ],
  });

  const errorExplanation =
    explanationRes.choices[0].message.content || "";

  return {
    feedback: wrongFeedback,
    errorType,
    errorExplanation,
  };
}