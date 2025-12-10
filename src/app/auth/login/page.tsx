'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

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

      // Check if we need 2FA
      if (signInAttempt.status === 'needs_second_factor') {
        setRequiresTwoFactor(true);
        return;
      }

      // If sign-in is complete, set the session as active
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.push('/');
      } else {
        // Handle other statuses
        console.log('Sign-in status:', signInAttempt.status);
        setError('Sign-in incomplete. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      const clerkError = err as { errors?: Array<{ message?: string; longMessage?: string }> };
      if (clerkError.errors && clerkError.errors.length > 0) {
        setError(clerkError.errors[0].longMessage || clerkError.errors[0].message || 'Sign-in failed');
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
        router.push('/');
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      console.error('2FA error:', err);
      const clerkError = err as { errors?: Array<{ message?: string; longMessage?: string }> };
      if (clerkError.errors && clerkError.errors.length > 0) {
        setError(clerkError.errors[0].longMessage || clerkError.errors[0].message || 'Verification failed');
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
        <div className="bg-background absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/images/login-background.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: '45% center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="absolute inset-0 bg-background/40" />
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
          <div className="space-y-6 rounded-lg border border-border bg-card/80 p-6 backdrop-blur-sm">
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
                className="text-muted-foreground hover:text-foreground text-sm"
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
      <div className="bg-background absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/images/login-background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: '45% center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-background/40" />
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
        {/* Login Form - Semi-transparent panel */}
        <div className="space-y-6 rounded-lg border border-border bg-card/80 p-6 backdrop-blur-sm">
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
                    <FormLabel>Username or Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Username or Email"
                        className="h-12 rounded-lg"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          className="h-12 rounded-lg pr-12"
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-10 w-10 -translate-y-1/2 hover:bg-transparent"
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

              <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-lg font-medium">
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
