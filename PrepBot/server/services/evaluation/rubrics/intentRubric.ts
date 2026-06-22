// services/evaluation/rubrics/intentRubric.ts

export const intentRubric = {
  taskRelevance: {
    definition:
      "Evaluates whether the participant's response directly addresses the interview question.",

    satisfied:
      "The response remains focused on the requested task throughout.",

    partiallySatisfied:
      "The response is generally relevant but includes unrelated or missing content.",

    notSatisfied:
      "The response does not adequately address the interview question."
  },

  supportingEvidence: {
    definition:
      "Evaluates whether the participant supports their statements with concrete examples, experiences, or details.",

    satisfied:
      "Claims are consistently supported with relevant examples or experiences.",

    partiallySatisfied:
      "Some claims are supported, while others lack sufficient evidence.",

    notSatisfied:
      "Claims are made without meaningful supporting evidence."
  },

  reasoning: {
    definition:
      "Evaluates whether the participant explains why actions, decisions, or conclusions were made.",

    satisfied:
      "Reasoning is clear, logical, and consistently justified.",

    partiallySatisfied:
      "Some reasoning is provided but important explanations are missing.",

    notSatisfied:
      "Little or no reasoning is provided."
  },

  goalFulfilment: {
    definition:
      "Evaluates the extent to which the participant accomplishes the objective of the interview question.",

    satisfied:
      "The response fully achieves the purpose of the interview question.",

    partiallySatisfied:
      "The response partially achieves the intended objective but misses important elements.",

    notSatisfied:
      "The response does not achieve the objective of the interview question."
  }
} as const;