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
- When judging "taskRelevance", evaluate ONLY whether the substance of what the
  participant said is on-topic and answers what was asked. Do NOT judge whether
  the answer was organised into clear segments, sequenced logically, or presented
  as a complete narrative structure — a response can be relevant even if poorly
  organised, and irrelevant even if well organised.
- It is acceptable and expected for a participant to receive a strong Intent evaluation but a weaker Structure evaluation, or vice versa.
-Evaluate Intent independently of Structure.
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

- feedback

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