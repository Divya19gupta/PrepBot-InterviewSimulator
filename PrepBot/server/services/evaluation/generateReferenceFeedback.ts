import { ReferenceEvaluation } from "./referenceEvaluationTypes";
import client, { MODEL } from "../openai";
import { validateNoLeakInFinalText } from "./validateManipulation";

function clean(text: string): string {
  return text.replace(/```/g, "").trim();
}

function buildSmoothingPrompt(
  sentences: string[],
  avoidFact: string | null,
  retryFeedback: string
): string {
  return `You are given 4 sentences. Each one is already finalized and correct — do not judge, verify, evaluate, or reconsider any of them.

Your ONLY task is smoothing: fix capitalization at sentence boundaries, vary the transition words so they don't repeat mechanically, and lightly merge sentences where it reads more naturally — but the specific fact and verdict in each sentence must still clearly appear in your output, unchanged in meaning.

Do NOT add any new observation, judgment, or claim.
Do NOT remove any observation.
Do NOT soften a negative sentence or inflate a positive one.
Do NOT imply a cause-and-effect relationship between sentences that wasn't already stated.
Do NOT reorder the sentences.
${
  avoidFact
    ? `\nCRITICAL — a piece of information was deliberately excluded from this evaluation as part of a research study. Under no circumstances may your output mention, restate, imply, or hint at the following, even indirectly or in different wording:\n\n${avoidFact}\n\nStay strictly within the 4 sentences given below. Do not draw on outside knowledge of the participant's answer to fill in what was left out.\n`
    : ""
}
${retryFeedback}

Sentences:
1. ${sentences[0]}
2. ${sentences[1]}
3. ${sentences[2]}
4. ${sentences[3]}

Return ONLY the smoothed paragraph, nothing else.`;
}

async function smooth(
  sentences: string[],
  avoidFact: string | null
): Promise<string> {

  let lastError: unknown;
  let retryFeedback = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {

      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You lightly smooth already-finalized sentences into flowing prose. You never judge, verify, or reconsider their content.",
          },
          {
            role: "user",
            content: buildSmoothingPrompt(sentences, avoidFact, retryFeedback),
          },
        ],
      });

      const feedback = completion.choices[0].message.content;
      if (!feedback) throw new Error("Empty feedback.");
      const cleaned = clean(feedback);

      // If this text isn't allowed to mention a specific hidden fact,
      // check it before returning — and retry with concrete feedback
      // if it slipped through, instead of giving up immediately.
      if (avoidFact) {
        const leakCheck = await validateNoLeakInFinalText(
          avoidFact,
          cleaned
        );

        if (!leakCheck.valid) {
          throw new Error(
            `Smoothed text revealed the excluded fact: ${leakCheck.reason}`
          );
        }
      }

      return cleaned;

    } catch (err) {
      lastError = err;
      console.warn(`Smoothing failed (Attempt ${attempt}/3)`, err);

      if (avoidFact && err instanceof Error && err.message.startsWith("Smoothed text revealed")) {
        retryFeedback = `\nYour previous attempt failed because: ${err.message}\nTry again — smooth the same 4 sentences, but this time make absolutely sure the excluded fact described above does not appear anywhere in your output, even implicitly.\n`;
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  console.error(lastError);
  throw new Error("Failed to smooth participant feedback without leaking the excluded fact.");
}

export async function generateReferenceFeedback(
  evaluation: ReferenceEvaluation,
  avoidFact: string | null = null
): Promise<string> {

  if (evaluation.evaluationLogic === "structure") {
    const r = evaluation.rubric;
    return smooth(
      [
        r.completeness.feedback,
        r.organization.feedback,
        r.development.feedback,
        r.coverage.feedback,
      ],
      avoidFact
    );
  }

  const r = evaluation.rubric;
  return smooth(
    [
      r.taskRelevance.feedback,
      r.supportingEvidence.feedback,
      r.reasoning.feedback,
      r.goalFulfilment.feedback,
    ],
    avoidFact
  );
}