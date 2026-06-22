import {
    StructureCriterion,
    IntentCriterion,
} from "./referenceEvaluationTypes";

/**
 * --------------------------------------------------------
 * Available rubric criteria
 * --------------------------------------------------------
 */

const STRUCTURE_CRITERIA: StructureCriterion[] = [
    "completeness",
    "organization",
    "development",
    "coverage",
];

const INTENT_CRITERIA: IntentCriterion[] = [
    "taskRelevance",
    "supportingEvidence",
    "reasoning",
    "goalFulfilment",
];

/**
 * --------------------------------------------------------
 * Fisher–Yates shuffle
 * --------------------------------------------------------
 */

function shuffle<T>(array: T[]): T[] {

    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [copy[i], copy[j]] =
            [copy[j], copy[i]];
    }

    return copy;
}

/**
 * --------------------------------------------------------
 * Assign criteria
 * --------------------------------------------------------
 *
 * Called ONLY once when a participant starts.
 *
 * Returns two structure criteria
 * and two intent criteria.
 */

export function assignCriteria() {

    const structureCriteria =
        shuffle(STRUCTURE_CRITERIA).slice(0, 2);

    const intentCriteria =
        shuffle(INTENT_CRITERIA).slice(0, 2);

    return {

        structureCriteria,

        intentCriteria,

    };

}