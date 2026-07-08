import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CitizenProfileSchema } from '../../frontend/src/utils/schemas.js';

// Centralized highly reusable validation interceptor middleware
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errorDetails = result.error.issues.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      res.status(400).json({
        error: 'Validation failed',
        details: errorDetails
      });
      return;
    }
    
    // Replace req.body with the perfectly parsed and validated data to drop loose elements/types
    req.body = result.data;
    next();
  };
}

// ============================================================================
// INCOMING USER PAYLOAD SCHEMAS
// ============================================================================

// Schema for Match Endpoint payload
export const MatchSchema = CitizenProfileSchema;

// Schema for Legal Analyzer payload
export const LegalAnalyzeSchema = z.object({
  documentText: z.string().optional(),
  document_text: z.string().optional(),
  fileName: z.string().optional().default('LeaseAgreement.pdf'),
  file_name: z.string().optional(),
  email: z.string().email().optional(),
  uploadedBy: z.string().email().optional(),
  language: z.enum(['en', 'te', 'hi']).optional(),
  category: z.string().optional()
}).refine(data => data.documentText || data.document_text, {
  message: 'Please provide document text for analysis.',
  path: ['documentText']
});

// Schema for Compare payload
export const LegalCompareSchema = z.object({
  reportIdA: z.string().min(1, 'reportIdA is required'),
  reportIdB: z.string().min(1, 'reportIdB is required')
});

// Schema for Chat endpoint payload
export const ChatSchema = z.object({
  session_id: z.string().optional().nullable(),
  user_message: z.string().min(1, 'Please supply a user message.'),
  profile_snapshot: z.any().optional().nullable(),
  search_mode: z.union([z.boolean(), z.string()]).optional().nullable(),
  files: z.array(z.object({
    base64: z.string(),
    type: z.string()
  })).optional().nullable()
});

// Schema for Smart Chat Generate payload
export const SmartChatGenerateSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'model', 'system']),
    content: z.string().optional().nullable(),
    blocks: z.any().optional()
  })),
  thinkingLevel: z.enum(['minimal', 'low', 'medium', 'high', 'web_search']).optional().nullable().default('low'),
  schemeContext: z.any().optional().nullable(),
  profileSnapshot: z.any().optional().nullable(),
  webSearchEnabled: z.boolean().optional().nullable().default(false)
});

// Schema for Scheme Admin Management model creation and updation
export const AdminSchemeSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default(''),
  name_te: z.string().optional().default(''),
  description: z.string().optional().default(''),
  description_te: z.string().optional().default(''),
  category: z.string().optional().default(''),
  state: z.string().optional().default(''),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  docs_required: z.array(z.string()).default([]),
  docs_required_te: z.array(z.string()).optional().default([]),
  eligibility_rules: z.object({
    min_age: z.number().int().nonnegative().optional().default(0),
    max_age: z.number().int().nonnegative().optional().default(120),
    max_income: z.number().nonnegative().optional().default(1000000),
    requires_land: z.boolean().optional().default(false),
    applicable_states: z.array(z.string()).optional().default([])
  }).optional().nullable(),
  benefit_details: z.string().optional().default(''),
  benefit_details_te: z.string().optional().default(''),
  district: z.string().optional().nullable().default(null),
  external_url: z.string().optional().default(''),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.status === 'PUBLISHED') {
    if (!data.name || !data.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Required field missing: Scheme Name is required for publishing.'
      });
    }
    if (!data.description || !data.description.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Required field missing: Description is required for publishing.'
      });
    }
    if (!data.category || !data.category.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Required field missing: Category is required for publishing.'
      });
    }
    if (!data.state || !data.state.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['state'],
        message: 'Required field missing: Region/State is required for publishing.'
      });
    }
    if (!data.docs_required || data.docs_required.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['docs_required'],
        message: 'Draft validation failed: At least one required source document is needed to publish.'
      });
    }
    
    const rules = data.eligibility_rules || {};
    const ruleKeys = Object.keys(rules);
    const hasConcreteRule = ruleKeys.length > 0 && ruleKeys.some(k => {
      const val = (rules as any)[k];
      return val !== undefined && val !== null && val !== '';
    });
    
    if (!hasConcreteRule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['eligibility_rules'],
        message: 'Draft validation failed: At least one concrete eligibility rule (e.g. min_age, max_income) must be defined to publish.'
      });
    }
  }
});

