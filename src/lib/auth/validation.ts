import { z } from 'zod';
import {
  SOUTH_AFRICAN_PROVINCES,
  BEE_LEVELS,
  USER_ROLES,
  EMPLOYMENT_EQUITY_OPTIONS,
} from '@/types/auth';

// South African specific validation utilities
export const validateSouthAfricanId = (idNumber: string): boolean => {
  // Remove any spaces or dashes
  const cleaned = idNumber.replace(/[\s-]/g, '');

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleaned)) return false;

  // Extract components
  const birthDate = cleaned.substring(0, 6);
  const genderCode = parseInt(cleaned.substring(6, 10));
  const citizenshipCode = parseInt(cleaned.substring(10, 11));
  const raceCode = cleaned.substring(11, 12); // Not used in modern validation
  const checkDigit = parseInt(cleaned.substring(12, 13));

  // Validate birth date (YYMMDD format)
  const year = parseInt(birthDate.substring(0, 2));
  const month = parseInt(birthDate.substring(2, 4));
  const day = parseInt(birthDate.substring(4, 6));

  // Determine century (assume 1900s for years 50-99, 2000s for 00-49)
  const fullYear = year >= 50 ? 1900 + year : 2000 + year;
  const testDate = new Date(fullYear, month - 1, day);

  if (
    testDate.getFullYear() !== fullYear ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  // Calculate checksum using Luhn algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleaned[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === checkDigit;
};

export const validateCompanyRegistration = (regNumber: string): boolean => {
  // South African company registration format: YYYY/NNNNNN/NN
  const pattern = /^\d{4}\/\d{6}\/\d{2}$/;
  return pattern.test(regNumber);
};

export const validateVatNumber = (vatNumber: string): boolean => {
  // South African VAT number format: 4NNNNNNNNN (10 digits starting with 4)
  const pattern = /^4\d{9}$/;
  return pattern.test(vatNumber.replace(/\s/g, ''));
};

export const validateSouthAfricanPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // South African phone number patterns
  // Mobile: 07X, 08X (when dialing locally) or +27 7X, +27 8X (international)
  // Landline: 0XX (area code) or +27 XX (international)

  if (cleaned.startsWith('27')) {
    // International format
    return /^27[1-9]\d{8}$/.test(cleaned);
  } else if (cleaned.startsWith('0')) {
    // Local format
    return /^0[1-9]\d{8}$/.test(cleaned);
  }

  return false;
};

export const formatSouthAfricanPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('27')) {
    // International format: +27 XX XXX XXXX
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  } else if (cleaned.startsWith('0')) {
    // Local format: 0XX XXX XXXX
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }

  return phone;
};

// Zod validation schemas
export const southAfricanIdSchema = z
  .string()
  .min(13, 'ID number must be 13 digits')
  .max(13, 'ID number must be 13 digits')
  .regex(/^\d{13}$/, 'ID number must contain only digits')
  .refine(validateSouthAfricanId, 'Invalid South African ID number');

export const companyRegistrationSchema = z
  .string()
  .regex(/^\d{4}\/\d{6}\/\d{2}$/, 'Invalid company registration format (YYYY/NNNNNN/NN)')
  .refine(validateCompanyRegistration, 'Invalid company registration number');

export const vatNumberSchema = z
  .string()
  .optional()
  .or(
    z
      .string()
      .regex(/^4\d{9}$/, 'VAT number must be 10 digits starting with 4')
      .refine(validateVatNumber, 'Invalid South African VAT number')
  );

export const southAfricanPhoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .refine(validateSouthAfricanPhone, 'Invalid South African phone number');

// Authentication form schemas
export const loginFormSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().default(false),
});

