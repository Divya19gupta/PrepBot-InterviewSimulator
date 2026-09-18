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

// --------------------------------------------------
// Contradiction check against ALL other criteria
// --------------------------------------------------
// Previously this only compared the manipulated sentence against its
// one "twin" criterion. But the final participant-facing paragraph
// stitches together all 4 criteria's sentences — so the manipulated
// sentence needs to read as consistent with ALL three others, not
// just its twin. This is the same underlying idea as NLI-based
// contradiction detection used for checking consistency in AI-written
// text (e.g. SummaC, Laban et al. 2022) — here using the LLM itself
// as the judge, same pattern as the rest of this validator.

async function checkNoContradictionWithOthers(
  afterFeedback: string,
  otherCriteria: Record<string, any>
): Promise<ValidationResult> {

  const otherSentences = Object.entries(otherCriteria)
    .map(([name, c]: [string, any]) => `- ${name}: ${c.feedback}`)
    .join("\n");

  const prompt = `
Does the sentence below directly contradict any of the other sentences listed underneath it? A contradiction means both statements cannot be true about the same response at the same time — for example, one says something was clearly present or well done, and another says the same thing was clearly missing or poorly done.

Minor differences in emphasis or tone are NOT contradictions. Only flag a genuine logical conflict.

IMPORTANT NUANCE — order/detail/content vs. narrative presence: a sentence about "organization" describing a sequence or flow (e.g. "ideas move from the situation, to the action, to the result") is describing the ORDER of whatever content exists — it is NOT confirming every part is present. A sentence about "development" describing elaboration (e.g. "meaningful explanatory detail is provided, going beyond just naming ideas") is describing the DEPTH of whatever content exists — also not confirming every narrative segment is present. A sentence about "coverage" stating that sub-questions were addressed (e.g. "answered what happened, how it was realized, and what was changed") is describing whether specific CONTENT POINTS were touched on — this is also NOT the same as confirming a distinct narrative SEGMENT (a separate beginning/middle/end as a storytelling structure) exists for each one. Someone can briefly address several sub-questions within one run-on passage without that forming a distinct, separate "ending" as its own narrative beat. A completeness claim that a specific segment is thin, brief, or entirely missing as a distinct narrative unit does NOT automatically contradict an organization, development, or coverage sentence like these, UNLESS that sentence goes further and explicitly states the specific missing/thin segment is well-developed, clearly separated, or thorough as its own distinct part. Order, depth, content-coverage, and narrative-segment-presence are four genuinely separate rubric dimensions by design — a sentence about one does not automatically confirm the others, even when it happens to reference "each part" or name the stages in passing.

Sentence to check:
${afterFeedback}

Other sentences from the same evaluation:
${otherSentences}

If it does NOT contradict any of them — say valid: true.
If it DOES contradict one or more — say valid: false, and name which criterion it contradicts and why in the reason.

Return ONLY JSON: { "valid": true, "reason": "" }
  `;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return JSON only." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0].message.content;
  if (!raw) throw new Error("Contradiction check returned empty response.");

  return JSON.parse(raw);
}
// --------------------------------------------------
// Misweighting defensibility check
// --------------------------------------------------
// A status change alone doesn't guarantee a genuine error. The
// check is anchored against the REFERENCE evaluation's own
// confidence, not an abstract "could someone argue for this in
// isolation" question — that framing rejected almost everything,
// since any middle status can always be argued for in isolation.
// The real signal: was the reference's original judgment already
// confident, or did it already hedge/express uncertainty? Only a
// genuinely uncertain original judgment makes the new status
// defensible; a confident original judgment being contradicted
// on unchanged evidence is the actual error we want to detect.

