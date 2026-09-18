// services/evaluation/rubrics/intentRubric.ts

export const intentRubric = {
  taskRelevance: {
    definition:
      "Evaluates ONLY whether each part of the response stays on-topic " +
      "and relates to what the interview question asked — sentence by " +
      "sentence relevance. This is NOT about whether the SPECIFIC " +
      "objective of the question was accomplished (that is " +
      "goalFulfilment's job) — a response can stay entirely on-topic " +
      "while still failing to accomplish what the question was actually " +
      "testing for, and vice versa.",
    satisfied:
      "Every part of the response relates directly to what was asked, with no off-topic content.",
    partiallySatisfied:
      "Most of the response is on-topic, but it includes some unrelated content.",
    notSatisfied:
      "Significant parts of the response are unrelated to what was asked.",
  },

  goalFulfilment: {
    definition:
      "Evaluates ONLY whether the response accomplished the SPECIFIC " +
      "underlying purpose the question was testing for (e.g. for a " +
      "'mistake' question, the underlying purpose is showing the mistake " +
      "was genuinely corrected, not just described). This is NOT about " +
      "staying on-topic (taskRelevance's job), NOT about whether claims " +
      "were backed with detail (supportingEvidence's job), and NOT about " +
      "whether reasoning was explained (reasoning's job) — judge only " +
      "whether the underlying purpose was achieved, independent of how " +
      "well-supported or well-reasoned the response was.",
    satisfied:
      "The response accomplishes the specific underlying purpose the question was testing for.",
    partiallySatisfied:
      "The response partially accomplishes the underlying purpose but falls short in one clear way.",
    notSatisfied:
      "The response does not accomplish the underlying purpose the question was testing for.",
  },

  supportingEvidence: {
    definition:
      "Evaluates ONLY whether claims are backed by concrete, specific " +
      "details — names, numbers, examples, particular events. This is " +
      "NOT about whether the WHY behind actions is explained (that is " +
      "reasoning's job) — a response can be full of concrete specifics " +
      "while never explaining why any decision was made, and vice versa.",
    satisfied:
      "Claims are consistently backed by concrete, specific details.",
    partiallySatisfied:
      "Some claims are backed by specifics, others are stated without any concrete detail.",
    notSatisfied:
      "Claims are made with no concrete, specific detail anywhere.",
  },

  reasoning: {
    definition:
      "Evaluates ONLY whether the WHY behind actions or decisions is " +
      "explained — the motivation or justification, not the factual " +
      "specifics of what happened. This is NOT about whether concrete " +
      "detail is present (supportingEvidence's job) — a response can " +
      "explain its reasoning in general terms with zero concrete " +
      "specifics, and vice versa.",
    satisfied:
      "The reasoning behind actions or decisions is clearly explained throughout.",
    partiallySatisfied:
      "Reasoning is explained for some actions or decisions, but not others.",
    notSatisfied:
      "No reasoning or justification is given for any action or decision.",
  },
} as const;