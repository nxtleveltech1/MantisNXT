// @ts-nocheck
// Mock Authentication Provider - Provider Agnostic Implementation
import {
  AuthProvider,
  User,
  Organization,
  LoginCredentials,
  RegistrationData,
  CreateUserData,
  AuthResult,
  TwoFactorSetup,
  BulkImportResult,
  SouthAfricanProvince,
  Permission
} from '@/types/auth'

// Mock data store (in real app, this would be a database)
const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@mantis.co.za',
    name: 'John Smith',
    role: 'admin',
    org_id: 'org-1',
    department: 'IT',
    permissions: [
      { id: 'perm-1', name: 'users.manage', resource: 'users', action: 'manage' },
      { id: 'perm-2', name: 'admin.access', resource: 'admin', action: 'manage' }
    ],
    created_at: new Date('2024-01-15'),
    last_login: new Date(),
    is_active: true,
    profile_image: undefined,
    id_number: '8001015009087',
    employment_equity: 'white',
    bee_status: 'level_4',
    phone: '+27 11 123 4567',
    mobile: '+27 82 123 4567',
    address: {
      street: '123 Business Park Drive',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'gauteng',
      postal_code: '2196',
      country: 'South Africa'
    },
    preferences: {
      language: 'en',
      timezone: 'Africa/Johannesburg',
      date_format: 'dd/mm/yyyy',
      currency: 'ZAR',
      notifications: {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        digest_frequency: 'daily'
      }
    },
    two_factor_enabled: false,
    email_verified: true,
    password_changed_at: new Date('2024-01-15')
  },
  {
    id: 'user-2',
    email: 'manager@mantis.co.za',
    name: 'Sarah Johnson',
    role: 'manager',
    org_id: 'org-1',
    department: 'Procurement',
    permissions: [
      { id: 'perm-3', name: 'users.read', resource: 'users', action: 'read' },
      { id: 'perm-4', name: 'procurement.manage', resource: 'procurement', action: 'manage' }
    ],
    created_at: new Date('2024-01-20'),
    last_login: new Date(Date.now() - 86400000), // 1 day ago
    is_active: true,
    profile_image: undefined,
    id_number: '8505125234086',
    employment_equity: 'african',
    bee_status: 'level_2',
    phone: '+27 21 456 7890',
    mobile: '+27 83 456 7890',
    address: {
      street: '456 Corporate Avenue',
      suburb: 'Cape Town City Centre',
      city: 'Cape Town',
      province: 'western_cape',
      postal_code: '8001',
      country: 'South Africa'
    },
    preferences: {
      language: 'en',
      timezone: 'Africa/Johannesburg',
      date_format: 'dd/mm/yyyy',
      currency: 'ZAR',
      notifications: {
        email_notifications: true,
        sms_notifications: true,
        push_notifications: true,
        digest_frequency: 'weekly'
      }
    },
    two_factor_enabled: true,
    email_verified: true,
    password_changed_at: new Date('2024-01-20')
  },
  {
    id: 'user-3',
    email: 'buyer@mantis.co.za',
    name: 'Michael Brown',
    role: 'user',
    org_id: 'org-1',
    department: 'Procurement',
    permissions: [
      { id: 'perm-5', name: 'procurement.read', resource: 'procurement', action: 'read' },
      { id: 'perm-6', name: 'orders.create', resource: 'orders', action: 'create' }
    ],
    created_at: new Date('2024-02-01'),
    last_login: new Date(Date.now() - 3600000), // 1 hour ago
    is_active: true,
    profile_image: undefined,
    id_number: '9002153456789',
    employment_equity: 'coloured',
    bee_status: 'level_3',
    phone: '+27 31 789 0123',
    mobile: '+27 84 789 0123',
    address: {
      street: '789 Industrial Road',
      suburb: 'Westville',
      city: 'Durban',
      province: 'kwazulu_natal',
      postal_code: '3629',
      country: 'South Africa'
    },
    preferences: {
      language: 'en',
      timezone: 'Africa/Johannesburg',
      date_format: 'dd/mm/yyyy',
      currency: 'ZAR',
      notifications: {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: false,
        digest_frequency: 'monthly'
      }
    },
    two_factor_enabled: false,
    email_verified: true,
    password_changed_at: new Date('2024-02-01')
  }
]

const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Mantis Procurement Solutions',
    legal_name: 'Mantis Procurement Solutions (Pty) Ltd',
    registration_number: '2024/123456/07',
    vat_number: '4123456789',
    bee_level: 4,
    province: 'gauteng',
    industry: 'Technology Services',
    created_at: new Date('2024-01-01'),
    is_active: true,
    contact_email: 'info@mantis.co.za',
    phone: '+27 11 123 4567',
    address: {
      street: '123 Business Park Drive',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'gauteng',
      postal_code: '2196',
      country: 'South Africa'
    },
    logo_url: undefined,
    settings: {
      allow_self_registration: false,
      require_email_verification: true,
      enforce_two_factor: false,
      password_policy: {
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_symbols: true,
        expires_days: 90
      },
      session_timeout: 3600,
      allowed_domains: ['mantis.co.za']
    }
  }
]

