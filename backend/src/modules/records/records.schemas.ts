import { z } from "zod";

import { paginationQuerySchema } from "../../common/schemas/pagination.schemas";

const medicalRecordTypeSchema = z.enum([
  "CONSULTATION",
  "LAB_RESULT",
  "VITAL",
  "IMMUNIZATION",
  "ALLERGY",
  "IMAGING",
  "DISCHARGE",
  "OTHER",
]);

const storageProviderSchema = z.enum(["S3", "CLOUDINARY", "OTHER"]);
const testResultStatusSchema = z.enum(["NORMAL", "ABNORMAL", "CRITICAL", "PENDING"]);
const severitySchema = z.enum(["MILD", "MODERATE", "SEVERE", "CRITICAL"]);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

const testResultSchema = z.object({
  testName: z.string().trim().min(2).max(160),
  resultValue: z.string().trim().max(160).optional(),
  unit: z.string().trim().max(40).optional(),
  referenceRange: z.string().trim().max(120).optional(),
  status: testResultStatusSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  recordedAt: isoDateTimeSchema.optional(),
});

export const recordIdParamSchema = z.object({
  recordId: z.uuid(),
});

export const patientIdParamSchema = z.object({
  patientId: z.uuid(),
});

export const allergyIdParamSchema = z.object({
  allergyId: z.uuid(),
});

export const medicalRecordListQuerySchema = z
  .object({
    page: paginationQuerySchema.shape.page,
    limit: paginationQuerySchema.shape.limit,
    search: paginationQuerySchema.shape.search,
    patientId: z.uuid().optional(),
    doctorId: z.uuid().optional(),
    recordType: medicalRecordTypeSchema.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    isVisibleToPatient: booleanQuerySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateTo < value.dateFrom) {
      ctx.addIssue({
        code: "custom",
        message: "dateTo must be on or after dateFrom.",
        path: ["dateTo"],
      });
    }
  });

export const createMedicalRecordSchema = z.object({
  patientId: z.uuid(),
  appointmentId: z.uuid().optional(),
  doctorId: z.uuid().optional(),
  recordType: medicalRecordTypeSchema,
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().max(2000).optional(),
  clinicalNotes: z.string().trim().max(10000).optional(),
  diagnosis: z.string().trim().max(3000).optional(),
  treatmentPlan: z.string().trim().max(10000).optional(),
  source: z.string().trim().max(160).optional(),
  followUpDate: z.string().date().optional(),
  recordedAt: isoDateTimeSchema.optional(),
  isVisibleToPatient: z.boolean().default(false),
  testResults: z.array(testResultSchema).max(50).optional(),
});

export const updateMedicalRecordSchema = z
  .object({
    recordType: medicalRecordTypeSchema.optional(),
    title: z.string().trim().min(2).max(180).optional(),
    summary: z.string().trim().max(2000).nullable().optional(),
    clinicalNotes: z.string().trim().max(10000).nullable().optional(),
    diagnosis: z.string().trim().max(3000).nullable().optional(),
    treatmentPlan: z.string().trim().max(10000).nullable().optional(),
    source: z.string().trim().max(160).nullable().optional(),
    followUpDate: z.string().date().nullable().optional(),
    recordedAt: isoDateTimeSchema.optional(),
    isVisibleToPatient: z.boolean().optional(),
    testResults: z.array(testResultSchema).max(50).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });

export const createRecordVitalSchema = z
  .object({
    systolic: z.coerce.number().int().min(40).max(300).optional(),
    diastolic: z.coerce.number().int().min(20).max(200).optional(),
    heartRate: z.coerce.number().int().min(20).max(260).optional(),
    temperatureC: z.coerce.number().min(25).max(45).optional(),
    oxygenSaturation: z.coerce.number().min(0).max(100).optional(),
    glucoseLevel: z.coerce.number().min(0).max(1000).optional(),
    weightKg: z.coerce.number().min(0.5).max(500).optional(),
    heightCm: z.coerce.number().min(20).max(300).optional(),
    bmi: z.coerce.number().min(5).max(120).optional(),
    notes: z.string().trim().max(1000).optional(),
    recordedAt: isoDateTimeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasMeasurement = [
      value.systolic,
      value.diastolic,
      value.heartRate,
      value.temperatureC,
      value.oxygenSaturation,
      value.glucoseLevel,
      value.weightKg,
      value.heightCm,
      value.bmi,
    ].some((entry) => entry !== undefined);

    if (!hasMeasurement) {
      ctx.addIssue({
        code: "custom",
        message: "Provide at least one vital sign measurement.",
      });
    }

    if (value.diastolic !== undefined && value.systolic !== undefined && value.diastolic >= value.systolic) {
      ctx.addIssue({
        code: "custom",
        message: "diastolic must be lower than systolic.",
        path: ["diastolic"],
      });
    }
  });

export const createMedicalRecordFileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileUrl: z
    .url()
    .refine((value) => value.startsWith("https://"), { message: "fileUrl must be an HTTPS URL." }),
  fileType: z.string().trim().max(120).optional(),
  fileSizeBytes: z.coerce.number().int().positive().max(250_000_000).optional(),
  storageProvider: storageProviderSchema,
  providerAssetId: z.string().trim().max(255).optional(),
  checksumSha256: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  isPatientVisible: z.boolean().default(false),
});

export const createPatientAllergySchema = z.object({
  allergen: z.string().trim().min(2).max(180),
  reaction: z.string().trim().max(2000).optional(),
  severity: severitySchema.optional(),
  notedAt: z.string().date().optional(),
});

export const updatePatientAllergySchema = z
  .object({
    allergen: z.string().trim().min(2).max(180).optional(),
    reaction: z.string().trim().max(2000).nullable().optional(),
    severity: severitySchema.nullable().optional(),
    notedAt: z.string().date().nullable().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Provide at least one field to update.",
  });
