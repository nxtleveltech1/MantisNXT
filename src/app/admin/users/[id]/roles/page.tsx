'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import type { User} from '@/types/auth';
import { USER_ROLES } from '@/types/auth'
import { authProvider } from '@/lib/auth/mock-provider'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Shield,
  Save,
  Calendar as CalendarIcon,
  Info,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface RoleAssignment {
  role: string
  effectiveFrom: Date
  effectiveTo?: Date
}

export default function UserRolesPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [selectedRole, setSelectedRole] = useState<string>('')
  const [effectiveFrom, setEffectiveFrom] = useState<Date>(new Date())
  const [effectiveTo, setEffectiveTo] = useState<Date | undefined>()
  const [hasEndDate, setHasEndDate] = useState(false)

  const loadUser = useCallback(async () => {
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
      setSelectedRole(foundUser.role)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
    } finally {
      setIsLoading(false)
    }
  }, [router, userId])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSave = async () => {
    if (!user || !selectedRole) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      await authProvider.updateUser(userId, { role: selectedRole as unknown })
      setSuccess('Role assignment updated successfully')
      await loadUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Loading...' },
          { label: 'Roles' },
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  if (!user) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Not Found' },
        ]}
      >
        <Alert variant="destructive">
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </AppLayout>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const getPermissionPreview = (roleValue: string) => {
    const role = USER_ROLES.find((r) => r.value === roleValue)
    if (!role) return []

    // Mock permission mapping based on role
    const permissionMap: Record<string, string[]> = {
      super_admin: [
        'Full system access',
        'Manage all organizations',
        'System configuration',
        'User management (all)',
        'Financial operations',
        'Analytics and reports',
      ],
      admin: [
        'Organization management',
        'User management',
        'Supplier management',
        'Inventory control',
        'Financial approvals',
        'Reports and analytics',
      ],
      manager: [
        'Team management',
        'Department resources',
        'Supplier relationships',
        'Inventory viewing',
        'Department reports',
      ],
      user: [
        'View suppliers',
        'Create orders',
        'View inventory',
        'Basic reports',
      ],
      viewer: [
        'Read-only access',
        'View suppliers',
        'View reports',
      ],
    }

    return permissionMap[roleValue] || []
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Users', href: '/admin/users' },
        { label: user.name, href: `/admin/users/${user.id}` },
        { label: 'Roles' },
      ]}
    >
      <div className="space-y-6">
        {/* Header with User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profile_image} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">Role Management</h1>
              <p className="text-muted-foreground">{user.name} - {user.email}</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving || selectedRole === user.role}>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Role */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Current Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="default">
                      {USER_ROLES.find((r) => r.value === user.role)?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {USER_ROLES.find((r) => r.value === user.role)?.description}
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned:</span>
                    <span className="ml-auto font-medium">
                      {format(user.created_at, 'PP')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Assign New Role</CardTitle>
              <CardDescription>
                Select a role and configure the effective date range
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Role</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {USER_ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={cn(
                        'flex items-start space-x-3 p-4 border rounded-lg text-left transition-all',
                        selectedRole === role.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                          : 'hover:border-primary/50'
                      )}
                    >
                      <div className="mt-0.5">
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                            selectedRole === role.value
                              ? 'border-primary'
                              : 'border-muted-foreground'
                          )}
                        >
                          {selectedRole === role.value && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-1">{role.label}</div>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date Range */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Effective Date Range</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Effective From */}
                  <div className="space-y-2">
                    <Label htmlFor="effective-from">Effective From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="effective-from"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !effectiveFrom && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {effectiveFrom ? (
                            format(effectiveFrom, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={effectiveFrom}
                          onSelect={(date) => date && setEffectiveFrom(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Effective To */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="effective-to">Effective To (Optional)</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-end-date"
                          checked={hasEndDate}
                          onCheckedChange={(checked) => {
                            setHasEndDate(!!checked)
                            if (!checked) setEffectiveTo(undefined)
                          }}
                        />
                        <Label
                          htmlFor="has-end-date"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Set end date
                        </Label>
                      </div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="effective-to"
                          variant="outline"
                          disabled={!hasEndDate}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !effectiveTo && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {effectiveTo ? (
                            format(effectiveTo, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={effectiveTo}
                          onSelect={setEffectiveTo}
                          disabled={(date) => date < effectiveFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {hasEndDate && effectiveTo
                      ? `This role will be active from ${format(effectiveFrom, 'PP')} to ${format(effectiveTo, 'PP')}`
                      : `This role will be active from ${format(effectiveFrom, 'PP')} with no end date`}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission Preview */}
        {selectedRole && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permission Preview
              </CardTitle>
              <CardDescription>
                Permissions included with the{' '}
                {USER_ROLES.find((r) => r.value === selectedRole)?.label} role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getPermissionPreview(selectedRole).map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-3 border rounded-lg"
                  >
                    <ChevronRight className="h-4 w-4 text-primary" />
                    <span className="text-sm">{permission}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
