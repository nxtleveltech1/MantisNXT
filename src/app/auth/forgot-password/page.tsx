'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft, Building2, CheckCircle } from 'lucide-react';
import { authProvider } from '@/lib/auth/mock-provider';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authProvider.resetPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-600 p-3 rounded-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
            <p className="mt-2 text-gray-600">Password reset instructions sent</p>
          </div>

          {/* Success Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-800">Email Sent Successfully</CardTitle>
              <CardDescription className="text-center">
                We've sent password reset instructions to your email address
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <Mail className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-800 font-medium">
                    Email sent to: {email}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Next Steps:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Check your inbox for the reset email</li>
                  <li>Click the reset link within 24 hours</li>
                  <li>Create a new secure password</li>
                  <li>Sign in with your new password</li>
                </ul>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Didn't receive the email?</strong> Check your spam folder or contact your system administrator.
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="space-y-3">
              <div className="w-full space-y-2">
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Send Another Email
                </Button>

                <Link href="/auth/login" className="w-full">
                  <Button variant="default" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500">
            <p>© 2024 MantisNXT. Secure password recovery.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-gray-600">Enter your email to receive reset instructions</p>
        </div>

        {/* Reset Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Forgot Your Password?</CardTitle>
            <CardDescription className="text-center">
              No worries! Enter your email address and we'll send you reset instructions.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <Alert>
                <AlertDescription>
                  We'll send password reset instructions to this email address if it's registered in our system.
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Instructions...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Instructions
                  </>
                )}
              </Button>

              <div className="text-center space-y-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Back to Sign In
                </Link>

                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    href="/auth/register"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign up here
                  </Link>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Help Card */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-800">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• Make sure you're using your registered business email</p>
              <p>• Check your spam/junk folder for the reset email</p>
              <p>• Contact your system administrator if issues persist</p>
              <p>• Email: support@mantis.co.za | Phone: +27 11 123 4567</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 MantisNXT. Secure access to your procurement data.</p>
        </div>
      </div>
    </div>
  );
}