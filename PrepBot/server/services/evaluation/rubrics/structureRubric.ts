// services/evaluation/rubrics/structureRubric.ts

export const structureRubric = {
  completeness: {
    definition:
      "Evaluates ONLY whether the response has the expected narrative " +
      "shape — a beginning (situation/context), a middle (actions taken), " +
      "and an end (outcome/result) — as distinct segments. This is about " +
      "the SHAPE of the story, not whether every sub-question in the " +
      "interview question was specifically answered (that is coverage's " +
      "job), and not the order or elaboration of the segments (that is " +
      "organization's and development's job).",
    satisfied:
      "The response has a clear beginning, middle, and end as distinct segments.",
    partiallySatisfied:
      "One of the three narrative segments (beginning, middle, or end) is missing or unclear.",
    notSatisfied:
      "Two or more of the three narrative segments are missing.",
  },

  organization: {
    definition:
      "Evaluates ONLY the ORDER in which ideas are presented — whether " +
      "the sequence is logical and transitions between ideas are clear. " +
      "This is NOT about whether any part is missing (that is " +
      "completeness's and coverage's job), and NOT about how much detail " +
      "each idea received (that is development's job). A response can be " +
      "perfectly ordered even if it is incomplete or undeveloped.",
    satisfied:
      "Ideas are presented in a clear, logical sequence with smooth transitions.",
    partiallySatisfied:
      "The sequence is mostly logical but contains some jumps or unclear transitions.",
    notSatisfied:
      "Ideas are presented out of order or without any clear transitions.",
  },

  development: {
    definition:
      "Evaluates ONLY how much elaboration or explanatory detail each " +
      "idea received — is it a bare mention or is it expanded on. This " +
      "is NOT about whether any part is missing (completeness/coverage's " +
      "job), and NOT about the order ideas appear in (organization's " +
      "job). A response can be well-developed even if poorly sequenced.",
    satisfied:
      "Ideas are expanded on with meaningful explanatory detail, not just named.",
    partiallySatisfied:
      "Some ideas are expanded on, others are only briefly named.",
    notSatisfied:
      "Ideas are only briefly named with no expansion or explanation.",
  },

  coverage: {
    definition:
      "Evaluates ONLY whether every distinct sub-question the INTERVIEW " +
      "QUESTION explicitly asked for was specifically answered — treat " +
      "the interview question as a checklist of sub-parts (e.g. 'what " +
      "happened', 'how did you handle it', 'what was the outcome' are " +
      "three separate sub-parts). This is NOT about narrative shape " +
      "(completeness's job) — a response can have a complete " +
      "beginning/middle/end shape while still skipping one of the " +
      "specific sub-questions asked, and vice versa.",
    satisfied:
      "Every distinct sub-question the interview question asked for was specifically answered.",
    partiallySatisfied:
      "Most sub-questions were answered, but at least one was skipped or unanswered.",
    notSatisfied:
      "Most of the sub-questions the interview question asked for were not answered.",
  },
} as const;