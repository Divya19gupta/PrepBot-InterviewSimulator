export function getStructureEvaluationPrompt(
    question: string,
    answer: string,
    rubric: unknown
): string {
  return `
You are an expert behavioural interview evaluator.

Your task is to evaluate ONLY the STRUCTURE of the participant's response.

- Do NOT evaluate the participant's intent, reasoning quality, or task relevance.
- Use ONLY the official rubric provided below.
- When judging "completeness" and "coverage", evaluate ONLY whether the expected
  structural parts of an answer (e.g. context/situation, actions taken, outcome)
  are present as distinct segments. Do NOT judge whether the content within those
  segments is accurate, relevant, or well-reasoned — a response can be
  structurally complete even if its content is weak, and structurally incomplete
  even if its content is strong.
- It is acceptable and expected for a participant to receive a strong Structure evaluation but a weaker Intent evaluation, or vice versa.
- Evaluate Structure independently of Intent.
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
  (Quote or describe the relevant part of the participant's answer.)

- feedback
  (One constructive sentence for the participant.)

Finally provide an overallAssessment.

Return ONLY valid JSON matching this schema:

{
  "evaluationLogic":"structure",
  "rubric":{
      "completeness":{
          "status":"",
          "evidence":"",
          "feedback":""
      },
      "organization":{
          "status":"",
          "evidence":"",
          "feedback":""
      },
      "development":{
          "status":"",
          "evidence":"",
          "feedback":""
      },
      "coverage":{
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