async function checkStatusIsIndefensible(
  evidence: string,
  originalStatus: string,
  originalFeedback: string,
  newStatus: string,
  newFeedback: string
): Promise<ValidationResult> {

  const prompt = `
A careful evaluation was already performed on this evidence, and it determined the status was "${originalStatus}", explained as:
${originalFeedback}

Evidence:
${evidence}

A DIFFERENT status, "${newStatus}", is now being proposed for this SAME unchanged evidence, explained as:
${newFeedback}

Your only job: read the ORIGINAL explanation above. Does it sound like a confident, settled judgment — or does it already hedge, express uncertainty, or acknowledge the call could reasonably go either way (using words like "borderline," "somewhat," "could arguably," "it's unclear whether," or similar)?

If the ORIGINAL explanation sounds confident and settled — the new status contradicts an already-confident correct judgment, and this IS a genuine error. Say valid: true.

Only if the ORIGINAL explanation itself already sounds uncertain or hedging about its own verdict — meaning the case was already borderline BEFORE any manipulation — say valid: false, and quote the specific hedging language from the original explanation in your reason.

Do NOT reject just because someone could theoretically construct an argument for the new status in isolation — nearly any status can be argued for in isolation. Only reject based on whether the ORIGINAL explanation itself was already uncertain.

Return ONLY JSON: { "valid": true, "reason": "" }
  `;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return JSON only." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0].message.content;
  if (!raw) throw new Error("Defensibility check returned empty response.");

  return JSON.parse(raw);
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

  const before =
    (original.rubric as any)[criterion];

  const after =
    (manipulated.rubric as any)[criterion];

  const otherCriteria = Object.fromEntries(
    Object.entries(original.rubric as any).filter(
      ([key]) => key !== criterion
    )
  );

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

    if (before.feedback.trim() === after.feedback.trim()) {
      return {
        valid: false,
        reason: "Feedback sentence did not change to reflect new status.",
      };
    }

    const [defensibilityCheck, contradictionCheck] = await Promise.all([
      checkStatusIsIndefensible(
        before.evidence,
        before.status,
        before.feedback,
        after.status,
        after.feedback
      ),
      checkNoContradictionWithOthers(
        after.feedback,
        otherCriteria
      ),
    ]);

    if (!defensibilityCheck.valid) {
      return defensibilityCheck;
    }

    if (!contradictionCheck.valid) {
      return contradictionCheck;
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

- one meaningful observation has been omitted

- no new participant evidence has been invented

- the remaining judgement is still internally consistent

Reject the manipulation if any new evidence appears.

IMPORTANT EXCEPTION: if the original evidence contained only ONE observation total, deleting it would leave the evidence field empty, which isn't allowed. In that specific case, a valid manipulation may REPLACE the evidence with a brief, neutral, non-specific statement that the relevant point was not addressed (e.g. "did not provide a specific explanation of X"). This is NOT inventing new evidence about what the participant said — it's a placeholder acknowledging the removed observation is gone, and should be ACCEPTED as valid, not rejected. Only reject this pattern if the replacement makes a specific new factual claim about the participant's answer beyond a generic "this was not addressed" statement.

Original

${JSON.stringify(before, null, 2)}

Manipulated

${JSON.stringify(after, null, 2)}

Other criteria in this same evaluation (for checking leakage)

${JSON.stringify(otherCriteria, null, 2)}

Additionally, REJECT if the fact removed from the target criterion is still clearly present, even in different wording, in any of the other criteria's evidence shown above — that would let the hidden fact leak back to the participant through another part of the feedback.

Return ONLY JSON.

{
    "valid": true,
    "reason": ""
}

  `;

  const [completion, contradictionCheck] =
    await Promise.all([
      client.chat.completions.create({

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
      }),
      checkNoContradictionWithOthers(
        after.feedback,
        otherCriteria
      ),
    ]);

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

// Check the main Selective Blindness result first — if that already
// failed, report that reason rather than the contradiction check's,
// since it's the more fundamental issue.
if (!result.valid) {
  return result;
}

if (!contradictionCheck.valid) {
  return contradictionCheck;
}

return result;

}

// --------------------------------------------------
// Final-text leak check
// --------------------------------------------------
// The earlier Selective Blindness check above compares the manipulated
// evaluation's OTHER criteria against the deleted fact — but that runs
// BEFORE the smoothing step (generateReferenceFeedback) that produces
// the actual final paragraph the participant reads. Smoothing is only
// supposed to rephrase, not add content, but it's still an LLM step,
// so we re-check the real final text as a safety net rather than
// trusting that nothing could have slipped in during smoothing.
//
// "explanation" here is the human-readable description already
// returned by manipulateEvaluation() — it names the specific fact
// that was hidden, so we reuse it directly instead of re-deriving it.

export async function validateNoLeakInFinalText(
  explanation: string,
  finalText: string
): Promise<ValidationResult> {

  const prompt = `
A fact was deliberately hidden from an AI evaluation as part of a research study. Here is a description of what was hidden and why:

${explanation}

Here is the final paragraph that will be shown to the participant:

${finalText}

Does this final paragraph reveal, restate, or clearly imply the hidden fact described above — even indirectly, in different wording?

Return ONLY JSON: { "valid": true, "reason": "" } if the fact is NOT revealed (this is the desired outcome).
Return { "valid": false, "reason": "" } if the fact IS revealed anywhere in the paragraph.
  `;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return JSON only." },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0].message.content;
  if (!raw) throw new Error("Final leak check returned empty response.");

  return JSON.parse(raw);
}