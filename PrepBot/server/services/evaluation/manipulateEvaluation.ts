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

import { validateManipulation } from "./validateManipulation";

function clean(
  text: string
): string {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

// --------------------------------------------------
// Enum normalization
// --------------------------------------------------
// The LLM occasionally drops the space in status enums,
// e.g. returning "PartiallySatisfied" instead of
// "Partially Satisfied". Zod then rejects the whole
// payload with an invalid_enum_value error even though
// the rest of the object is fine. Normalize known
// variants before validation so this doesn't burn a
// retry attempt unnecessarily.

function normalizeStatus(
  value: unknown
): unknown {

  if (typeof value !== "string") return value;

  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

  switch (normalized) {

    case "satisfied":
      return "Satisfied";

    case "partiallysatisfied":
      return "Partially Satisfied";

    case "notsatisfied":
      return "Not Satisfied";

    default:
      return value;
  }
}

function normalizeEvaluation(
  evaluationJson: any
): any {
  if (!evaluationJson?.rubric) return evaluationJson;

  for (const key of Object.keys(evaluationJson.rubric)) {
    const criterionObj = evaluationJson.rubric[key];
    if (criterionObj && "status" in criterionObj) {
      criterionObj.status = normalizeStatus(
        criterionObj.status
      );
    }
  }

  return evaluationJson;
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

  let lastError: unknown;
  let retryFeedback = "";

  for (
    let attempt = 1;
    attempt <= 5;
    attempt++
  ) {
    try {

      const prompt = `
  You are modifying an already-completed behavioural interview evaluation.

${retryFeedback}

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

- Modify ONLY the assigned criterion.

Leave every rubric criterion except the assigned criterion byte-for-byte identical.

Do not modify:

- any other criterion
- evaluationLogic
- overallAssessment

Changing more than one criterion will invalidate the experiment.

- Never change evaluationLogic.

- Never change overallAssessment.

- Never invent participant evidence.

- Preserve valid JSON.

- The manipulated evaluation must remain plausible.

- The resulting participant-facing feedback should resemble the kind of subtle mistake a real AI evaluator could make.

- Do not create obvious contradictions or unrealistic errors.

--------------------------------------------------

--------------------------------------------------

If manipulation type is Selective Blindness

You must perform a MECHANICAL text operation, not a creative rewrite.

Step 1 — Copy the exact "evidence" string from the Reference Evaluation for this criterion, word for word.

Step 1.5 — Before choosing what to delete, check the evidence of the OTHER criteria in the Reference Evaluation below. If the fact you're considering deleting is also described, even partially, in another criterion's evidence, do NOT delete it — the participant would still see it there. Choose a different observation that appears ONLY in this criterion's evidence, not anywhere else in the evaluation.

Step 2 — Identify ONE self-contained observation within that evidence (a clause, phrase, or sentence describing something specific the participant said or did).

Step 2.5 — Check: does this evidence field contain ONLY that one observation, with nothing else alongside it? If so, deleting it outright would leave an empty string, which is not allowed — evidence must never be empty. In that specific case, instead of deleting the observation, REPLACE it with a brief, genuinely truthful but non-specific restatement that no longer supports the original status — for example, if the evidence was "explained that automated tests catch regressions before release," a valid replacement might be "did not provide a specific explanation of the reasoning." Do not invent a new fact — only remove the specific supporting detail while leaving a short, honest, non-empty placeholder in its place. If the evidence contains multiple observations, skip this step and proceed normally with Step 3.

Step 3 — Produce the new "evidence" field by deleting ONLY that one observation from the copied string (or applying the Step 2.5 replacement if that case applies). Every remaining observation must preserve its original wording and meaning. Do not rewrite, strengthen, weaken, summarize, or paraphrase the remaining observations — literally delete the one observation and leave everything else untouched.

Step 4 — Only after Step 3, decide whether "status" should change. Downgrade status ONLY as far as the remaining (post-deletion) evidence justifies, and no further.

Step 5 — Rewrite ONLY the feedback for the assigned criterion.
 - The feedback must be generated using ONLY the remaining evidence after Step 3.
 - Do not mention any deleted observation.
 - Do not introduce any new criticism.
 - Do not infer weaknesses that are not supported by the remaining evidence.
 - State the resulting feedback CONFIDENTLY and DIRECTLY, as though the
   remaining evidence tells the complete story — do not hedge with words
   like "some," "partially," or "while." The remaining evidence is real,
   so there's no need to soften how it's presented; a confident, direct
   critique based on real remaining evidence is still fully honest, just
   not artificially cushioned.

If the remaining evidence still supports a positive statement, keep it.
FORBIDDEN — outputs matching either of these will always be rejected downstream:
  - Changing only "status" while leaving "evidence" identical to the original (that is Misweighting, not Selective Blindness — do not do this here)
  - Adding any new observation, judgment, or claim to "evidence" or "feedback" that was not in the original evaluation and does not follow strictly from removing one observation
  - Removing only adjectives or individual words while keeping the same observation. One complete observation must disappear.
  - Deleting an observation whose fact is still present in another, untouched criterion's evidence in the same evaluation — this creates a contradiction the participant would notice.
Explanation requirements:

- Do NOT simply say that an observation was removed.

- Explain what information the participant provided.

- Explain how the original evaluation used that information.

- Explain what specific information was ignored.

- Explain why ignoring it makes the manipulated evaluation incorrect.

- The explanation must explicitly connect the ignored observation to the resulting feedback error.

- Do not stop at describing what was ignored.

- Explain how ignoring that information caused the participant to receive feedback that was less accurate than the original evaluation.

Example:

"The participant explained that they consulted their supervisor after discovering a mistake. The original evaluation used this as evidence of corrective action and problem-solving. The manipulated evaluation ignored this information and evaluated the response as though the corrective actions had not been described."

--------------------------------------------------

If manipulation type is Misweighting

- Keep evidence identical.

- Rewrite ONLY this criterion's "feedback" sentence to match the new
  status — if upgrading (e.g. Partially Satisfied → Satisfied), the
  sentence should read as praise, not a suggestion. If downgrading
  (e.g. Satisfied → Not Satisfied), it should read as a critique. The
  evidence stays factual and unchanged; only the verdict/tone of the
  feedback sentence shifts.

- Change the criterion status.

- The rewritten feedback sentence may change TONE and VERDICT only.
  It must not introduce any specific claim, detail, or fact that
  is not already present in the unchanged evidence field. If you
  cannot write a positive-sounding sentence using only the existing
  evidence, use a more general positive statement instead of inventing
  a new specific detail.
-  When upgrading OR downgrading a status, state your claim CONFIDENTLY and DIRECTLY —
  do not hedge with words like "some," "somewhat," or "while." A
  participant reading carefully should be able to compare your claim
  against what they actually said and clearly catch the mismatch if they
  look closely — a vague, softened claim is harder to fairly evaluate as
  right or wrong, and defeats the purpose of the manipulation. State the
  claim as if it were simply true, using only what's really there —
  you're changing the CONFIDENCE of the claim, not inventing new facts.

- CRITICAL — genuine error vs. stricter grading: the new status must
  contradict a CONFIDENT original judgment, not merely disagree with
  a borderline one. Look at the ORIGINAL evaluation's own feedback
  sentence for this criterion (in the Reference Evaluation below).
  These are different things:

  NOT a valid manipulation (too weak): the ORIGINAL feedback sentence
  itself already hedges or expresses uncertainty about this criterion
  (words like "somewhat," "borderline," "could be clearer," "partially,"
  or similar). If the original judgment was already uncertain, changing
  the status is just grading variation, not an error, and downstream
  validation will reject it.

  A valid manipulation: the ORIGINAL feedback sentence states its
  judgment confidently and directly, with no hedging — and the new
  status contradicts that confident, settled judgment on the SAME
  unchanged evidence. A careful evaluator would recognize this as a
  real mistake, not a different reasonable opinion.

  Test before choosing: re-read the ORIGINAL feedback sentence for
  this criterion. Does it sound confident and settled, or does it
  already hedge? If it already hedges, this criterion is not a safe
  target for Misweighting — pick a different observation within the
  evidence, or expect this to be rejected. If it sounds confident,
  contradicting it is valid.

  Prefer the SMALLEST status shift (e.g. Satisfied → Partially Satisfied)
  that still passes this test, to keep the manipulation subtle. Only use
  a larger shift (e.g. Satisfied → Not Satisfied) if the evidence is so
  clear-cut that even the smallest shift would still obviously be a
  genuine, indefensible error — never choose a larger shift just to make
  the error more obvious.

  Example of too weak (reject this kind of reasoning): the original
  feedback sentence itself says something like "mentioned reworking the
  approach, though didn't specify what changed" — this already hedges,
  so downgrading its status further is not a valid, confident-contradicting
  error.

  Example of valid: the original feedback sentence says something like
  "clearly named the three tools used and explained how each was
  applied" — this is confident and unhedged, so downgrading this status
  is a genuine, indefensible error, because the evidence leaves no
  reasonable room for that lower score.

Explanation requirements:

- Do NOT simply say that the status changed.

- Explain what evidence was present.

- Explain why the original evaluation assigned its rating.

- Explain why the manipulated rating no longer matches the evidence.

- The explanation must explicitly connect the incorrect criterion rating to the participant's actual answer.

- Describe what information was missing or present in the answer and explain why the manipulated rating no longer reflects the evidence.

- Focus on why the participant would receive an unfair evaluation.

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

- what the participant actually said

- what information was present or missing in the answer

- what the original evaluation correctly recognised

- what information was ignored (Selective Blindness) OR incorrectly weighted (Misweighting)

- how this changed the resulting participant-facing feedback

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
Contradiction check against the other 3 criteria
--------------------------------------------------

Before finalizing, re-read the "feedback" sentences for the OTHER THREE criteria in the Reference Evaluation section above (the ones you are NOT changing). Compare your new feedback sentence for the assigned criterion against each of them.

A contradiction means both sentences cannot be true about the same response at the same time — for example, your new sentence claims something was clearly missing or poorly done, while another criterion's sentence claims that same thing was clearly present or well done.

If your new sentence would directly contradict any of the other three:
- First, try a different observation to remove (Selective Blindness) or a smaller status shift (Misweighting) that avoids the conflict, while still satisfying the manipulation type's requirements above.
- If every option you can construct still creates a genuine contradiction with at least one of the other three, this specific criterion may not have enough independent, non-overlapping content in this participant's answer to support a clean manipulation. In that case, do not force it — return the manipulation with the LEAST-severe unavoidable contradiction rather than the most severe one, since a downstream check will catch this, and the whole trial (both Structure and Intent) will fall back to reference feedback together rather than risk showing the participant a paragraph that visibly disagrees with itself.

Normal differences in tone (one criterion being more positive than another) are NOT contradictions — only flag genuine factual conflicts.

Before returning your answer, verify:

✓ Exactly one observation has been removed.

✓ The evidence is shorter than the original.

✓ No remaining observation has been rewritten.

✓ No new observation has been added.

✓ No new criticism has been introduced.

✓ Only the assigned criterion has changed.

✓ The new feedback sentence does not directly contradict any of the other three criteria's feedback sentences.

If any of the above are false, correct the manipulation before returning the JSON.
--------------------------------------------------


Return ONLY JSON

{
  "evaluation": { ... },

  "explanation":
  "Researcher-facing explanation describing what the participant said, what was ignored or misweighted, why the manipulated evaluation became incorrect, and how this changed the resulting feedback."
}
  `;

      const completion =
        await client.chat.completions.create({

          model: MODEL,

          temperature: 0.1,

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

    // Normalize known enum-casing drift (e.g. "PartiallySatisfied"
    // -> "Partially Satisfied") before schema validation, so this
    // class of error doesn't waste a retry attempt.
    const evaluationJson =
    normalizeEvaluation(parsed.evaluation);

    
    const validated: ReferenceEvaluation =
  evaluation.evaluationLogic === "structure"
    ? StructureEvaluationSchema.parse(evaluationJson)
    : IntentEvaluationSchema.parse(evaluationJson);

// Force original evidence — don't trust LLM to copy it exactly
if (wrongness === "misweighting") {
(validated.rubric as any)[criterion].evidence =
  (evaluation.rubric as any)[criterion].evidence;
}

    // --------------------------------------------------
    // Semantic validation (moved in from evaluate.js route)
    // --------------------------------------------------
    // Previously, validateManipulation() was called separately
    // in the route AFTER manipulateEvaluation() had already
    // returned successfully. A semantic failure there (e.g.
    // "Selective Blindness requires omission of a meaningful
    // observation, which is not present here") threw immediately
    // with zero retries, killing the whole request with a 500.
    //
    // Now it's checked here, inside the same retry loop as the
    // JSON/schema validation, so a semantic rejection just causes
    // another generation attempt like any other validation failure.

    const semanticCheck =
      await validateManipulation(
        evaluation,
        validated,
        criterion,
        wrongness
      );

    if (!semanticCheck.valid) {
      throw new Error(
        `Semantic validation failed: ${semanticCheck.reason}`
      );
    }

return {
  evaluation: validated,
  explanation: parsed.explanation,
};

    } catch (err) {

      lastError = err;

      const message = err instanceof Error ? err.message : String(err);

      // Generic instruction alone wasn't enough — the model was
      // repeating nearly the same rejected attempt 5 times instead
      // of genuinely changing approach. Give type-specific strategic
      // guidance based on what actually failed.

      if (/defensib|reasonable evaluator could/i.test(message)) {
        // Defensibility rejection: the status shift was too small/
        // arguable. Tell it explicitly to escalate, not just retry.
        retryFeedback = `IMPORTANT — YOUR PREVIOUS ATTEMPT WAS REJECTED AS TOO WEAK: "${message}"

This means the status shift you chose is still arguably defensible — a reasonable evaluator could agree with it. Do NOT just re-argue the same status with different wording. Instead, this time:
- If you tried a one-level shift (e.g. Satisfied → Partially Satisfied), escalate to a two-level shift (e.g. Satisfied → Not Satisfied) instead, since a bigger, starker jump is much harder to defend as reasonable.
- If escalating the status still isn't possible, reconsider whether a different specific observation within the same evidence would produce a clearer, more indefensible error.
Make a genuinely different choice this time, not the same one restated.`;

      } else if (/too_small|at least 1 character/i.test(message)) {
        // Schema failure: evidence became empty after removing the
        // one observation present. Thin answers sometimes only have
        // one thing to point to — removing it leaves nothing.
        retryFeedback = `IMPORTANT — YOUR PREVIOUS ATTEMPT WAS REJECTED: the evidence field ended up empty after your edit, which isn't allowed.

The original evidence for this criterion is short — it may only contain one real observation. Do NOT delete it down to nothing. Instead, either lightly rephrase the evidence so it still reads as a real (shorter) sentence while omitting the key detail, or choose a smaller, more specific detail to remove rather than the whole observation. Evidence must never be empty.`;

      } else if (/contradict/i.test(message)) {
        retryFeedback = `IMPORTANT — YOUR PREVIOUS ATTEMPT WAS REJECTED FOR CONTRADICTING ANOTHER CRITERION: "${message}"

Do not just reword the same claim — that will be rejected again for the same reason. The likely cause: claiming a narrative segment (beginning/middle/end) or sub-question is COMPLETELY ABSENT, when another criterion already describes the response as having clear structure or covering everything. A claim of total absence directly conflicts with a claim of presence elsewhere — no rewording fixes that combination.

Do NOT simply substitute a different pre-set claim (like "underdeveloped") unless it is actually true of THIS evidence — a false substitute claim is just as invalid as the one that was rejected. Instead, go back to the actual evidence and find a genuinely different, narrower, and still-accurate detail to target — something the evidence really does support, that doesn't assert an outright absence contradicting what another criterion already states.`;

      } else {
        retryFeedback = `IMPORTANT — YOUR PREVIOUS ATTEMPT WAS REJECTED: "${message}". Do not repeat this mistake. Fix specifically this issue in your next attempt.`;
      }

      console.warn(
        `Manipulation failed (Attempt ${attempt}/5)`,
        message
      );

      if (attempt < 5) {
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