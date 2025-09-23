// Authentication and User Management Types

export interface User {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer'
  org_id: string
  department: string
  permissions: Permission[]
  created_at: Date
  last_login: Date
  is_active: boolean
  profile_image?: string
  // South African specific fields
  id_number?: string
  employment_equity?: 'african' | 'coloured' | 'indian' | 'white' | 'other'
  bee_status?: BeeStatus
  phone: string
  mobile?: string
  address?: Address
  preferences: UserPreferences
  two_factor_enabled: boolean
  email_verified: boolean
  password_changed_at: Date
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'equals' | 'in' | 'contains' | 'starts_with'
  value: any
}

export interface Organization {
  id: string
  name: string
  legal_name: string
  registration_number: string
  vat_number?: string
  bee_level: number
  province: SouthAfricanProvince
  industry: string
  created_at: Date
  is_active: boolean
  contact_email: string
  phone: string
  address: Address
  logo_url?: string
  settings: OrganizationSettings
}

export interface Address {
  street: string
  suburb: string
  city: string
  province: SouthAfricanProvince
  postal_code: string
  country: string
}

export interface UserPreferences {
  language: 'en' | 'af' | 'zu' | 'xh'
  timezone: string
  date_format: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'
  currency: 'ZAR' | 'USD' | 'EUR' | 'GBP'
  notifications: NotificationPreferences
}

export interface NotificationPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  digest_frequency: 'daily' | 'weekly' | 'monthly' | 'never'
}

export interface OrganizationSettings {
  allow_self_registration: boolean
  require_email_verification: boolean
  enforce_two_factor: boolean
  password_policy: PasswordPolicy
  session_timeout: number
  allowed_domains: string[]
}

export interface PasswordPolicy {
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_numbers: boolean
  require_symbols: boolean
  expires_days?: number
}

export type SouthAfricanProvince =
  | 'eastern_cape'
  | 'free_state'
  | 'gauteng'
  | 'kwazulu_natal'
  | 'limpopo'
  | 'mpumalanga'
  | 'northern_cape'
  | 'north_west'
  | 'western_cape'

export type BeeStatus =
  | 'level_1'
  | 'level_2'
  | 'level_3'
  | 'level_4'
  | 'level_5'
  | 'level_6'
  | 'level_7'
  | 'level_8'
  | 'non_compliant'

// Authentication Provider Interface
export interface AuthProvider {
  // Core authentication methods
  login(credentials: LoginCredentials): Promise<AuthResult>
  logout(): Promise<void>
  register(data: RegistrationData): Promise<AuthResult>
  resetPassword(email: string): Promise<void>
  verifyEmail(token: string): Promise<boolean>

  // Two-factor authentication
  setupTwoFactor(): Promise<TwoFactorSetup>
  verifyTwoFactor(token: string, code: string): Promise<boolean>
  disableTwoFactor(password: string): Promise<boolean>

  // Session management
  getCurrentUser(): Promise<User | null>
  refreshToken(): Promise<string>
  changePassword(oldPassword: string, newPassword: string): Promise<void>
  updateProfile(data: Partial<User>): Promise<User>

  // Administrative methods
  createUser(data: CreateUserData): Promise<User>
  updateUser(id: string, data: Partial<User>): Promise<User>
  deleteUser(id: string): Promise<void>
  getUsersByOrganization(orgId: string): Promise<User[]>
  bulkImportUsers(csvData: string): Promise<BulkImportResult>
}

export interface LoginCredentials {
  email: string
  password: string
  remember_me?: boolean
  two_factor_code?: string
}

export interface RegistrationData {
  // Organization details
  organization_name: string
  organization_legal_name: string
  registration_number: string
  vat_number?: string
  bee_level: number
  province: SouthAfricanProvince
  industry: string

  // Admin user details
  name: string
  email: string
  password: string
  confirm_password: string
  phone: string
  id_number?: string

  // Address
  address: Address

  // Legal agreements
  terms_accepted: boolean
  privacy_accepted: boolean
  marketing_consent: boolean
}

export interface CreateUserData {
  name: string
  email: string
  role: User['role']
  department: string
  phone: string
  password?: string
  send_invitation?: boolean
  permissions?: string[]
  id_number?: string
  employment_equity?: User['employment_equity']
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  refresh_token?: string
  requires_two_factor?: boolean
  two_factor_token?: string
  message?: string
  errors?: string[]
}

export interface TwoFactorSetup {
  secret: string
  qr_code: string
  backup_codes: string[]
}

export interface BulkImportResult {
  total_processed: number
  successful_imports: number
  failed_imports: number
  errors: BulkImportError[]
  created_users: User[]
}

export interface BulkImportError {
  row: number
  email?: string
  errors: string[]
}

// Form validation types
export interface LoginFormData {
  email: string
  password: string
  remember_me: boolean
}

export interface RegisterFormData extends RegistrationData {}

export interface ForgotPasswordFormData {
  email: string
}

export interface ResetPasswordFormData {
  token: string
  password: string
  confirm_password: string
}

export interface TwoFactorFormData {
  code: string
}

export interface CreateUserFormData extends CreateUserData {}

export interface UpdateUserFormData {
  name: string
  email: string
  role: User['role']
  department: string
  phone: string
  is_active: boolean
  permissions: string[]
  id_number?: string
  employment_equity?: User['employment_equity']
}

export interface ChangePasswordFormData {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface UserFilters {
  search?: string
  role?: User['role']
  department?: string
  is_active?: boolean
  created_after?: Date
  created_before?: Date
}

export interface UserTableSort {
  field: keyof User
  direction: 'asc' | 'desc'
}

// Constants
export const SOUTH_AFRICAN_PROVINCES = [
  { value: 'eastern_cape', label: 'Eastern Cape' },
  { value: 'free_state', label: 'Free State' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu_natal', label: 'KwaZulu-Natal' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'northern_cape', label: 'Northern Cape' },
  { value: 'north_west', label: 'North West' },
  { value: 'western_cape', label: 'Western Cape' },
] as const

export const BEE_LEVELS = [
  { value: 'level_1', label: 'Level 1', points: '≥100' },
  { value: 'level_2', label: 'Level 2', points: '95-99' },
  { value: 'level_3', label: 'Level 3', points: '90-94' },
  { value: 'level_4', label: 'Level 4', points: '80-89' },
  { value: 'level_5', label: 'Level 5', points: '75-79' },
  { value: 'level_6', label: 'Level 6', points: '70-74' },
  { value: 'level_7', label: 'Level 7', points: '55-69' },
  { value: 'level_8', label: 'Level 8', points: '40-54' },
  { value: 'non_compliant', label: 'Non-Compliant', points: '<40' },
] as const

export const USER_ROLES = [
  { value: 'super_admin', label: 'Super Administrator', description: 'Full system access across all organizations' },
  { value: 'admin', label: 'Administrator', description: 'Full access within organization' },
  { value: 'manager', label: 'Manager', description: 'Manage team and department resources' },
  { value: 'user', label: 'User', description: 'Standard user access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
] as const

export const EMPLOYMENT_EQUITY_OPTIONS = [
  { value: 'african', label: 'African' },
  { value: 'coloured', label: 'Coloured' },
  { value: 'indian', label: 'Indian' },
  { value: 'white', label: 'White' },
  { value: 'other', label: 'Other' },
] as const