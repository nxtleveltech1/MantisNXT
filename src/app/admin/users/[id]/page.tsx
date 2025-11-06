'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/layout/AdminLayout'
import { User } from '@/types/auth'
import { authProvider } from '@/lib/auth/mock-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateUserFormSchema, UpdateUserFormData } from '@/lib/auth/validation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Shield,
  Save,
  X,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Lock,
} from 'lucide-react'
import { USER_ROLES, EMPLOYMENT_EQUITY_OPTIONS } from '@/types/auth'
import { formatDate } from '@/lib/auth/validation'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      permissions: [],
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = form

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    try {
      setIsLoading(true)
      const currentUser = await authProvider.getCurrentUser()
      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      const users = await authProvider.getUsersByOrganization(currentUser.org_id)
      const foundUser = users.find((u) => u.id === userId)

      if (!foundUser) {
        setError('User not found')
        return
      }

      setUser(foundUser)
      reset({
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        department: foundUser.department,
        phone: foundUser.phone,
        is_active: foundUser.is_active,
        permissions: foundUser.permissions.map((p) => p.id),
        id_number: foundUser.id_number,
        employment_equity: foundUser.employment_equity,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: UpdateUserFormData) => {
    if (!user) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      await authProvider.updateUser(userId, {
        ...data,
        role: data.role as any,
      })
      setSuccess('User updated successfully')
      setIsEditing(false)
      await loadUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return

    if (
      !confirm(
        `Are you sure you want to delete ${user.name}? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await authProvider.deleteUser(userId)
      router.push('/admin/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const toggleStatus = async () => {
    if (!user) return

    try {
      await authProvider.updateUser(userId, { is_active: !user.is_active })
      await loadUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    }
  }

  if (isLoading) {
    return (
      <AdminLayout
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!user) {
    return (
      <AdminLayout
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Not Found' },
        ]}
      >
        <Alert variant="destructive">
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </AdminLayout>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <AdminLayout
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Users', href: '/admin/users' },
        { label: user.name },
      ]}
    >
      <div className="space-y-6">
        {/* Header with User Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profile_image} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{USER_ROLES.find((r) => r.value === user.role)?.label}</Badge>
                <Badge variant={user.is_active ? 'default' : 'destructive'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {user.two_factor_enabled && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    2FA
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    reset()
                  }}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSaving || !isDirty}
                >
                  {isSaving ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant={user.is_active ? 'outline' : 'default'}
                  size="sm"
                  onClick={toggleStatus}
                >
                  {user.is_active ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <UserIcon className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Basic user information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        {...register('name')}
                        disabled={!isEditing}
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          disabled={!isEditing}
                          className={errors.email ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          {...register('phone')}
                          disabled={!isEditing}
                          placeholder="+27 11 123 4567"
                          className={errors.phone ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <div className="flex items-center">
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="department"
                          {...register('department')}
                          disabled={!isEditing}
                          className={errors.department ? 'border-red-500' : ''}
                        />
                      </div>
                      {errors.department && (
                        <p className="text-sm text-red-600">{errors.department.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={watch('role')}
                        onValueChange={(value) => setValue('role', value as any, { shouldDirty: true })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.role && (
                        <p className="text-sm text-red-600">{errors.role.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employment_equity">Employment Equity</Label>
                      <Select
                        value={watch('employment_equity') || ''}
                        onValueChange={(value) =>
                          setValue('employment_equity', value as any, { shouldDirty: true })
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="employment_equity">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_EQUITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="id_number">ID Number (Optional)</Label>
                      <Input
                        id="id_number"
                        {...register('id_number')}
                        disabled={!isEditing}
                        placeholder="8001015009087"
                        className={errors.id_number ? 'border-red-500' : ''}
                      />
                      {errors.id_number && (
                        <p className="text-sm text-red-600">{errors.id_number.message}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={watch('is_active')}
                        onCheckedChange={(checked) =>
                          setValue('is_active', checked, { shouldDirty: true })
                        }
                        disabled={!isEditing}
                      />
                      <Label htmlFor="is_active">Account Active</Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2 font-medium">{formatDate(user.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Login:</span>
                      <span className="ml-2 font-medium">
                        {user.last_login ? formatDate(user.last_login) : 'Never'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email Verified:</span>
                      <span className="ml-2 font-medium">
                        {user.email_verified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Password Changed:</span>
                      <span className="ml-2 font-medium">
                        {formatDate(user.password_changed_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>User Permissions</CardTitle>
                <CardDescription>
                  Manage permissions and access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.permissions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No permissions assigned
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {user.permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{permission.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {permission.resource} - {permission.action}
                            </p>
                          </div>
                          <Badge variant="outline">{permission.action}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>User login history and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">Last Login</p>
                      <p className="text-sm text-muted-foreground">
                        {user.last_login ? formatDate(user.last_login) : 'Never logged in'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Activity tracking coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Authentication and security configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={user.two_factor_enabled ? 'default' : 'secondary'}>
                    {user.two_factor_enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email_verified ? 'Verified' : 'Not Verified'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={user.email_verified ? 'default' : 'secondary'}>
                    {user.email_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    Force Password Reset
                  </Button>
                  <Button variant="outline" className="w-full">
                    Reset Two-Factor Authentication
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