export const registerFormSchema = z
  .object({
    // Organization details
    organization_name: z
      .string()
      .min(2, 'Organization name must be at least 2 characters')
      .max(100, 'Organization name must be less than 100 characters'),
    organization_legal_name: z
      .string()
      .min(2, 'Legal name must be at least 2 characters')
      .max(100, 'Legal name must be less than 100 characters'),
    registration_number: companyRegistrationSchema,
    vat_number: vatNumberSchema,
    bee_level: z
      .number()
      .min(1, 'BEE level must be between 1 and 8')
      .max(8, 'BEE level must be between 1 and 8'),
    province: z.enum(SOUTH_AFRICAN_PROVINCES.map(p => p.value) as [string, ...string[]], {
      errorMap: () => ({ message: 'Please select a valid province' }),
    }),
    industry: z
      .string()
      .min(2, 'Industry must be at least 2 characters')
      .max(50, 'Industry must be less than 50 characters'),

    // Admin user details
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    phone: southAfricanPhoneSchema,
    id_number: southAfricanIdSchema.optional(),

    // Address
    address: z.object({
      street: z
        .string()
        .min(5, 'Street address must be at least 5 characters')
        .max(100, 'Street address must be less than 100 characters'),
      suburb: z
        .string()
        .min(2, 'Suburb must be at least 2 characters')
        .max(50, 'Suburb must be less than 50 characters'),
      city: z
        .string()
        .min(2, 'City must be at least 2 characters')
        .max(50, 'City must be less than 50 characters'),
      province: z.enum(SOUTH_AFRICAN_PROVINCES.map(p => p.value) as [string, ...string[]], {
        errorMap: () => ({ message: 'Please select a valid province' }),
      }),
      postal_code: z
        .string()
        .min(4, 'Postal code must be at least 4 characters')
        .max(4, 'Postal code must be exactly 4 digits')
        .regex(/^\d{4}$/, 'Postal code must be 4 digits'),
      country: z.string().default('South Africa'),
    }),

    // Legal agreements
    terms_accepted: z
      .boolean()
      .refine(val => val === true, 'You must accept the terms and conditions'),
    privacy_accepted: z.boolean().refine(val => val === true, 'You must accept the privacy policy'),
    marketing_consent: z.boolean().default(false),
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const forgotPasswordFormSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
});

export const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const twoFactorFormSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const createUserFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(USER_ROLES.map(r => r.value) as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  department: z
    .string()
    .min(2, 'Department must be at least 2 characters')
    .max(50, 'Department must be less than 50 characters'),
  phone: southAfricanPhoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  send_invitation: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
  id_number: southAfricanIdSchema.optional(),
  employment_equity: z
    .enum(EMPLOYMENT_EQUITY_OPTIONS.map(e => e.value) as [string, ...string[]])
    .optional(),
});

export const updateUserFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(USER_ROLES.map(r => r.value) as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  department: z
    .string()
    .max(50, 'Department must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  phone: southAfricanPhoneSchema.optional().or(z.literal('')),
  is_active: z.boolean(),
  permissions: z.array(z.string()).default([]),
  id_number: southAfricanIdSchema.optional().or(z.literal('')),
  employment_equity: z
    .enum(EMPLOYMENT_EQUITY_OPTIONS.map(e => e.value) as [string, ...string[]])
    .optional(),
});

export const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

// Helper function to get province label
export const getProvinceLabel = (value: string): string => {
  const province = SOUTH_AFRICAN_PROVINCES.find(p => p.value === value);
  return province?.label || value;
};

// Helper function to get BEE level label
export const getBeeLabel = (value: string): string => {
  const beeLevel = BEE_LEVELS.find(b => b.value === value);
  return beeLevel?.label || value;
};

// Helper function to get role label
export const getRoleLabel = (value: string): string => {
  const role = USER_ROLES.find(r => r.value === value);
  return role?.label || value;
};

// Helper function to get employment equity label
export const getEmploymentEquityLabel = (value: string): string => {
  const equity = EMPLOYMENT_EQUITY_OPTIONS.find(e => e.value === value);
  return equity?.label || value;
};

// Helper function to format dates
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Password strength checker
export const checkPasswordStrength = (
  password: string
): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('Include special characters (@$!%*?&)');

  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push('Avoid repeating characters');

  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123'];
  if (!commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) score += 1;
  else feedback.push('Avoid common patterns');

  return {
    score,
    feedback,
    isStrong: score >= 6,
  };
};

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
export type TwoFactorFormData = z.infer<typeof twoFactorFormSchema>;
export type CreateUserFormData = z.infer<typeof createUserFormSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserFormSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;
