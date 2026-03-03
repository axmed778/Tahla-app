import { z } from "zod";

export const pinSchema = z
  .string()
  .min(4, "PIN must be 4–8 digits")
  .max(8, "PIN must be 4–8 digits")
  .regex(/^\d+$/, "PIN must be digits only");

export const setPinSchema = z.object({ pin: pinSchema });
export const unlockSchema = z.object({ pin: pinSchema });
export const changePinSchema = z.object({
  oldPin: pinSchema,
  newPin: pinSchema,
}).refine((d) => d.oldPin !== d.newPin, { message: "New PIN must differ from old PIN", path: ["newPin"] });

// User auth (name, surname, password)
const nameSchema = z.string().min(1, "Required").max(100);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export const loginSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
}).refine((d) => d.currentPassword !== d.newPassword, { message: "New password must differ", path: ["newPassword"] });

export const phoneSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional(),
  number: z.string().min(1, "Number is required"),
});
export const emailSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional(),
  email: z.string().email("Invalid email"),
});

export const personQuickAddSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export const personFormSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  middleName: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  workplace: z.string().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"]),
  notes: z.string().optional(),
  phones: z.array(phoneSchema).default([]),
  emails: z.array(emailSchema).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
});

export const relationshipSchema = z.object({
  toPersonId: z.string().uuid(),
  type: z.enum(["PARENT", "CHILD", "SIBLING", "SPOUSE", "OTHER"]),
  label: z.string().optional(),
});

// Export format for import/export
export const exportPersonPhoneSchema = z.object({ id: z.string(), label: z.string().nullable(), number: z.string() });
export const exportPersonEmailSchema = z.object({ id: z.string(), label: z.string().nullable(), email: z.string() });
export const exportTagSchema = z.object({ id: z.string(), name: z.string() });
export const exportRelationshipSchema = z.object({
  id: z.string(),
  fromPersonId: z.string(),
  toPersonId: z.string(),
  type: z.enum(["PARENT", "CHILD", "SIBLING", "SPOUSE", "OTHER"]),
  label: z.string().nullable(),
  createdAt: z.string(),
});
export const exportPersonSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  middleName: z.string().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthDate: z.string().nullable(),
  deathDate: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  occupation: z.string().nullable(),
  workplace: z.string().nullable(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"]),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  phones: z.array(exportPersonPhoneSchema),
  emails: z.array(exportPersonEmailSchema),
  tags: z.array(exportTagSchema),
});
export const exportDataSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  people: z.array(exportPersonSchema),
  tags: z.array(exportTagSchema),
  relationships: z.array(exportRelationshipSchema),
});

export type ExportData = z.infer<typeof exportDataSchema>;
