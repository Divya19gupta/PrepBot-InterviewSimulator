import { z } from "zod";

/**
 * ============================================================
 * Shared Criterion Schema
 * ============================================================
 */

const CriterionSchema = z.object({

    status: z.enum([
        "Satisfied",
        "Partially Satisfied",
        "Not Satisfied",
    ]),

    evidence: z
        .string()
        .min(1),

    feedback: z
        .string()
        .min(1),

});

/**
 * ============================================================
 * Structure Evaluation
 * ============================================================
 */

export const StructureEvaluationSchema = z.object({

    evaluationLogic: z.literal("structure"),

    rubric: z.object({

        completeness: CriterionSchema,

        organization: CriterionSchema,

        development: CriterionSchema,

        coverage: CriterionSchema,

    }),

    overallAssessment: z
        .string()
        .min(1),

});

/**
 * ============================================================
 * Intent Evaluation
 * ============================================================
 */

export const IntentEvaluationSchema = z.object({

    evaluationLogic: z.literal("intent"),

    rubric: z.object({

        taskRelevance: CriterionSchema,

        supportingEvidence: CriterionSchema,

        reasoning: CriterionSchema,

        goalFulfilment: CriterionSchema,

    }),

    overallAssessment: z
        .string()
        .min(1),

});

/**
 * ============================================================
 * Union
 * ============================================================
 */

export const ReferenceEvaluationSchema = z.union([

    StructureEvaluationSchema,

    IntentEvaluationSchema,

]);