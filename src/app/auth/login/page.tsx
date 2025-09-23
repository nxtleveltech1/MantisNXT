'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn, AlertCircle, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

import { authProvider } from '@/lib/auth/mock-provider'
import { loginFormSchema, type LoginFormData } from '@/lib/auth/validation'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  const router = useRouter()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      remember_me: false
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await authProvider.login({
        email: data.email,
        password: data.password,
        remember_me: data.remember_me,
        two_factor_code: requiresTwoFactor ? twoFactorCode : undefined
      })

      if (result.success && result.user) {
        // Successful login
        router.push('/')
      } else if (result.requires_two_factor) {
        // Need two-factor authentication
        setRequiresTwoFactor(true)
        setTwoFactorToken(result.two_factor_token!)
        setError(null)
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorToken || !twoFactorCode) {
      setError('Please enter the verification code')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const isValid = await authProvider.verifyTwoFactor(twoFactorToken, twoFactorCode)

      if (isValid) {
        // Retry login with 2FA code
        const data = form.getValues()
        const result = await authProvider.login({
          email: data.email,
          password: data.password,
          remember_me: data.remember_me,
          two_factor_code: twoFactorCode
        })

        if (result.success) {
          router.push('/')
        } else {
          setError(result.message || 'Login failed')
        }
      } else {
        setError('Invalid verification code')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (requiresTwoFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">MantisNXT</h2>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Verification Code</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <Button
                onClick={handleTwoFactorSubmit}
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => {
                    setRequiresTwoFactor(false)
                    setTwoFactorToken(null)
                    setTwoFactorCode('')
                    setError(null)
                  }}
                  className="text-sm"
                >
                  Back to login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">MantisNXT</h2>
          <p className="mt-2 text-gray-600">Procurement Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@demo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="remember_me"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Remember me
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    'Signing in...'
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <div className="w-full text-center space-y-4">
              <div className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Register your company
                </Link>
              </div>

              {/* Demo Credentials */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-blue-800">Demo Credentials</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-blue-700 space-y-1">
                    <div><strong>Admin:</strong> admin@mantis.co.za</div>
                    <div><strong>Manager (2FA):</strong> manager@mantis.co.za</div>
                    <div><strong>Buyer:</strong> buyer@mantis.co.za</div>
                    <div><strong>Password:</strong> Any password (3+ chars)</div>
                    <div className="text-blue-600 mt-2"><strong>Note:</strong> Manager account has 2FA enabled</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 MantisNXT. Procurement solutions for South African businesses.</p>
          <p className="mt-1">VAT Registration: 4123456789 | BEE Level 4</p>
        </div>
      </div>
    </div>
  )
}