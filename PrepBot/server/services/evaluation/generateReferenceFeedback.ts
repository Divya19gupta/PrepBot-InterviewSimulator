import { ReferenceEvaluation } from "./referenceEvaluationTypes";
import client, { MODEL } from "../openai";
function clean(text: string): string {
  return text
    .replace(/```/g, "")
    .trim();
}

export async function generateReferenceFeedback(
  evaluation: ReferenceEvaluation
): Promise<string> {

  const prompt =
  evaluation.evaluationLogic === "structure"
    ? structureFeedbackPrompt(evaluation)
    : intentFeedbackPrompt(evaluation);
//   const prompt = `
// You are an expert behavioural interview coach.

// You are given a structured reference evaluation that has already been completed.

// Your task is to convert the evaluation into participant-facing feedback.

// IMPORTANT RULES

// - Do NOT invent new observations.
// - Do NOT introduce new strengths.
// - Do NOT introduce new weaknesses.
// - Do NOT reinterpret the evaluation.
// - Do not infer information that is not explicitly present in the evaluation.
// - Preserve the meaning of every criterion.
// - Write naturally and professionally.
// - Do not mention rubric names.
// - Do not mention evaluation labels such as 'Satisfied', 'Partially Satisfied', or 'Not Satisfied'.
// - Do not mention JSON.
// - Do not mention "evaluation".

// The feedback should:

// IMPORTANT

// The evaluation may have one of two evaluation logics:

// 1. Structure
// 2. Intent

// If the evaluationLogic is "structure":

// - Write as an experienced communication coach.
// - The participant should feel they are receiving feedback about HOW they communicated their answer rather than WHAT they said.

// - Prioritise comments about:
// • organisation
// • clarity
// • logical flow
// • coherence
// • sequencing of ideas
// • development of explanations
// • ease of following the response

// - Discuss communication strengths before mentioning missing detail.
// - Only mention missing information when it directly affects the clarity or completeness of the explanation.
// - Do not evaluate reasoning quality, supporting evidence, justification, or whether the interview question was fully answered.

// If the evaluationLogic is "intent":
// - Write as an experienced interviewer.
// - The participant should feel they are receiving feedback about the QUALITY of their answer rather than how it was communicated.

// - Prioritise comments about:
// • answering the interview question
// • relevance
// • reasoning
// • supporting evidence
// • examples
// • justification
// • achievement of the interview objective

// - Discuss content strengths before suggesting additional examples or reasoning.
// - Do not comment on organisation, communication style, sequencing, or presentation unless they prevented understanding the answer.

// • When referencing what the participant said, paraphrase rather than quoting the exact same wording that would appear in the other feedback variant.
// • The feedback styles should feel noticeably different while remaining equally professional — a reader should be able to tell the two apart without being told which is which.

// • Begin with one short overall summary.

// • Then describe the participant's strengths.

// • Then describe areas for improvement.

// • Finish with one short encouraging sentence.

// Reference Evaluation

// ${JSON.stringify(evaluation, null, 2)}

// Return ONLY the feedback text.
// `;

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {

      const completion = await client.chat.completions.create({

        model: MODEL,

        temperature: 0.2,

        messages: [

         {
  role: "system",
  content:
    "You generate participant-facing interview feedback while preserving the meaning of the provided structured evaluation. Never invent observations or alter the evaluation.",
},

          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const feedback = completion.choices[0].message.content;

      if (!feedback) {
        throw new Error("Empty feedback.");
      }

      return clean(feedback);

    } catch (err) {

      lastError = err;

      console.warn(
        `Reference feedback failed (Attempt ${attempt}/3)`
      );

      if (attempt < 3) {
        await new Promise((resolve) =>
          setTimeout(resolve, 600)
        );
      }
    }
  }

  console.error(lastError);

  throw new Error(
    "Failed to generate participant feedback."
  );
}
function structureFeedbackPrompt(
  evaluation: ReferenceEvaluation
): string {

  return `
You are an AI interview coach.

A structured interview evaluation has already been completed.

Your task is to convert that evaluation into participant-facing feedback.

IMPORTANT RULES

- Do NOT invent new observations.
- Do NOT introduce new strengths.
- Do NOT introduce new weaknesses.
- Do NOT reinterpret the evaluation.
- Preserve the meaning of every criterion.
- Do not mention rubric names.
- Do not mention evaluation labels such as "Satisfied", "Partially Satisfied", or "Not Satisfied".
- Do not mention JSON or the evaluation process.

Your primary perspective is communication quality.

The participant should feel they are receiving feedback about HOW they communicated their answer rather than WHAT they said.

When writing the feedback, naturally emphasise:

• organisation
• logical flow
• clarity of explanation
• coherence between ideas
• completeness of the explanation
• development of ideas
• ease of following the response

If content is missing, mention it only when it affects the completeness or clarity of the explanation.

Do not make the quality of the participant's reasoning, supporting evidence, or relevance to the interview question the primary focus unless it is explicitly reflected in the evaluation.

The feedback should:

• Begin with one short overall summary.

• Then describe the participant's strengths.

• Then describe areas for improvement.

• Finish with one short encouraging sentence.

Reference Evaluation

${JSON.stringify(evaluation, null, 2)}

Return ONLY the feedback text.
`;
}
function intentFeedbackPrompt(
  evaluation: ReferenceEvaluation
): string {

  return `
You are an AI interview coach.

A structured interview evaluation has already been completed.

Your task is to convert that evaluation into participant-facing feedback.

IMPORTANT RULES

- Do NOT invent new observations.
- Do NOT introduce new strengths.
- Do NOT introduce new weaknesses.
- Do NOT reinterpret the evaluation.
- Preserve the meaning of every criterion.
- Do not mention rubric names.
- Do not mention evaluation labels such as "Satisfied", "Partially Satisfied", or "Not Satisfied".
- Do not mention JSON or the evaluation process.

Your primary perspective is response quality.

The participant should feel they are receiving feedback about WHAT they said rather than HOW they communicated it.

When writing the feedback, naturally emphasise:

• relevance to the interview question
• supporting evidence
• reasoning
• justification of decisions
• achievement of the interview objective

Do not make communication style, organisation, sequencing, or presentation the primary focus unless it is explicitly reflected in the evaluation.

The feedback should:

• Begin with one short overall summary.

• Then describe the participant's strengths.

• Then describe areas for improvement.

• Finish with one short encouraging sentence.

Reference Evaluation

${JSON.stringify(evaluation, null, 2)}

Return ONLY the feedback text.
`;
}