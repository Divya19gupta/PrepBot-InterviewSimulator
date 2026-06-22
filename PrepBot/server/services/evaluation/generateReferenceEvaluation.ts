
import { ReferenceEvaluation } from "./referenceEvaluationTypes";
import {
  StructureEvaluationSchema,
  IntentEvaluationSchema,
} from "./referenceEvaluationSchema";

import { getStructureEvaluationPrompt } from "./prompts/structurePrompt";
import { getIntentEvaluationPrompt } from "./prompts/intentPrompt";
import { structureRubric } from "./rubrics/structureRubric";
import { intentRubric } from "./rubrics/intentRubric";

import client, { MODEL } from "../openai";
function cleanJson(text: string): string {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export async function generateReferenceEvaluation(
  question: string,
  answer: string,
  evaluationLogic: "structure" | "intent"
): Promise<ReferenceEvaluation> {
 const rubric =
    evaluationLogic === "structure"
        ? structureRubric
        : intentRubric;

const prompt =
    evaluationLogic === "structure"
        ? getStructureEvaluationPrompt(
              question,
              answer,
              rubric
          )
        : getIntentEvaluationPrompt(
              question,
              answer,
              rubric
          );

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You are an expert behavioural interview assessor. Return ONLY valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const raw = completion.choices[0].message.content;

    if (!raw) {
        throw new Error("OpenAI returned an empty response.");
    }

    const cleaned = cleanJson(raw);

    const parsed = JSON.parse(cleaned);

      const validated =
        evaluationLogic === "structure"
          ? StructureEvaluationSchema.parse(parsed)
          : IntentEvaluationSchema.parse(parsed);

      return validated;
    } catch (err) {
      lastError = err;

      console.warn(
        `Reference evaluation failed (Attempt ${attempt}/3)`
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
    "Failed to generate a valid Reference Evaluation after 3 attempts."
  );
}