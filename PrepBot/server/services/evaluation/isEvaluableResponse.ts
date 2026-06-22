import client, { MODEL } from "../openai";
import { structureRubric } from "./rubrics/structureRubric";
import { intentRubric } from "./rubrics/intentRubric";

interface EvaluableResponse {
  evaluable: boolean;
}

export async function isEvaluableResponse(
  question: string,
  answer: string,
  evaluationLogic:  "structure" | "intent"
): Promise<boolean> {

  const rubric =
    evaluationLogic === "structure"
      ? structureRubric
      : intentRubric;

  const prompt = `
You are screening a behavioural interview response before it is evaluated.

Your task is NOT to judge response quality.

Your task is ONLY to determine whether the participant's response contains sufficient observable evidence to evaluate at least ONE criterion from the assigned rubric.

--------------------------------------------------
Assigned Evaluation Logic
--------------------------------------------------

${evaluationLogic}

--------------------------------------------------
Assigned Rubric
--------------------------------------------------

${JSON.stringify(rubric, null, 2)}

--------------------------------------------------
Behavioural Interview Question
--------------------------------------------------

${question}

--------------------------------------------------
Participant Response
--------------------------------------------------

${answer}

--------------------------------------------------
Decision Rules
--------------------------------------------------

A response IS evaluable if:

• It attempts to answer the interview question.

• At least one rubric criterion can be evaluated using observable evidence from the participant's response.

• The participant provides observable information, even if the answer is incomplete.

• The response may contain:
  - hesitation
  - filler words
  - grammatical mistakes
  - disorganized structure

provided there is still evaluable content.

--------------------------------------------

A response is NOT evaluable if:

• It does not attempt to answer the question.

• It is unrelated to the question.

• It consists almost entirely of filler text.

• It contains virtually no observable information that can be evaluated against the assigned rubric.

--------------------------------------------

Examples

Question:
Describe a mistake you made.

Response:
"I forgot to merge my branch before deployment and the build failed."

Result

{
  "evaluable": true
}

--------------------------------------------

Question:
Describe a mistake you made.

Response:
"I don't know... um... next question."

Result

{
  "evaluable": false
}

--------------------------------------------

Question:
Describe a project.

Response:
"Blue elephant pizza yesterday."

Result

{
  "evaluable": false
}

--------------------------------------------

Return ONLY valid JSON.

{
  "evaluable": true
}
`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      const completion =
        await client.chat.completions.create({

          model: MODEL,

          temperature: 0,

          response_format: {
            type: "json_object",
          },

          messages: [

            {
              role: "system",
              content:
                "You determine whether a behavioural interview response contains sufficient observable evidence to evaluate at least one rubric criterion. Return only valid JSON.",
            },

            {
              role: "user",
              content: prompt,
            },
          ],
        });

      const raw =
        completion.choices[0].message.content;

      if (!raw) {
        throw new Error("Empty response.");
      }

     const parsed = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Invalid JSON returned.");
    }

      if (
        typeof parsed.evaluable !== "boolean"
      ) {
        throw new Error(
          "Invalid JSON returned."
        );
      }

      return parsed.evaluable;

    } catch (err) {

      lastError = err;

      console.warn(
        `Evaluability check failed (Attempt ${attempt}/3)`
      );

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(resolve, 500)
        );
      }
    }
  }

  console.error(lastError);

  throw new Error(
    "Failed to determine response evaluability."
  );
}