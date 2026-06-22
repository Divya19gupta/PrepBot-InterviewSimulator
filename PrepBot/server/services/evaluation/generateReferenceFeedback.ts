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

        temperature: 0.4,

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