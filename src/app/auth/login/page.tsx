'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignIn, useAuth } from '@clerk/nextjs';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { loginFormSchema, type LoginFormData } from '@/lib/auth/validation';

function getSafeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  // Only allow relative, app-internal redirects to avoid open-redirect vulnerabilities.
  // Clerk may provide `redirect_url` depending on the flow.
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();

  const redirectAfterAuth =
    getSafeRedirectPath(
      searchParams.get('redirect_url') ??
        searchParams.get('redirectUrl') ??
        searchParams.get('returnUrl') ??
        searchParams.get('next')
    ) ?? '/portal';

  // Redirect if already authenticated
  useEffect(() => {
    if (isSignedIn) {
      router.push(redirectAfterAuth);
    }
  }, [isSignedIn, redirectAfterAuth, router]);

  const form = useForm<LoginFormData, unknown, LoginFormData>({
    resolver: zodResolver(loginFormSchema) as Resolver<LoginFormData, unknown, LoginFormData>,
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (!isLoaded || !signIn) return;

    try {
      setIsLoading(true);
      setError(null);

      // Start the sign-in process
      const signInAttempt = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      console.log('Sign-in attempt status:', signInAttempt.status);
      console.log('Sign-in attempt:', JSON.stringify(signInAttempt, null, 2));

      // Check if we need 2FA
      if (signInAttempt.status === 'needs_second_factor') {
        console.log('2FA required - supportedSecondFactors:', signInAttempt.supportedSecondFactors);
        setRequiresTwoFactor(true);
        return;
      }

      // Check for first factor verification needed
      if (signInAttempt.status === 'needs_first_factor') {
        console.log(
          'First factor needed - supportedFirstFactors:',
          signInAttempt.supportedFirstFactors
        );
        setError('Additional verification required. Check your email for a code.');
        return;
      }

      // If sign-in is complete, set the session as active
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.push(redirectAfterAuth);
      } else {
        // Handle other statuses
        console.log('Unhandled sign-in status:', signInAttempt.status);
        setError(`Sign-in status: ${signInAttempt.status}. Please try again.`);
      }
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      const clerkError = err as { errors?: Array<{ message?: string; longMessage?: string }> };
      if (clerkError.errors && clerkError.errors.length > 0) {
        setError(
          clerkError.errors[0].longMessage || clerkError.errors[0].message || 'Sign-in failed'
        );
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!isLoaded || !signIn || !twoFactorCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Attempt to verify the 2FA code
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: 'totp',
        code: twoFactorCode,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.push(redirectAfterAuth);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      console.error('2FA error:', err);
      const clerkError = err as { errors?: Array<{ message?: string; longMessage?: string }> };
      if (clerkError.errors && clerkError.errors.length > 0) {
        setError(
          clerkError.errors[0].longMessage || clerkError.errors[0].message || 'Verification failed'
        );
      } else {
        setError('Invalid verification code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requiresTwoFactor) {
    return (
      <div className="relative min-h-screen">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 bg-background">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/images/login-background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="bg-background/30 absolute inset-0" />
        </div>

        {/* Content - Two Factor Form at bottom center */}
        <div
          className="z-10 max-w-md px-4"
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '28rem',
          }}
        >
          <div className="bg-card/80 space-y-6 rounded-lg border border-border p-6 backdrop-blur-sm">
            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input
                id="twoFactorCode"
                type="text"
                placeholder="000000"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                maxLength={6}
                className="h-12 rounded-lg text-center text-lg tracking-widest"
                aria-label="Enter 6-digit verification code"
                autoComplete="one-time-code"
              />
            </div>

            <Button
              onClick={handleTwoFactorSubmit}
              disabled={isLoading || twoFactorCode.length !== 6}
              className="h-12 w-full rounded-lg font-medium"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode('');
                  setError(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 bg-background">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/login-background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="bg-background/30 absolute inset-0" />
      </div>

      {/* Content - Login Form at bottom center */}
      <div
        className="z-10 max-w-md px-4"
        style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '28rem',
        }}
      >
        {/* Login Form - Liquid glassy black panel */}
        <div className="space-y-6 rounded-lg border border-border/20 p-6 backdrop-blur-md bg-black/90 shadow-2xl">
          {error && (
            <Alert variant="destructive" className="rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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
                        className="h-12 rounded-lg placeholder:text-white text-white"
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
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          className="h-12 rounded-lg pr-12 placeholder:text-white text-white"
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
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

              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-lg font-medium bg-red-800 hover:bg-red-900 text-white"
              >
                {isLoading ? (
                  'Signing in...'
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
