'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'

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

  const form = useForm<LoginFormData, unknown, LoginFormData>({
    resolver: zodResolver(loginFormSchema) as Resolver<LoginFormData, unknown, LoginFormData>,
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
      <div className="min-h-screen relative flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/login-background.jpg"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white tracking-tight">NXT</h1>
          </div>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-lg bg-red-900/90 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-white">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input
                id="twoFactorCode"
                type="text"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                maxLength={6}
                className="h-12 text-center text-lg tracking-widest bg-red-900/30 border-red-700/50 text-white placeholder:text-white/60 rounded-lg"
                aria-label="Enter 6-digit verification code"
                autoComplete="one-time-code"
              />
            </div>

            <Button
              onClick={handleTwoFactorSubmit}
              disabled={isLoading || twoFactorCode.length !== 6}
              className="w-full h-12 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium"
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
                className="text-sm text-white/80 hover:text-white"
              >
                Back to login
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* NXT Logo */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white tracking-tight">NXT</h1>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-lg bg-red-900/90 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Username or Email"
                        className="h-12 bg-red-900/30 border-red-700/50 text-white placeholder:text-white/60 rounded-lg"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          className="h-12 bg-red-900/30 border-red-700/50 text-white placeholder:text-white/60 rounded-lg pr-12"
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-white/60" />
                          ) : (
                            <Eye className="h-4 w-4 text-white/60" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium"
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