export class MockAuthProvider implements AuthProvider {
  private currentUser: User | null = null
  private sessionToken: string | null = null

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock authentication - accept any valid email format with password length >= 3
    if (!credentials.email.includes('@') || credentials.password.length < 3) {
      return {
        success: false,
        message: 'Invalid email or password',
        errors: ['Please check your email and password']
      }
    }

    // Find user or create demo user for valid emails
    let user = mockUsers.find(u => u.email === credentials.email)

    if (!user) {
      // Auto-create user for demo purposes
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: credentials.email,
        name: credentials.email.split('@')[0].replace(/[._]/g, ' '),
        role: 'viewer',
        org_id: 'org-1',
        department: 'General',
        permissions: [
          { id: 'perm-view', name: 'basic.read', resource: 'basic', action: 'read' }
        ],
        created_at: new Date(),
        last_login: new Date(),
        is_active: true,
        phone: '+27 11 000 0000',
        preferences: {
          language: 'en',
          timezone: 'Africa/Johannesburg',
          date_format: 'dd/mm/yyyy',
          currency: 'ZAR',
          notifications: {
            email_notifications: true,
            sms_notifications: false,
            push_notifications: true,
            digest_frequency: 'weekly'
          }
        },
        two_factor_enabled: false,
        email_verified: true,
        password_changed_at: new Date()
      }