// Schema for Admin Rollback payload
export const AdminRollbackSchema = z.object({
  versionId: z.string().min(1, 'versionId is required')
});

// ============================================================================
// DATABASE HYDRATION MODELS
// ============================================================================

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  picture: z.string().optional(),
  provider: z.string(),
  created_at: z.string(),
  last_login: z.string()
});

export const SessionSchema = z.object({
  token: z.string(),
  email: z.string().email(),
  user_id: z.string(),
  name: z.string(),
  picture: z.string().optional(),
  expires_at: z.string()
});

export const LegalDocumentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  sanitizedContent: z.string(),
  hash: z.string(),
  documentType: z.string()
});

export const LegalDocumentChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  heading: z.string(),
  chunkText: z.string(),
  categories: z.array(z.string()),
  embedding: z.array(z.number()),
  sequenceIndex: z.number()
});

export const LegalReportSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  analyzedBy: z.string(),
  analyzedAt: z.string(),
  overallRiskScore: z.number(),
  overallRiskLevel: z.string(),
  overallConfidence: z.number(),
  healthScore: z.number(),
  healthGrade: z.string(),
  findings: z.array(z.any()),
  contradictions: z.array(z.any()),
  missingClauses: z.array(z.any()),
  totalClausesAnalyzed: z.number(),
  jurisdiction: z.string(),
  primaryParties: z.object({
    party_a: z.string(),
    party_b: z.string()
  }),
  partyFavored: z.string(),
  partyFavoredReason: z.string(),
  registrationRequired: z.boolean(),
  registrationNote: z.string(),
  escalationRequired: z.boolean(),
  escalationReason: z.string(),
  finalSummary: z.string(),
  disclaimer: z.string(),
  negotiationChecklist: z.array(z.any()).optional().default([])
});

export const SchemeVersionSchema = z.object({
  id: z.string(),
  scheme_id: z.string(),
  version_data: z.any(),
  created_at: z.string()
});

export const QueryAnalyticSchema = z.object({
  id: z.string(),
  query_text: z.string(),
  language: z.string(),
  latency_ms: z.number(),
  match_count: z.number(),
  rag_mode: z.enum(['vector', 'fallback', 'cached']),
  matched_schemes: z.array(z.string()),
  timestamp: z.string(),
  profile_snapshot: z.any().optional().nullable()
});

// ============================================================================
// MATCHING TYPES EXPORTS FROM THE VALIDATION LAYER
// ============================================================================

export type InferredMatchPayload = z.infer<typeof MatchSchema>;
export type InferredLegalAnalyzePayload = z.infer<typeof LegalAnalyzeSchema>;
export type InferredLegalComparePayload = z.infer<typeof LegalCompareSchema>;
export type InferredChatPayload = z.infer<typeof ChatSchema>;
export type InferredSmartChatGeneratePayload = z.infer<typeof SmartChatGenerateSchema>;
export type InferredAdminSchemePayload = z.infer<typeof AdminSchemeSchema>;
export type InferredAdminRollbackPayload = z.infer<typeof AdminRollbackSchema>;

export type InferredUser = z.infer<typeof UserSchema>;
export type InferredSession = z.infer<typeof SessionSchema>;
export type InferredLegalDocument = z.infer<typeof LegalDocumentSchema>;
export type InferredLegalDocumentChunk = z.infer<typeof LegalDocumentChunkSchema>;
export type InferredLegalReport = z.infer<typeof LegalReportSchema>;
export type InferredSchemeVersion = z.infer<typeof SchemeVersionSchema>;
export type InferredQueryAnalytic = z.infer<typeof QueryAnalyticSchema>;
