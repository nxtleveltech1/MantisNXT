'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Download, Copy, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { authProvider } from '@/lib/auth/mock-provider';

type SetupStep = 'setup' | 'verify' | 'complete';

export default function TwoFactorPage() {
  const [currentStep, setCurrentStep] = useState<SetupStep>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();

  const isSetup = currentStep === 'setup';
  const isVerify = currentStep === 'verify';
  const isComplete = currentStep === 'complete';

  const setupTwoFactor = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const setupData = await authProvider.setupTwoFactor();
      setQrCode(setupData.qr_code);
      setSecret(setupData.secret);
      setBackupCodes(setupData.backup_codes);
      setToken('2fa-setup-token');
      setCurrentStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (!token || !verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const isValid = await authProvider.verifyTwoFactor(token, verificationCode);

      if (isValid) {
        setCurrentStep('complete');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadBackupCodes = () => {
    const content = `MantisNXT Two-Factor Authentication Backup Codes

Generated on: ${new Date().toLocaleDateString()}

IMPORTANT: Store these codes in a safe place. Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Keep these codes secure and don&apos;t share them with anyone.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mantis-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (currentStep === 'complete') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-lg bg-blue-600 p-3">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">MantisNXT</h2>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-green-800">
                2FA Setup Complete!
              </CardTitle>
              <CardDescription>
                Two-factor authentication has been successfully enabled for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Your account is now more secure!
                  </span>
                </div>
                <ul className="space-y-1 text-sm text-green-700">
                  <li> Two-factor authentication enabled</li>
                  <li> Backup codes saved</li>
                  <li> Account protection enhanced</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Make sure you&apos;ve saved your backup codes in a
                  secure location. You&apos;ll need them if you lose access to your authenticator
                  app.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button onClick={() => router.push('/')} className="w-full">
                  Continue to Dashboard
                </Button>

                <Button onClick={downloadBackupCodes} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Backup Codes Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg bg-blue-600 p-3">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Setup Two-Factor Authentication</h2>
          <p className="mt-2 text-gray-600">Add an extra layer of security to your account</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center space-x-8">
              <li className="flex items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                    isSetup
                      ? 'border-blue-600 text-blue-600'
                      : 'border-blue-600 bg-blue-600 text-white'
                  }`}
                >
                  {isSetup ? '1' : '✔'}
                </span>
                <span className="ml-3 text-sm font-medium text-gray-900">Setup</span>
              </li>
              <div className="h-0.5 flex-1 bg-gray-300" />
              <li className="flex items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                    isVerify
                      ? 'border-blue-600 text-blue-600'
                      : isComplete
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {isComplete ? '✔' : '2'}
                </span>
                <span className="ml-3 text-sm font-medium text-gray-900">Verify</span>
              </li>
            </ol>
          </nav>
        </div>

        {currentStep === 'setup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Enable Two-Factor Authentication</span>
              </CardTitle>
              <CardDescription>
                Two-factor authentication (2FA) adds an extra layer of security to your account by
                requiring a second form of verification when signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-800">What you&apos;ll need:</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>Your smartphone or tablet</li>
                  <li>A secure place to store backup codes</li>
                </ul>
              </div>

              <div className="rounded-lg bg-yellow-50 p-4">
                <h4 className="mb-2 font-semibold text-yellow-800">
                  Recommended Authenticator Apps:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-yellow-700">
                    <p>Google Authenticator</p>
                    <p>Microsoft Authenticator</p>
                  </div>
                  <div className="text-yellow-700">
                    <p>Authy</p>
                    <p>1Password</p>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button onClick={setupTwoFactor} disabled={isLoading} className="flex-1">
                  {isLoading ? 'Setting up...' : 'Begin Setup'}
                </Button>

                <Link href="/">
                  <Button variant="outline">Skip for Now</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'verify' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>
                  Use your authenticator app to scan this QR code or manually enter the secret key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {qrCode && (
                  <div className="flex justify-center">
                    <div className="rounded-lg border bg-white p-4">
                      <Image
                        src={qrCode}
                        alt="QR Code"
                        width={192}
                        height={192}
                        className="h-48 w-48"
                      />
                    </div>
                  </div>
                )}

                {secret && (
                  <div className="space-y-2">
                    <Label>Manual Entry Key</Label>
                    <div className="flex space-x-2">
                      <Input value={secret} readOnly className="font-mono text-sm" />
                      <Button onClick={() => copyToClipboard(secret)} variant="outline" size="icon">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Copy this key and manually enter it in your authenticator app if you
                      can&apos;t scan the QR code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enter Verification Code</CardTitle>
                <CardDescription>
                  After adding MantisNXT to your authenticator app, enter the 6-digit code it
                  generates
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
                  <Label htmlFor="verificationCode">6-Digit Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <Button
                  onClick={verifyTwoFactor}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {isLoading ? 'Verifying...' : 'Verify and Enable 2FA'}
                </Button>
              </CardContent>
            </Card>

            {backupCodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Backup Codes</span>
                  </CardTitle>
                  <CardDescription>
                    Save these backup codes in a secure location. You can use them to access your
                    account if you lose your authenticator device.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Each backup code can only be used once. Store them
                      securely!
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-4 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span>{code}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={downloadBackupCodes} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Backup Codes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