      mockUsers.push(newUser)
      user = newUser
    }

    // Check for 2FA requirement
    if (user.two_factor_enabled && !credentials.two_factor_code) {
      return {
        success: false,
        requires_two_factor: true,
        two_factor_token: `2fa-token-${user.id}-${Date.now()}`,
        message: 'Two-factor authentication required'
      }
    }

    // Verify 2FA code if provided
    if (user.two_factor_enabled && credentials.two_factor_code) {
      // Mock 2FA verification - accept any 6-digit code
      if (!/^\d{6}$/.test(credentials.two_factor_code)) {
        return {
          success: false,
          message: 'Invalid verification code'
        }
      }
    }

    // Update last login
    user.last_login = new Date()

    // Set current user and session
    this.currentUser = user
    this.sessionToken = `mock-token-${user.id}-${Date.now()}`

    return {
      success: true,
      user,
      token: this.sessionToken,
      message: 'Login successful'
    }
  }

  async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    this.currentUser = null
    this.sessionToken = null
  }

  async register(data: RegistrationData): Promise<AuthResult> {
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Check if user already exists
    if (mockUsers.find(u => u.email === data.email)) {
      return {
        success: false,
        message: 'User already exists',
        errors: ['A user with this email already exists']
      }
    }

    // Create new organization
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: data.organization_name,
      legal_name: data.organization_legal_name,
      registration_number: data.registration_number,
      vat_number: data.vat_number,
      bee_level: data.bee_level,
      province: data.province,
      industry: data.industry,
      created_at: new Date(),
      is_active: true,
      contact_email: data.email,
      phone: data.phone,
      address: data.address,
      settings: {
        allow_self_registration: false,
        require_email_verification: true,
        enforce_two_factor: false,
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: true,
          expires_days: 90
        },
        session_timeout: 3600,
        allowed_domains: [data.email.split('@')[1]]
      }
    }

    mockOrganizations.push(newOrg)

    // Create admin user
    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      role: 'admin',
      org_id: newOrg.id,
      department: 'Administration',
      permissions: [
        { id: 'perm-admin', name: 'admin.manage', resource: 'admin', action: 'manage' },
        { id: 'perm-users', name: 'users.manage', resource: 'users', action: 'manage' }
      ],
      created_at: new Date(),
      last_login: new Date(),
      is_active: true,
      id_number: data.id_number,
      phone: data.phone,
      address: data.address,
      preferences: {
        language: 'en',
        timezone: 'Africa/Johannesburg',
        date_format: 'dd/mm/yyyy',
        currency: 'ZAR',
        notifications: {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          digest_frequency: 'daily'
        }
      },
      two_factor_enabled: false,
      email_verified: false, // Would require verification in real system
      password_changed_at: new Date()
    }

    mockUsers.push(newUser)

    // For mock: auto-verify and sign in
    newUser.email_verified = true
    this.currentUser = newUser
    this.sessionToken = `mock-token-${newUser.id}-${Date.now()}`

    return {
      success: true,
      user: newUser,
      token: this.sessionToken,
      message: 'Registration successful'
    }
  }

  async resetPassword(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log(`Password reset requested for: ${email}`)
  }

  async verifyEmail(token: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 800))
    // Mock verification - accept any token
    return token.length > 10
  }

  async setupTwoFactor(): Promise<TwoFactorSetup> {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const secret = 'JBSWY3DPEHPK3PXP'
    const qrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
    const backupCodes = [
      '12345678', '23456789', '34567890', '45678901', '56789012',
      '67890123', '78901234', '89012345', '90123456', '01234567'
    ]

    return {
      secret,
      qr_code: qrCode,
      backup_codes: backupCodes
    }
  }

  async verifyTwoFactor(token: string, code: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500))
    // Mock verification - accept any 6-digit code
    return /^\d{6}$/.test(code);
  }

  async disableTwoFactor(password: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return password.length >= 3
  }

  async getCurrentUser(): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 200))
    return this.currentUser
  }

  async refreshToken(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300))
    if (!this.currentUser) {
      throw new Error('No user signed in')
    }
    this.sessionToken = `mock-token-${this.currentUser.id}-${Date.now()}`
    return this.sessionToken
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (!this.currentUser) {
      throw new Error('No user signed in')
    }
    if (oldPassword.length < 3) {
      throw new Error('Current password is incorrect')
    }
    console.log(`Password updated for user: ${this.currentUser.email}`)
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800))
    if (!this.currentUser) {
      throw new Error('No user signed in')
    }

    // Update user data
    Object.assign(this.currentUser, data)

    // Update in mock store
    const userIndex = mockUsers.findIndex(u => u.id === this.currentUser!.id)
    if (userIndex >= 0) {
      mockUsers[userIndex] = this.currentUser
    }

    return this.currentUser
  }

  async createUser(data: CreateUserData): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      role: data.role,
      org_id: this.currentUser?.org_id || 'org-1',
      department: data.department,
      permissions: data.permissions?.map(p => ({
        id: `perm-${p}`,
        name: p,
        resource: p.split('.')[0],
        action: p.split('.')[1] as any
      })) || [],
      created_at: new Date(),
      last_login: new Date(),
      is_active: true,
      id_number: data.id_number,
      employment_equity: data.employment_equity,
      phone: data.phone,
      preferences: {
        language: 'en',
        timezone: 'Africa/Johannesburg',
        date_format: 'dd/mm/yyyy',
        currency: 'ZAR',
        notifications: {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          digest_frequency: 'weekly'
        }
      },
      two_factor_enabled: false,
      email_verified: !data.send_invitation,
      password_changed_at: new Date()
    }

    mockUsers.push(newUser)
    return newUser
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800))

    const userIndex = mockUsers.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    Object.assign(mockUsers[userIndex], data)
    return mockUsers[userIndex]
  }

  async deleteUser(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))

    const userIndex = mockUsers.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    mockUsers.splice(userIndex, 1)
  }

  async getUsersByOrganization(orgId: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 600))
    return mockUsers.filter(u => u.org_id === orgId)
  }

  async bulkImportUsers(csvData: string): Promise<BulkImportResult> {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',')
    const dataLines = lines.slice(1)

    const result: BulkImportResult = {
      total_processed: dataLines.length,
      successful_imports: 0,
      failed_imports: 0,
      errors: [],
      created_users: []
    }

    dataLines.forEach((line, index) => {
      const values = line.split(',')
      try {
        // Mock validation and user creation
        if (values.length < headers.length) {
          throw new Error('Missing required fields')
        }

        const email = values[headers.indexOf('email')]
        if (!email || !email.includes('@')) {
          throw new Error('Invalid email address')
        }

        if (mockUsers.find(u => u.email === email)) {
          throw new Error('User already exists')
        }

        // Create mock user
        const newUser: User = {
          id: `user-${Date.now()}-${index}`,
          email,
          name: values[headers.indexOf('name')] || 'Unknown',
          role: (values[headers.indexOf('role')] as any) || 'viewer',
          org_id: this.currentUser?.org_id || 'org-1',
          department: values[headers.indexOf('department')] || 'General',
          permissions: [],
          created_at: new Date(),
          last_login: new Date(),
          is_active: true,
          phone: values[headers.indexOf('phone')] || '+27 11 000 0000',
          preferences: {
            language: 'en',
            timezone: 'Africa/Johannesburg',
            date_format: 'dd/mm/yyyy',
            currency: 'ZAR',
            notifications: {
              email_notifications: true,
              sms_notifications: false,
              push_notifications: true,
              digest_frequency: 'weekly'
            }
          },
          two_factor_enabled: false,
          email_verified: true,
          password_changed_at: new Date()
        }

        mockUsers.push(newUser)
        result.created_users.push(newUser)
        result.successful_imports++
      } catch (error) {
        result.failed_imports++
        result.errors.push({
          row: index + 2, // +2 because index is 0-based and we skip header
          email: values[headers.indexOf('email')],
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
      }
    })

    return result
  }

  // Mock utility methods
  getMockUsers(): User[] {
    return [...mockUsers]
  }

  getMockOrganizations(): Organization[] {
    return [...mockOrganizations]
  }

  clearMockData(): void {
    this.currentUser = null
    this.sessionToken = null
    // Reset to original data
    mockUsers.splice(3) // Remove any added users beyond the first 3
  }
}

// Export singleton instance
export const authProvider = new MockAuthProvider()

// Export singleton instance
export const mockAuthProvider = new MockAuthProvider();