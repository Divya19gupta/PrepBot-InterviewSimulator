import { prisma } from "../../db";

import { EXPERIMENT_VERSION_MAP } from "./experimentVersions";

import {
  ErrorCondition,
  ErrorImplementation,
  QuestionCondition,
  UncertaintyCondition,
} from "./experimentTypes";

import {
  StructureCriterion,
  IntentCriterion,
} from "./referenceEvaluationTypes";

export interface ExperimentCondition extends QuestionCondition {
  error: ErrorCondition;

  uncertainty: UncertaintyCondition;

  wrongnessImplementation: ErrorImplementation;

  /**
   * Only present when the question is assigned
   * to the Wrong condition.
   */
  structureCriterion?: StructureCriterion;

  /**
   * Only present when the question is assigned
   * to the Wrong condition.
   */
  intentCriterion?: IntentCriterion;
}

export async function getExperimentCondition(
  sessionId: string,
  questionIndex: number
): Promise<ExperimentCondition> {
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },

    select: {
      experimentVersion: true,

      wrongnessImplementation: true,

      structureCriteria: true,

      intentCriteria: true,
    },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  const version =
    EXPERIMENT_VERSION_MAP[
      session.experimentVersion as keyof typeof EXPERIMENT_VERSION_MAP
    ];

  if (!version) {
    throw new Error(
      `Unknown experiment version on session: ${session.experimentVersion}`
    );
  }

  const condition = version[questionIndex];

  if (!condition) {
    throw new Error(
      `Invalid question index: ${questionIndex}`
    );
  }

  const structureCriteria =
    session.structureCriteria as StructureCriterion[] | null;

  const intentCriteria =
    session.intentCriteria as IntentCriterion[] | null;

  if (!structureCriteria?.length || !intentCriteria?.length) {
    throw new Error(
      `Session ${sessionId} is missing assigned manipulation criteria.`
    );
  }

  /**
   * Number of Wrong questions encountered
   * up to and including the current question.
   *
   * Used to deterministically map:
   *
   * Wrong Question #1 -> Criterion 1
   * Wrong Question #2 -> Criterion 2
   */
  const wrongQuestionsBefore =
    version
      .slice(0, questionIndex + 1)
      .filter((q) => q.error === "wrong")
      .length - 1;

  let structureCriterion: StructureCriterion | undefined;
  let intentCriterion: IntentCriterion | undefined;

  if (condition.error === "wrong") {
    structureCriterion =
      structureCriteria[wrongQuestionsBefore];

    intentCriterion =
      intentCriteria[wrongQuestionsBefore];

    if (!structureCriterion || !intentCriterion) {
      throw new Error(
        "Assigned manipulation criteria not found."
      );
    }
  }

  return {
    error: condition.error,

    uncertainty: condition.uncertainty,

    wrongnessImplementation:
      session.wrongnessImplementation as ErrorImplementation,

    structureCriterion,

    intentCriterion,
  };
}