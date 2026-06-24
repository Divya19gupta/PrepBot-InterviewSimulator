import client, { MODEL } from "../openai";

import {
    ReferenceEvaluation,
    RubricCriterion,
} from "./referenceEvaluationTypes";

import { ErrorImplementation } from "./experimentTypes";

export interface ValidationResult {

  valid: boolean;

  reason: string;
}

function changed(
  a: unknown,
  b: unknown
): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export async function validateManipulation(
  original: ReferenceEvaluation,
  manipulated: ReferenceEvaluation,
  criterion: RubricCriterion,
  wrongness: ErrorImplementation
): Promise<ValidationResult> {

  //--------------------------------------------------
  // evaluation type must remain identical
  //--------------------------------------------------

  if (
    original.evaluationLogic !==
    manipulated.evaluationLogic
  ) {
    return {
      valid: false,
      reason:
        "Evaluation logic changed.",
    };
  }

  //--------------------------------------------------
  // overall assessment must remain identical
  //--------------------------------------------------

  if (
    original.overallAssessment !==
    manipulated.overallAssessment
  ) {
    return {
      valid: false,
      reason:
        "Overall assessment changed.",
    };
  }

  //--------------------------------------------------
  // Count modified rubric criteria
  //--------------------------------------------------

  const keys = Object.keys(
    original.rubric
  );

  const modified = keys.filter(
    (k) =>
      changed(
        (original.rubric as any)[k],
        (manipulated.rubric as any)[k]
      )
  );

  if (modified.length !== 1) {
    return {
      valid: false,
      reason:
        "More than one rubric criterion changed.",
    };
  }

  if (modified[0] !== criterion) {
    return {
      valid: false,
      reason:
        "Unexpected rubric criterion changed.",
    };
  }

  //--------------------------------------------------
  // Deterministic checks
  //--------------------------------------------------

  const before =
    (original.rubric as any)[criterion];

  const after =
    (manipulated.rubric as any)[criterion];

  //--------------------------------------
  // Misweighting
  //--------------------------------------

  if (
    wrongness === "misweighting"
  ) {

    if (
    before.status === after.status
) {
      return {
        valid: false,
        reason:
        "Criterion status did not change."
      };
    }

    if (
  before.evidence.trim().toLowerCase() !==
  after.evidence.trim().toLowerCase()
    ) {
      return {
        valid: false,
        reason:
          "Evidence changed during misweighting.",
      };
    }

    return {
      valid: true,
      reason:
         "Manipulation validated successfully.",
    };
  }



  //--------------------------------------
  // Selective Blindness
  //--------------------------------------

  const prompt = `
Compare two evaluations of the SAME rubric criterion.

Determine whether the manipulated version represents a valid case of Selective Blindness.

Selective Blindness means:

• one meaningful observation has been omitted

• no new participant evidence has been invented

• the remaining judgement is still internally consistent

Reject the manipulation if any new evidence appears.

Original

${JSON.stringify(before, null, 2)}

Manipulated

${JSON.stringify(after, null, 2)}

Return ONLY JSON.

{
    "valid": true,
    "reason": ""
}

  `;

  const completion =
    await client.chat.completions.create({

      model: MODEL,

      temperature: 0,

      response_format:{
        type:"json_object"
      },

      messages:[
        {
          role:"system",
          content:
          "Return JSON only."
        },
        {
          role:"user",
          content:prompt
        }
      ]
    });

 const raw =
  completion.choices[0].message.content;

if (!raw) {
  throw new Error(
    "Validation model returned an empty response."
  );
}

const result = JSON.parse(raw);

if (
  typeof result.valid !== "boolean" ||
  typeof result.reason !== "string"
) {
  throw new Error(
    "Validation model returned an invalid response."
  );
}

return result;

}