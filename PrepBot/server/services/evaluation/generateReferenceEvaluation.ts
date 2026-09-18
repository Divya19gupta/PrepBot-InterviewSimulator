
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
function normalizeStatus(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, "").toLowerCase();
  switch (normalized) {
    case "satisfied": return "Satisfied";
    case "partiallysatisfied": return "Partially Satisfied";
    case "notsatisfied": return "Not Satisfied";
    default: return value;
  }
}

function normalizeEvaluation(evaluationJson: any): any {
  if (!evaluationJson?.rubric) return evaluationJson;
  for (const key of Object.keys(evaluationJson.rubric)) {
    const criterionObj = evaluationJson.rubric[key];
    if (criterionObj && "status" in criterionObj) {
      criterionObj.status = normalizeStatus(criterionObj.status);
    }
  }
  return evaluationJson;
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

  for (let attempt = 1; attempt <= 5; attempt++) {
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
    const normalized = normalizeEvaluation(parsed);
      const validated =
        evaluationLogic === "structure"
          ? StructureEvaluationSchema.parse(normalized)
          : IntentEvaluationSchema.parse(normalized);

      return validated;
    } catch (err) {
      lastError = err;

      console.warn(
        `Reference evaluation failed (Attempt ${attempt}/5)`
      );

      if (attempt < 5) {
        await new Promise((resolve) =>
          setTimeout(resolve, 600)
        );
      }
    }
  }

  console.error(lastError);

  throw new Error(
    "Failed to generate a valid Reference Evaluation after 5 attempts."
  );
}