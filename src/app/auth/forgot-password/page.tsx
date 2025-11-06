'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import { authProvider } from '@/lib/auth/mock-provider'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await authProvider.resetPassword(email)
      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-success/10 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Check Your Email</h1>
              <p className="text-sm text-muted-foreground mt-1">Password reset instructions sent</p>
            </div>
          </div>

          <Card className="border border-border shadow-sm rounded-xl">
            <CardHeader className="text-center space-y-2 pb-4">
              <CardTitle className="text-xl font-bold text-success">Email Sent Successfully</CardTitle>
              <CardDescription>
                We've sent password reset instructions to your email address
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">{email}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Next Steps:</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Check your inbox for the reset email
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Click the reset link within 24 hours
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Create a new secure password
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Sign in with your new password
                  </li>
                </ul>
              </div>

              <Alert className="rounded-lg bg-info/5 border-info/20">
                <AlertCircle className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm">
                  <strong>Didn't receive the email?</strong> Check your spam folder or contact your system administrator.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    setIsSubmitted(false)
                    setEmail('')
                  }}
                  variant="outline"
                  className="w-full h-11 rounded-lg"
                >
                  Send Another Email
                </Button>

                <Link href="/auth/login" className="block">
                  <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <p>© 2024 MantisNXT. Secure password recovery.</p>
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email to receive reset instructions</p>
          </div>
        </div>

        {/* Reset Form */}
        <Card className="border border-border shadow-sm rounded-xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <CardTitle className="text-2xl font-bold">Forgot Your Password?</CardTitle>
            <CardDescription>
              No worries! Enter your email address and we'll send you reset instructions.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-6 pb-6">
              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11 bg-input border-border rounded-lg"
                />
              </div>

              <Alert className="rounded-lg bg-info/5 border-info/20">
                <AlertCircle className="h-4 w-4 text-info" />
                <AlertDescription className="text-sm">
                  We'll send password reset instructions to this email address if it's registered in our system.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  'Sending Instructions...'
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Instructions
                  </>
                )}
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 px-6 pb-6">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-sm text-primary hover:text-primary/90 transition-colors font-medium"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Sign In
              </Link>

              <div className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Sign up here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Help Card */}
        <Card className="border border-border bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p>• Make sure you're using your registered business email</p>
              <p>• Check your spam/junk folder for the reset email</p>
              <p>• Contact your system administrator if issues persist</p>
              <p className="pt-1">
                <strong className="text-foreground">Email:</strong> support@mantis.co.za |{' '}
                <strong className="text-foreground">Phone:</strong> +27 11 123 4567
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2024 MantisNXT. Secure access to your procurement data.</p>
        </div>
      </div>
    </div>
  )
}
