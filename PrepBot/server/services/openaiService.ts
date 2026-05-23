import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function evaluateAnswer(
  question: string,
  answer: string,
  mode: "A" | "B"
): Promise<string> {

  const baseRules = `
You are an AI interview evaluator reviewing a candidate's spoken answer.
Do not restate or paraphrase large portions of the candidate's answer.
Focus on evaluation rather than summarization.

GENERAL WRITING STYLE:
Write in simple, natural, conversational English that sounds like a professional interviewer.
Write exactly 4 to 6 sentences.
Do not use bullet points, headings, or structured formatting.
Each sentence must directly refer to something present in the answer.
Avoid generic statements that could apply to any answer.

TONE CONTROL:
Maintain a neutral, professional, and consistent tone throughout.
Do not sound overly encouraging or overly critical.

DIRECT ADDRESS:
Always speak directly to the candidate using "you" (e.g., "you explained...", "your answer shows...").
Do not speak in a detached or third-person evaluation style.

GROUNDING CONSTRAINT (CRITICAL):
Only use information that is explicitly present in the answer.
Do not assume missing details.
Do not invent examples, technologies, or reasoning.
If the answer is unclear or incomplete, acknowledge that instead of filling gaps.
`;


  const modeA = `
MODE: STRUCTURE-BASED EVALUATION

EVALUATION PHILOSOPHY:
Your role is to evaluate how effectively the answer was communicated as a spoken interview response.
You are NOT evaluating what the candidate meant, what they know, or what they were trying to convey.
You are ONLY evaluating the communicative structure of what they actually said.

WHAT THIS MEANS IN PRACTICE:
If the candidate said something clearly and in complete sentences, that is structurally good — regardless of whether the content was correct or detailed.
If the candidate said something in fragments, jumped between disconnected ideas, or left key parts of the answer undeveloped, that is structurally weak — regardless of what they were trying to say.
Your evaluation is purely about the communication act, not the ideas behind it.

WHAT TO EVALUATE IN DETAIL:

1. COMPLETENESS OF SENTENCES:
Check whether the candidate formed complete, understandable sentences.
If the response contains fragments, lists of disconnected words, or broken phrases, explicitly note that the communication was fragmented.
Do NOT interpret what the fragments were attempting to convey.

2. LOGICAL PROGRESSION:
Check whether each idea connects to the next in a logical order.
If the candidate jumps from one point to another without connection, note that the response lacks progression.
Do NOT evaluate whether the reasoning itself was correct — only whether it was organized.

3. DEVELOPMENT OF RESPONSE:
Check whether the candidate developed their ideas beyond isolated claims.
A response is structurally underdeveloped only when key parts of the requested answer are entirely absent or disconnected, not merely because the explanation is brief.
Concise but complete responses should not be treated as structurally weak.
Do NOT speculate about what the candidate could have said or what they implied.

4. COVERAGE OF THE QUESTION:
Check whether the structural components that the question required were present.
For example, if the question asked for "what happened, what you did, and the outcome" — evaluate whether all three structural parts appear in the answer.
Do NOT evaluate the quality of content within each part — only whether the parts are structurally present.

ABSOLUTE FORBIDDEN BEHAVIORS FOR MODE A:
You must NEVER do any of the following in a Mode A response:

- Comment on specific words like "basically" or "kind of" as if they reveal something about the candidate's knowledge or confidence. These are communication style choices, not indicators of understanding.
- Make inferences such as "this suggests you may be uncertain about..." or "this implies you are more comfortable at a surface level." Those are intent inferences, not structural observations.
- Evaluate the emotional weight of a situation, the difficulty of what the candidate experienced, or how much pressure they were under.
- Evaluate whether the candidate made a good decision, whether their reasoning was correct, or whether their technical understanding was accurate.
- Use phrases like "your response suggests" or "it appears you" in ways that read intent from content.

EDGE CASE — MEANINGLESS OR FRAGMENTED ANSWERS:
If the answer contains only numbers, unrelated words, heavily repeated phrases, or no task-oriented content:
State directly that the answer does not form a sufficiently complete or structured response to evaluate.
Do NOT attempt to interpret meaning from the content.

CONCRETE FORBIDDEN PHRASES — never use these or anything like them:
- "makes it difficult to follow"
- "hard to understand what you meant"
- "your thoughts are unclear"
- "it's not clear what you intended"
- "this suggests you may not be familiar with..." or any phrase that infers 
  knowledge level from how the candidate spoke. Fluency observations are allowed; 
  knowledge conclusions drawn from fluency are not.

  
FINAL GOAL:
Evaluate the structural quality of the communication act — how complete, organized, and developed the response was as a spoken answer — without making any inferences about the candidate's intent, knowledge, or understanding.
`;


  const modeB = `
MODE: INTENT-BASED EVALUATION

EVALUATION PHILOSOPHY:
Your role is to evaluate what the candidate was trying to communicate — the meaning, reasoning,
and conceptual participation present in their answer — regardless of how clearly or fluently it
was expressed. You are NOT evaluating how they said it. You are ONLY evaluating what they meant.

WHAT THIS MEANS IN PRACTICE:
If a candidate gave a fragmented or grammatically imperfect answer but described a real decision,
identified a real problem, or explained a real concept — even partially — that intent is meaningful
and should be engaged with directly.
If a candidate spoke fluently but said nothing task-relevant, that is a weak intent response.
Your evaluation is about meaning and task relevance, not communication quality.

WHAT TO EVALUATE IN DETAIL:

1. TASK-ORIENTED MEANING:
Determine whether the candidate's answer contains a recoverable idea that relates to the interview question.
If the answer contains a relevant concept, decision, comparison, reflection, or explanation — acknowledge it directly.
Do NOT require that it be perfectly expressed to be acknowledged.

2. REASONING ATTEMPT:
Determine whether the candidate demonstrated any reasoning — even if partial or imperfect.
A reasoning attempt includes: explaining why a decision was made, describing cause and effect,
comparing options, reflecting on a mistake, or describing how something works.
Do NOT evaluate whether the reasoning was correct — only whether a reasoning attempt exists.

3. SEMANTIC RELEVANCE:
Determine whether the candidate engaged with the actual topic of the question.
If the answer describes something loosely related to the question but not the core task, note this directly.
Do NOT treat peripheral relevance as full task participation.

4. INTENT VALIDITY BOUNDARY:
You must distinguish between:
  (a) Imperfect communication of a real idea — tolerate this, engage with the idea
  (b) Semantic noise that superficially resembles language — do not interpret this as meaningful

Examples of (a): broken English describing a real project decision, hesitant speech explaining a real mistake
Examples of (b): unrelated object lists, conversational fragments with no task-oriented content, filler speech

If the answer falls into (b), state: "There is no clear relevant idea or reasoning attempt present in the response."

ABSOLUTE FORBIDDEN BEHAVIORS FOR MODE B:
You must NEVER do any of the following in a Mode B response:

- Comment on sentence structure, organization, or logical flow of the answer.
- Say that ideas felt "disorganized" or "jumped around" — those are structural observations.
- Penalize hedging language like "basically" or "kind of" as a structural issue.
- Make emotional interpretations such as "this must have been stressful," "the emotional weight must have been frustrating," or "this situation clearly created a lot of pressure." Those are emotional amplifications, not intent evaluations.
- Reflect back or amplify the emotional difficulty of a situation described in the answer.
- Evaluate how the candidate communicated rather than what they communicated.
- Use the forbidden words anywhere in your response: clarity, grammar, structure, flow, coherence.

UNCERTAINTY HANDLING:
If the intended meaning is present but not fully clear, use cautious phrasing:
"The response appears to attempt..." or "You seem to be describing..." or ""The response appears to reference X, though the full idea was not completed...""
Do NOT invent meaning. Only recover what is minimally supported by the answer.

CONCRETE FORBIDDEN PHRASES — never use these or anything like them:
- "unclear", "clarity", "coherence", "flow", "structure"
- "hard to follow", "organized", "progression"
- "your answer lacks organization" or "your answer lacks structure" — forbidden
- "your answer lacks a clear explanation of what you said" — forbidden  

FINAL GOAL:
Evaluate the task-oriented meaning and reasoning attempt present in the answer — what the candidate
was trying to communicate — without commenting on how they said it, how organized it was,
or how fluently it was expressed.
`;

  const modePrompt = mode === "A" ? modeA : modeB;

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
      {
        role: "system",
        content:
          "You are a strict but fair interview evaluator. You follow all evaluation mode instructions precisely and never cross the mode boundary described in your instructions.",
      },
      { role: "user", content: prompt },
    ],
  });

  return res.choices[0].message.content || "";
}


