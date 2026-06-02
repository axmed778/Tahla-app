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

// User auth (email, name, password)
const nameSchema = z.string().min(1, "Required").max(100);
const emailSchema = z.string().email("Invalid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** HTML `input type="date"` value (YYYY-MM-DD), optional. */
const registerBirthDateIsoSchema = z
  .string()
  .optional()
  .refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s), { message: "Invalid date" })
  .refine((s) => {
    if (!s) return true;
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, { message: "Invalid date" });

export const registerSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  password: passwordSchema,
  birthDate: registerBirthDateIsoSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
}).refine((d) => d.currentPassword !== d.newPassword, { message: "New password must differ", path: ["newPassword"] });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordWithTokenSchema = z.object({
  token: z.string().min(1, "Invalid link"),
  newPassword: passwordSchema,
});

/** Master only: set another user's password (no current password required). */
export const setPasswordByMasterSchema = z.object({
  userId: z.string().uuid(),
  newPassword: passwordSchema,
});

export const phoneSchema = z.object({
  id: z.string().uuid().optional(),
  dialCode: z.string().min(1),
  /** National number (digits only in UI; stored in DB combined with dialCode). */
  number: z.string().min(1, "Number is required"),
  visibility: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
});
export const personEmailSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().optional(),
  email: z.string().email("Invalid email"),
  visibility: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
});

export const personQuickAddSchema = z.object({
  firstName: z.string().min(1, "First name required").max(100),
  lastName: z.string().min(1, "Last name required").max(100),
  phone: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
});

export const postContentSchema = z.string().min(1, "Content is required").max(5000, "Post must be under 5000 characters");
export const commentContentSchema = z.string().min(1, "Content is required").max(1000, "Comment must be under 1000 characters");
export const messageContentSchema = z.string().min(1, "Message is required").max(2000, "Message must be under 2000 characters");

export const groupNameSchema = z.string().min(1, "Name is required").max(100, "Name must be under 100 characters");
export const groupDescriptionSchema = z.string().max(500, "Description must be under 500 characters").optional();

export const eventNameSchema = z.string().min(1, "Event name is required").max(200, "Event name must be under 200 characters");
export const eventPlaceSchema = z.string().max(200, "Place must be under 200 characters").optional();

export const personFormSchema = z.object({
  firstName: z.string().min(1, "First name required").max(100),
  lastName: z.string().min(1, "Last name required").max(100),
  middleName: z.string().max(100).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  occupation: z.string().max(200).optional(),
  workplace: z.string().max(200).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"]),
  notes: z.string().max(2000).optional(),
  profileVisibility: z.enum(["ALL", "FRIENDS", "FIRST_GEN"]).optional(),
  privacy: z
    .object({
      birthDate: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
      location: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
      work: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
      maritalStatus: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
      notes: z.enum(["EVERYONE", "FRIENDS", "FAMILY", "ONLY_ME"]).optional(),
    })
    .optional(),
  phones: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return [];
      return val.filter(
        (p: { number?: string }) => (p?.number ?? "").replace(/\D/g, "").length > 0
      );
    },
    z.array(phoneSchema).default([])
  ),
  emails: z.array(personEmailSchema).default([]),
  tagIds: z.array(z.string().uuid()).default([]),
});

export type PersonFormData = z.infer<typeof personFormSchema>;

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
