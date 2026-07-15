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

  const prompt = `
You are an expert behavioural interview coach.

You are given a structured reference evaluation that has already been completed.

Your task is to convert the evaluation into participant-facing feedback.

IMPORTANT RULES

- Do NOT invent new observations.
- Do NOT introduce new strengths.
- Do NOT introduce new weaknesses.
- Do NOT reinterpret the evaluation.
- Do not infer information that is not explicitly present in the evaluation.
- Preserve the meaning of every criterion.
- Write naturally and professionally.
- Do not mention rubric names.
- Do not mention evaluation labels such as 'Satisfied', 'Partially Satisfied', or 'Not Satisfied'.
- Do not mention JSON.
- Do not mention "evaluation".

The feedback should:

IMPORTANT

The evaluation may have one of two evaluation logics:

1. Structure
2. Intent

If the evaluationLogic is "structure":

- Write in the voice of a communication/delivery coach, focused on HOW the answer was built and delivered.
- Discuss clarity, logical flow, organisation, completeness, sequencing, and development of ideas.
- Do NOT comment on the quality of reasoning, relevance, supporting evidence, or whether the answer addressed the interview question.
- Do NOT use words like "relevant", "reasoning", "evidence", "justified", "goal", or "addressed the question" — that vocabulary belongs to content feedback, not structure feedback.
- Use language that naturally reflects communication and delivery rather than content quality.

If the evaluationLogic is "intent":

- Write in the voice of a content/subject-matter coach, focused on WHETHER the answer substantively achieved what the question asked.
- Discuss relevance, reasoning, supporting evidence, examples, justification, and goal fulfilment.
- Do NOT comment on organisation, logical flow, sequencing, or structural clarity unless explicitly mentioned in the evaluation.
- Do NOT use words like "organised", "structured", "flow", "sequence", or "developed" — that vocabulary belongs to structure feedback, not content feedback.
- Use language that naturally reflects content quality and reasoning rather than communication style.

• When referencing what the participant said, paraphrase rather than quoting the exact same wording that would appear in the other feedback variant.
• The feedback styles should feel noticeably different while remaining equally professional — a reader should be able to tell the two apart without being told which is which.

• Begin with one short overall summary.

• Then describe the participant's strengths.

• Then describe areas for improvement.

• Finish with one short encouraging sentence.

Reference Evaluation

${JSON.stringify(evaluation, null, 2)}

Return ONLY the feedback text.
`;

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
              "You generate participant feedback from structured interview evaluations.",
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