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
    wrongness: ErrorImplementation,
    answer: string
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

• The manipulated evaluation must remain plausible.

• The resulting participant-facing feedback should resemble the kind of subtle mistake a real AI evaluator could make.

• Do not create obvious contradictions or unrealistic errors.

--------------------------------------------------

--------------------------------------------------

If manipulation type is Selective Blindness

• Remove one meaningful observation.

• Do not invent evidence.

• Keep remaining judgement internally consistent.

Explanation requirements:

• Do NOT simply say that an observation was removed.

• Explain what information the participant provided.

• Explain how the original evaluation used that information.

• Explain what specific information was ignored.

• Explain why ignoring it makes the manipulated evaluation incorrect.

• The explanation must explicitly connect the ignored observation to the resulting feedback error.

• Do not stop at describing what was ignored.

• Explain how ignoring that information caused the participant to receive feedback that was less accurate than the original evaluation.

Example:

"The participant explained that they consulted their supervisor after discovering a mistake. The original evaluation used this as evidence of corrective action and problem-solving. The manipulated evaluation ignored this information and evaluated the response as though the corrective actions had not been described."

--------------------------------------------------

If manipulation type is Misweighting

• Keep evidence identical.

• Keep feedback almost identical.

• Change ONLY the criterion status.

Explanation requirements:

• Do NOT simply say that the status changed.

• Explain what evidence was present.

• Explain why the original evaluation assigned its rating.

• Explain why the manipulated rating no longer matches the evidence.

• The explanation must explicitly connect the incorrect criterion rating to the participant's actual answer.

• Describe what information was missing or present in the answer and explain why the manipulated rating no longer reflects the evidence.

• Focus on why the participant would receive an unfair evaluation.

Example:

"The participant described the project but never explained which tools or systems were learned. The original evaluation therefore rated coverage as only partially satisfied. The manipulated evaluation rated coverage as satisfied despite the missing information."


--------------------------------------------------
Participant Response
--------------------------------------------------

${answer}

--------------------------------------------------
Reference Evaluation
--------------------------------------------------

${JSON.stringify(evaluation,null,2)}

--------------------------------------------------
Explanation Requirements
--------------------------------------------------

The explanation is intended for researchers analysing the study.

The explanation must be written in terms of:

• what the participant actually said

• what information was present or missing in the answer

• what the original evaluation correctly recognised

• what information was ignored (Selective Blindness) OR incorrectly weighted (Misweighting)

• how this changed the resulting participant-facing feedback

Do NOT focus on rubric mechanics alone.

Do NOT simply say:

- a criterion changed
- a status changed
- an observation was removed
- a criterion was modified

Instead explain the actual evaluation mistake.

The explanation must clearly answer:

1. What did the participant actually say?

2. What did the original evaluation correctly recognise?

3. What information was ignored or misweighted?

4. Why does this make the manipulated evaluation incorrect?

5. How would this affect the feedback shown to the participant?

Examples:

"The answer already explained how the participant solved the problem by consulting their supervisor and changing their approach. The original evaluation recognised this as evidence of problem-solving and corrective action. The manipulated evaluation ignored this information and treated the answer as though the solution process had not been fully explained. As a result, the generated feedback incorrectly asks for more explanation of the resolution process even though that information was already present."

"The answer never explained which tools or systems were learned during the project. The original evaluation recognised this missing information and identified it as an area for improvement. The manipulated evaluation treated the criterion as sufficiently satisfied despite the missing details. As a result, the generated feedback becomes less likely to encourage the participant to explain the tools and methods they used."

--------------------------------------------------

Return ONLY JSON

{
  "evaluation": { ... },

  "explanation":
  "Researcher-facing explanation describing what the participant said, what was ignored or misweighted, why the manipulated evaluation became incorrect, and how this changed the resulting feedback."
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

// Force original evidence — don't trust LLM to copy it exactly
(validated.rubric as any)[criterion].evidence =
  (evaluation.rubric as any)[criterion].evidence;

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