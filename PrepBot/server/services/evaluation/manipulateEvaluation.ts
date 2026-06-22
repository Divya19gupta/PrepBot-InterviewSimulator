import client, { MODEL } from "../openai";

import {
  ReferenceEvaluation,
  RubricCriterion,
} from "./referenceEvaluationTypes";

import { ErrorImplementation } from "./experimentTypes";

import {
  StructureEvaluationSchema,
  IntentEvaluationSchema,
} from "./referenceEvaluationSchema";

import { structureRubric } from "./rubrics/structureRubric";
import { intentRubric } from "./rubrics/intentRubric";

function clean(
  text: string
): string {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export interface ManipulationResult {

    evaluation: ReferenceEvaluation;

    explanation: string;

}

export async function manipulateEvaluation(
    evaluation: ReferenceEvaluation,
    criterion: RubricCriterion,
    wrongness: ErrorImplementation
): Promise<ManipulationResult> {

    const rubric =
    evaluation.evaluationLogic === "structure"
        ? structureRubric
        : intentRubric;

  const prompt = `
  You are modifying an already-completed behavioural interview evaluation.

You are NOT evaluating the participant again.

You must introduce ONE controlled evaluation error.

--------------------------------------------------
Evaluation Logic
--------------------------------------------------

${evaluation.evaluationLogic}

--------------------------------------------------
Official Rubric
--------------------------------------------------

${JSON.stringify(rubric, null, 2)}

--------------------------------------------------
Target Criterion
--------------------------------------------------

${criterion}

--------------------------------------------------
Manipulation Type
--------------------------------------------------

${wrongness}

--------------------------------------------------
Rules
--------------------------------------------------

• Modify ONLY the assigned criterion.

Leave every rubric criterion except the assigned criterion byte-for-byte identical.

Do not modify:

- any other criterion
- evaluationLogic
- overallAssessment

Changing more than one criterion will invalidate the experiment.

• Never change evaluationLogic.

• Never change overallAssessment.

• Never invent participant evidence.

• Preserve valid JSON.

--------------------------------------------------

If manipulation type is Selective Blindness

• Remove one meaningful observation.

• Do not invent evidence.

• Keep remaining judgement internally consistent.

--------------------------------------------------

If manipulation type is Misweighting

• Keep evidence identical.

• Keep feedback almost identical.

• Change ONLY the criterion status.

--------------------------------------------------

Reference Evaluation

${JSON.stringify(evaluation,null,2)}

--------------------------------------------------

Return ONLY JSON

{
    "evaluation": { ... },

    "explanation":
    "Explain exactly what manipulation was introduced."
}
  `;

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {
    try {

      const completion =
        await client.chat.completions.create({

          model: MODEL,

          temperature: 0.3,

          response_format: {
            type: "json_object",
          },

          messages: [
            {
              role: "system",
              content:
                "You perform controlled manipulations of structured interview evaluations. Return only valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

      const raw =
        completion.choices[0]
          .message.content;

      if (!raw) {
        throw new Error(
          "Empty response."
        );
      }

      const cleaned = clean(raw);

const parsed = JSON.parse(cleaned);
        if (!parsed.evaluation) {
  throw new Error(
    "Manipulated evaluation missing from response."
  );
}

if (typeof parsed.explanation !== "string") {
  throw new Error(
    "Manipulation explanation missing."
  );
}
    const evaluationJson =
    parsed.evaluation;

    
    const validated: ReferenceEvaluation =
  evaluation.evaluationLogic === "structure"
    ? StructureEvaluationSchema.parse(evaluationJson)
    : IntentEvaluationSchema.parse(evaluationJson);
    
          return {
  evaluation: validated,
  explanation: parsed.explanation,
};

    } catch (err) {

      lastError = err;

      console.warn(
        `Manipulation failed (Attempt ${attempt}/3)`
      );

      if (attempt < 3) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              600
            )
        );
      }
    }
  }

  console.error(lastError);

  throw new Error(
    "Failed to generate manipulated evaluation."
  );
}