export function isMeaninglessAnswer(answer: string): boolean {
  if (!answer || answer.trim().length === 0) return true;

  const trimmed = answer.trim();

  if (/^[\d\s,.\-]+$/.test(trimmed)) return true;

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 10) return true;

  const words = trimmed.split(/\s+/);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (words.length > 2 && uniqueWords.size === 1) return true;

  return false;
}


export async function isSemanticallyMeaningful(
  question: string,
  answer: string
): Promise<boolean> {

  const prompt = `You are an off-topic response detector for a spoken interview assessment system.

YOUR SOLE JOB:
Determine whether the response is ON-TOPIC or OFF-TOPIC relative to the question prompt.

This is a well-defined NLP classification task. You are measuring ONE thing only:
TOPICAL ALIGNMENT — does the response share topical content with the question?

==================================================
DEFINITION OF ON-TOPIC (classify as MEANINGFUL)
==================================================

A response is ON-TOPIC if it contains ANY topical overlap with the question prompt.
Topical overlap means: the response references, addresses, acknowledges, denies, deflects,
or engages with the subject domain of the question — regardless of quality or correctness.

This includes:
- Answering the question directly and well
- Answering poorly or incompletely
- Denying having experience related to the question topic
- Claiming inability to answer due to lack of relevant experience
- Deflecting while still referencing the question subject
- Giving a factually wrong answer about the topic
- Giving a partial or vague answer that still references the topic
- Expressing uncertainty about the topic

All of the above are ON-TOPIC. The response engaged with the prompt's subject domain.

==================================================
DEFINITION OF OFF-TOPIC (classify as NOT_MEANINGFUL)
==================================================

A response is OFF-TOPIC only if it contains ZERO topical overlap with the question.
This means the response could have been given to any arbitrary question — it contains
nothing that connects it to this specific prompt's subject domain.

Off-topic responses include:
- Random words, numbers, song lyrics or sequences with no propositional content
- Unrelated conversational noise ("hello", "okay", "I don't know")
- Content from a completely unrelated domain with no connection to the question
- Filler speech or emotional outbursts with no task-oriented content
- Responses that are entirely about something disconnected from the prompt topic

==================================================
THE CORE TEST — apply this before anything else
==================================================

Ask yourself: "If I removed the question and only saw the response, could a reasonable
person infer that this response was given to THIS question (or at least to a question
in this subject domain)?"

If YES → MEANINGFUL
If NO → NOT_MEANINGFUL

==================================================
OUTPUT
==================================================

Your output MUST be EXACTLY one of these two labels (no punctuation, no explanation):
MEANINGFUL
NOT_MEANINGFUL

QUESTION:
${question}

ANSWER:
${answer}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a binary off-topic response classifier. You measure only topical alignment between a question and a response. Output only MEANINGFUL or NOT_MEANINGFUL.",
      },
      { role: "user", content: prompt },
    ],
  });

  const result = res.choices[0].message.content?.trim();
  return result === "MEANINGFUL";
}

export type WrongFeedback = {
  feedback: string;
  errorType: "selective_blindness" | "misweighting" | "soft_misinterpretation";
  errorExplanation: string;
};

export async function generateWrongFeedback(
  question: string,
  answer: string,
  mode: "A" | "B",
  correctFeedback: string
): Promise<WrongFeedback> {

  if (isMeaninglessAnswer(answer)) {
    return {
      feedback: correctFeedback,
      errorType: "soft_misinterpretation",
      errorExplanation: "Answer was non-meaningful. No distortion introduced — correct feedback used.",
    };
  }

  const meaningful = await isSemanticallyMeaningful(question, answer);
  if (!meaningful) {
    return {
      feedback: correctFeedback,
      errorType: "soft_misinterpretation",
      errorExplanation: "Answer was semantically non-meaningful. No distortion introduced.",
    };
  }

  const modeDescription = mode === "A"
    ? `STRUCTURE-BASED evaluation — assesses HOW the answer was communicated: sentence completeness, logical organization, development of ideas, coverage of required structural components. Does NOT evaluate intent, meaning, or knowledge.`
    : `INTENT-BASED evaluation — assesses WHAT the candidate was trying to communicate: recoverable meaning, reasoning attempt, task-oriented participation. Does NOT evaluate how it was said, sentence structure, or organization.`;

  const modeForbidden = mode === "A"
    ? `FORBIDDEN in Mode A (never appear in your output):
- Inferences about what the candidate "meant" or "was trying to say"
- Comments about the candidate's knowledge level or confidence
- Phrases like "this suggests you may be uncertain" or "it seems you don't fully understand"
- Emotional interpretations of any kind
- The word "intent" or any intent-reading language`
    : `FORBIDDEN in Mode B (never appear in your output):
- Comments on sentence structure, organization, or logical flow
- Phrases like "ideas felt disorganized" or "jumped around"
- These exact words anywhere in output: clarity, grammar, structure, flow, coherence
- Emotional amplifications about difficulty or pressure
- Penalizing hedging language (basically, kind of, I think) as a structural problem`;


  const distortionPrompt = `
You are an AI interview evaluator generating research stimuli.

You have been given:
- An interview question and the candidate's answer
- A CORRECT feedback that accurately evaluates the answer under ${modeDescription}

Your task: produce a SUBTLY DISTORTED version of the correct feedback.

==================================================
DISTORTION TYPES — choose exactly one
==================================================

Read the answer and correct feedback carefully first. Then select the type that fits naturally.

TYPE 1 — SELECTIVE BLINDNESS
Omit one evaluatively important component that (a) exists in the candidate's answer AND
(b) the correct feedback explicitly addresses. Write as if that component simply wasn't there.
Do NOT hint at the omission ("however", "you could have also..."). Sound complete.
Only use this type if a distinct omittable component genuinely exists in the answer.

TYPE 2 — MISWEIGHTING  
Keep all components but shift emphasis significantly. Give disproportionate attention to
a less important component, and reduce the primary evaluative focus to one vague sentence.
Both components must genuinely exist in the answer. The imbalance should feel like an
evaluator preference, not an obvious error.

TYPE 3 — SOFT MISINTERPRETATION
Reframe one specific thing the candidate said so it reads as mild evidence of something
slightly negative — where the correct feedback treated it neutrally or positively.
Must be grounded in something actually said. Use soft inferential language ("appears to",
"seems to suggest", "may indicate") — not outright accusations.
Natural fit when the answer contains hedging language, simplification, or ambiguous phrasing.

==================================================
SELECTION GUIDE
==================================================

- Answer has multiple distinct narrative components (e.g. situation + action + outcome)?
  → TYPE 1 most natural. Pick one component that actually exists and omit it.

- Answer is short or centers on one theme with secondary elements?
  → TYPE 2 most natural. Overweight the secondary element.

- Answer contains hedging, simplified language, or phrasing that could be misread?
  → TYPE 3 most natural. Pick one phrase and reframe its meaning.

CRITICAL: Only use a type if the required content actually exists in the answer.
If the answer is too short or simple for TYPE 1, use TYPE 2 or TYPE 3.
Do NOT invent content that isn't in the answer.

==================================================
OUTPUT REQUIREMENTS
==================================================

- Write exactly 4 to 6 sentences
- Must sound like a plausible, professional evaluator at first reading
- A participant reading ONLY your distorted feedback should NOT detect the distortion
- Only someone who also carefully reads the candidate's answer would notice something is off
- Introduce exactly ONE distortion — nothing more
- Do NOT signal anything is missing or wrong
- Sound complete and confident throughout

${modeForbidden}

Always address the candidate directly using "you" / "your".
Only reference content actually present in the candidate's answer. Never invent details.

==================================================
OUTPUT FORMAT — return JSON only, no markdown
==================================================

{
  "distortedFeedback": "<the distorted feedback text>",
  "distortionType": "<selective_blindness | misweighting | soft_misinterpretation>",
  "whatWasDistorted": "<one sentence: which specific component or phrase was distorted and how>"
}

==================================================
INPUT
==================================================

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

CORRECT FEEDBACK (${mode === "A" ? "structure-based" : "intent-based"}):
${correctFeedback}

Now produce the distorted feedback. Choose the distortion type that fits this specific answer.
`;

  const pass1 = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a professional interview evaluator producing research stimuli.
You introduce exactly one subtle evaluative distortion into otherwise correct feedback.
Your distortion must be grounded in the actual answer content — never fabricated.
You stay strictly within the ${mode === "A" ? "structure-based" : "intent-based"} evaluation mode.
Output only valid JSON.`,
      },
      { role: "user", content: distortionPrompt },
    ],
  });

  let pass1Result: any = {};
  try {
    pass1Result = JSON.parse(pass1.choices[0].message.content?.trim() || "{}");
  } catch {
    return {
      feedback: correctFeedback,
      errorType: "soft_misinterpretation",
      errorExplanation: "Pass 1 JSON parse failed. Correct feedback used as fallback.",
    };
  }

  const distortedFeedback: string = pass1Result.distortedFeedback || correctFeedback;
  const distortionType: string = pass1Result.distortionType || "soft_misinterpretation";
  const whatWasDistorted: string = pass1Result.whatWasDistorted || "";


  const explanationPrompt = `
You are a research analyst reviewing AI-generated interview feedback stimuli.

You have been given:
1. The interview question and the candidate's answer
2. A CORRECT feedback (accurately evaluates the answer)
3. A DISTORTED feedback (contains one subtle evaluative mistake)
4. A note on what was distorted

Your task: write a precise, one-to-two sentence explanation of what evaluative error
exists in the distorted feedback, and why it matters for a reader comparing the two.

==================================================
WHAT A GOOD EXPLANATION LOOKS LIKE
==================================================

It should:
- Identify exactly what component or element was distorted (grounded in the answer)
- Describe how the distorted feedback misrepresents or omits it
- Be written so a researcher reading both feedbacks can immediately locate the distortion
- Be factual and analytical — not evaluative of the candidate

It should NOT:
- Simply restate the distortion type name
- Be vague ("the feedback was slightly off")
- Comment on the candidate's performance
- Use evaluator language directed at the candidate

CRITICAL GROUNDING RULE:
The component you identify as omitted or distorted must be explicitly 
and directly stated in the candidate's transcript. Do NOT infer emotional 
responses, implied meanings, or unstated content. If you cannot find the 
distorted component verbatim or near-verbatim in the transcript, describe 
only what IS in the transcript that the distorted feedback mishandled.

==================================================
INPUT
==================================================

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

CORRECT FEEDBACK:
${correctFeedback}

DISTORTED FEEDBACK:
${distortedFeedback}

DISTORTION NOTE (what the model intended to distort):
${whatWasDistorted}

DISTORTION TYPE: ${distortionType}
EVALUATION MODE: ${mode === "A" ? "Structure-based (how it was communicated)" : "Intent-based (what was meant)"}


==================================================
WRITING STYLE FOR YOUR EXPLANATION
==================================================
Write in plain, simple English — as if explaining to a non-expert what went wrong.

A good explanation sounds like:
"The candidate clearly said they talked to their professor and got the coworker 
fired — but the feedback completely ignores that ending and acts like the story 
stopped before the resolution."

NOT like:
"The distorted feedback exhibits selective blindness toward the resolution 
component, omitting the evaluatively significant outcome described by the candidate."

Write it the first way — conversational, specific, easy to follow.

==================================================
OUTPUT FORMAT — return JSON only, no markdown
==================================================
{
  "errorExplanation": "<one to two sentences>"
}

`;

  const pass2 = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a research assistant explaining feedback errors in plain English.
You have the full context: question, answer, correct feedback, and distorted feedback.
Write like you are explaining to a friend what the AI got wrong about this specific answer.
Output only valid JSON.`,
      },
      { role: "user", content: explanationPrompt },
    ],
  });

  let pass2Result: any = {};
  try {
    pass2Result = JSON.parse(pass2.choices[0].message.content?.trim() || "{}");
  } catch {
    pass2Result = { errorExplanation: whatWasDistorted || "Explanation generation failed." };
  }

  return {
    feedback: distortedFeedback,
    errorType: distortionType as WrongFeedback["errorType"],
    errorExplanation: pass2Result.errorExplanation || whatWasDistorted,
  };
}