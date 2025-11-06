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
import { OAuthButton } from '@/components/auth/OAuthButton'
import { FormDivider } from '@/components/auth/FormDivider'

import { authProvider } from '@/lib/auth/mock-provider'
import { loginFormSchema, type LoginFormData } from '@/lib/auth/validation'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isOAuthLoading, setIsOAuthLoading] = useState<'github' | 'google' | null>(null)
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

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      setIsOAuthLoading(provider)
      setError(null)

      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500))

      // In production, this would redirect to OAuth provider
      console.log(`OAuth login with ${provider}`)

      // For demo: simulate successful OAuth
      // router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth login failed')
    } finally {
      setIsOAuthLoading(null)
    }
  }

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
        router.push('/')
      } else if (result.requires_two_factor) {
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
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary p-3 rounded-xl">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">MantisNXT</h1>
              <p className="text-sm text-muted-foreground mt-1">Procurement Management System</p>
            </div>
          </div>

          <Card className="border border-border shadow-sm rounded-xl">
            <CardHeader className="text-center space-y-2 pb-4">
              <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
              <CardDescription className="text-sm">
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="twoFactorCode" className="text-sm font-medium">
                  Verification Code
                </Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest h-12 bg-input border-border rounded-lg"
                  aria-label="Enter 6-digit verification code"
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                onClick={handleTwoFactorSubmit}
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"
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
                  className="text-sm text-muted-foreground hover:text-foreground"
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
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary p-3 rounded-xl">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MantisNXT</h1>
            <p className="text-sm text-muted-foreground mt-1">Procurement Management System</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border border-border shadow-sm rounded-xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
            <CardDescription className="text-sm">
              Welcome back! Please enter your details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <OAuthButton
                provider="github"
                isLoading={isOAuthLoading === 'github'}
                onClick={() => handleOAuthLogin('github')}
                aria-label="Sign in with GitHub"
              />
              <OAuthButton
                provider="google"
                isLoading={isOAuthLoading === 'google'}
                onClick={() => handleOAuthLogin('google')}
                aria-label="Sign in with Google"
              />
            </div>

            <FormDivider />

            {/* Email/Password Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@demo.com"
                          className="h-11 bg-input border-border rounded-lg"
                          autoComplete="email"
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
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            className="h-11 bg-input border-border rounded-lg pr-10"
                            autoComplete="current-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
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
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Remember me"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Remember me
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-primary hover:text-primary/90 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"
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

          <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-primary hover:text-primary/90 transition-colors"
              >
                Create account
              </Link>
            </div>

            {/* Demo Credentials */}
            <Card className="w-full bg-muted/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Demo Credentials</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs space-y-1.5 text-muted-foreground">
                  <div><strong className="text-foreground">Admin:</strong> admin@mantis.co.za</div>
                  <div><strong className="text-foreground">Manager (2FA):</strong> manager@mantis.co.za</div>
                  <div><strong className="text-foreground">Buyer:</strong> buyer@mantis.co.za</div>
                  <div><strong className="text-foreground">Password:</strong> Any password (3+ chars)</div>
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    <strong className="text-foreground">Note:</strong> Manager account has 2FA enabled
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>© 2024 MantisNXT. Procurement solutions for South African businesses.</p>
          <p>VAT Registration: 4123456789 | BEE Level 4</p>
        </div>
      </div>
    </div>
  )
}
