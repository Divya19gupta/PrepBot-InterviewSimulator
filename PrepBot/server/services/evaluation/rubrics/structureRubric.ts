// services/evaluation/rubrics/structureRubric.ts

export const structureRubric = {
  completeness: {
    definition:
      "Evaluates whether all major parts requested by the interview question are addressed.",

    satisfied:
      "All major parts requested in the question are addressed.",

    partiallySatisfied:
      "Most major parts are addressed, but one or more important parts are missing.",

    notSatisfied:
      "Several important parts requested in the question are missing."
  },

  organization: {
    definition:
      "Evaluates whether the response follows a logical and coherent sequence.",

    satisfied:
      "Ideas are presented in a clear, logical order.",

    partiallySatisfied:
      "The overall flow is understandable but contains some jumps or inconsistencies.",

    notSatisfied:
      "The response lacks a logical structure and is difficult to follow."
  },

  development: {
    definition:
      "Evaluates whether ideas are sufficiently explained and elaborated.",

    satisfied:
      "Ideas are developed with enough explanation and detail.",

    partiallySatisfied:
      "Some ideas are explained, but important details are missing.",

    notSatisfied:
      "Ideas are only briefly mentioned with little explanation."
  },

  coverage: {
    definition:
      "Evaluates whether the response covers the full scope of the interview question.",

    satisfied:
      "The response addresses all important aspects of the question.",

    partiallySatisfied:
      "The response covers most aspects but omits at least one important area.",

    notSatisfied:
      "The response addresses only a small portion of what was requested."
  }
} as const;