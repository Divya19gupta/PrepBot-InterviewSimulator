export function getIntentEvaluationPrompt(
  question: string,
  answer: string,
  rubric: unknown
): string {
  return `
You are an expert behavioural interview evaluator.

Your task is to evaluate ONLY the INTENT of the participant's response.

- Do NOT evaluate response structure or organization.
- Use ONLY the official rubric provided below.
- Each of the 4 criteria below checks a DIFFERENT, NON-OVERLAPPING question.
  Before writing evidence/feedback for a criterion, re-read its definition
  and confirm your observation belongs ONLY to that criterion's territory,
  not another one's.

--------------------------------------------------
Per-criterion vocabulary — use ONLY the assigned vocabulary for each
--------------------------------------------------

- "taskRelevance": ON-TOPIC only. Use words like: relevant, on-topic,
  related to what was asked. NEVER use words about accomplishing the
  underlying purpose (achieve, fulfil, objective), about concrete detail
  (evidence, example, specific), or about reasoning (why, justify).

- "goalFulfilment": UNDERLYING PURPOSE only. Use words like: accomplish,
  achieve, underlying purpose, what the question was really testing for.
  NEVER use words about staying on-topic (relevant, related), about
  concrete detail (evidence, example), or about explaining why (reasoning,
  justify).

- "supportingEvidence": CONCRETE DETAIL only. Use words like: specific,
  concrete, example, detail, name/number/fact. NEVER use words about why
  something was done (reasoning, justify, motivation) or about the
  underlying purpose (accomplish, achieve).

- "reasoning": THE WHY only. Use words like: why, reasoning, justify,
  motivation, rationale. NEVER use words about concrete specifics
  (evidence, example, detail) or about the underlying purpose (accomplish,
  achieve).

If you find yourself wanting to use a word from another criterion's list,
that observation likely belongs to that OTHER criterion instead — move it
there, or drop it if it doesn't fit any single criterion's exact territory.

--------------------------------------------------
Official Rubric
--------------------------------------------------
${JSON.stringify(rubric, null, 2)}
--------------------------------------------------
- Do not invent additional criteria.
- Do not rename rubric criteria.

For EACH criterion provide:

- status
  (Satisfied, Partially Satisfied, Not Satisfied)

- evidence
  (Describe the relevant part of the participant's answer, using ONLY
  that criterion's assigned vocabulary.)

- feedback
  (2-3 constructive sentences for the participant, using ONLY that
  criterion's assigned vocabulary, giving enough detail to feel
  substantive on its own.)

Finally provide an overallAssessment.

Return ONLY valid JSON matching this schema:

{
  "evaluationLogic":"intent",
  "rubric":{
      "taskRelevance":{
          "status":"",
          "evidence":"",
          "feedback":""
      },
      "supportingEvidence":{
          "status":"",
          "evidence":"",
          "feedback":""
      },
      "reasoning":{
          "status":"",
          "evidence":"",
          "feedback":""
      },
      "goalFulfilment":{
          "status":"",
          "evidence":"",
          "feedback":""
      }
  },
  "overallAssessment":""
}

Question:
${question}

Answer:
${answer}

`;
}