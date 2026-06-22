import { prisma } from "../../db";

import {
  ExperimentVersion,
  ErrorImplementation,
  EXPERIMENT_VERSIONS,
} from "./experimentTypes";

import {
  StructureCriterion,
  IntentCriterion,
} from "./referenceEvaluationTypes";

import { assignCriteria } from "./assignCriteria";

export interface ExperimentAssignment {
  version: ExperimentVersion;
  wrongnessImplementation: ErrorImplementation;
  structureCriteria: StructureCriterion[];
  intentCriteria: IntentCriterion[];
}

interface ExperimentCell {
  version: ExperimentVersion;
  wrongnessImplementation: ErrorImplementation;
}

/**
 * ---------------------------------------------------------
 * Every experimental cell
 * ---------------------------------------------------------
 *
 * V1 + SB
 * V2 + SB
 * ...
 * V4 + MW
 */

const CELLS: ExperimentCell[] = EXPERIMENT_VERSIONS.flatMap((version) => [
  {
    version,
    wrongnessImplementation: "selectiveBlindness" as const,
  },
  {
    version,
    wrongnessImplementation: "misweighting" as const,
  },
]);

export async function assignExperimentVersion(): Promise<ExperimentAssignment> {

  //----------------------------------------------------------
  // Count how many participants have already been assigned
  // to each experimental cell
  //----------------------------------------------------------

  const sessions = await prisma.session.findMany({
    select: {
      experimentVersion: true,
      wrongnessImplementation: true,
    },
  });

  //----------------------------------------------------------
  // Compute cell counts
  //----------------------------------------------------------

 const countMap = new Map<string, number>();

for (const session of sessions) {
  const key = `${session.experimentVersion}-${session.wrongnessImplementation}`;
  countMap.set(key, (countMap.get(key) ?? 0) + 1);
}

const counts = CELLS.map(
  cell =>
    countMap.get(`${cell.version}-${cell.wrongnessImplementation}`) ?? 0
);

  //----------------------------------------------------------
  // Find least-used cells
  //----------------------------------------------------------

  const minimum = Math.min(...counts);

  const availableCells = CELLS.filter(
    (_, index) => counts[index] === minimum
  );

  //----------------------------------------------------------
  // Randomly choose among tied cells
  //----------------------------------------------------------

  const chosenCell =
    availableCells[
      Math.floor(Math.random() * availableCells.length)
    ];

  //----------------------------------------------------------
  // Assign rubric criteria
  //----------------------------------------------------------

  const {
    structureCriteria,
    intentCriteria,
  } = assignCriteria();

  //----------------------------------------------------------
  // Return participant assignment
  //----------------------------------------------------------

  return {
    version: chosenCell.version,
    wrongnessImplementation: chosenCell.wrongnessImplementation,
    structureCriteria,
    intentCriteria,
  };

}