"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  User,
  Shield
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Channel {
  id: number;
  name: string;
  platform: string;
  authType: string;
}

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  onSuccess: () => void;
}

const platformIcons = {
  Facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
  Instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
  TikTok: { icon: Video, color: 'text-black', bg: 'bg-gray-50' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
};

export default function ConnectionModal({ isOpen, onClose, channel, onSuccess }: ConnectionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [authType, setAuthType] = useState<'oauth' | 'username_password'>('oauth');
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string>('');

  const platformInfo = platformIcons[channel?.platform as keyof typeof platformIcons] || { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50' };
  const Icon = platformInfo.icon;

  const isUsernamePasswordSupported = channel ? ['facebook', 'instagram', 'tiktok'].includes(channel.platform.toLowerCase()) : false;

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen && channel) {
      setAuthType(channel.authType === 'username_password' ? 'username_password' : 'oauth');
      setCredentials({ username: '', password: '' });
      setStatus('idle');
      setError('');
    }
  }, [isOpen, channel]);

  // Early return after hooks
  if (!channel) return null;

  const handleUsernamePasswordAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/social-media/channels/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: channel.id,
          username: credentials.username,
          password: credentials.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Authentication failed');
        setStatus('error');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Connection error. Please try again.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const startOauth = async () => {
    setIsLoading(true);
    setStatus('idle');
    setError('');

    try {
      if (channel.platform === "Facebook" || channel.platform === "Instagram") {
        // Redirect to Meta OAuth
        window.location.href = `/api/social-media/oauth/meta/start?channelId=${encodeURIComponent(String(channel.id))}`;
        return;
      }

      if (channel.platform === "TikTok") {
        // Redirect to TikTok OAuth
        window.location.href = `/api/social-media/oauth/tiktok/start?channelId=${encodeURIComponent(String(channel.id))}`;
        return;
      }

      if (channel.platform === "WhatsApp") {
        setStatus("error");
        setError("WhatsApp requires Meta Business Manager setup or third-party provider");
        return;
      }

      setError("Platform not supported");
      setStatus('error');
    } catch (err) {
      console.error('OAuth redirect error:', err);
      setError('Redirect error. Please try again.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/social-media/channels/auth?channelId=${encodeURIComponent(String(channel.id))}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError('Failed to disconnect channel');
        setStatus('error');
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      setError('Disconnect error. Please try again.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setStatus("idle");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-4">
            <div className={`${platformInfo.bg} p-3 rounded-xl ${platformInfo.color}`}>
              <Icon size={24} />
            </div>
            <div className="text-left">
              <DialogTitle>Connect Your {channel.platform} Account</DialogTitle>
              <DialogDescription>
                Choose your preferred authentication method below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {status === "success" ? (
          <div className="py-6 flex flex-col items-center text-center gap-4">
            <div className="bg-green-100 p-4 rounded-full text-green-600">
              <CheckCircle2 size={44} />
            </div>
            <div>
              <p className="text-base font-bold text-card-foreground">Connected successfully</p>
              <p className="text-sm text-muted-foreground">Your account is now linked and ready.</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { onSuccess(); onClose(); }}>
                  Continue
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Authentication Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Authentication Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-blue-600" />
                      <span className="font-medium">OAuth (Recommended)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use your normal {channel.platform} login through secure OAuth flow
                    </p>
                    <Button
                      variant={authType === 'oauth' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAuthType('oauth')}
                      className="w-full"
                    >
                      Use OAuth
                    </Button>
                  </div>

                  {isUsernamePasswordSupported && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-green-600" />
                        <span className="font-medium">Username/Password</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Direct login with your {channel.platform} credentials
                      </p>
                      <Button
                        variant={authType === 'username_password' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAuthType('username_password')}
                        className="w-full"
                      >
                        Use Username/Password
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Username/Password Form */}
            {authType === 'username_password' && isUsernamePasswordSupported && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Enter Your Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username/Email</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username or email"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                      <p className="font-semibold mb-1">Authentication Error</p>
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUsernamePasswordAuth}
                      disabled={isLoading || !credentials.username || !credentials.password}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin mr-2" />
                          Authenticating...
                        </>
                      ) : (
                        'Connect Account'
                      )}
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                      Cancel
                    </Button>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
                    <p className="font-semibold text-blue-900 mb-1">🔒 Security Note</p>
                    <p className="text-blue-800">
                      Your password is encrypted and stored securely. You can change or remove it anytime from your channel settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OAuth Instructions */}
            {authType === 'oauth' && (
              <div className="space-y-3">
                {(channel.platform === "Facebook" || channel.platform === "Instagram") && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                    <p className="font-bold text-amber-900 mb-1">⚠️ First-Time Setup Required</p>
                    <p className="text-amber-800 mb-2">
                      Meta requires you to create a free Meta App first (takes 5 minutes).
                      Once set up, you'll use your <strong>normal Facebook/Instagram login</strong>.
                    </p>
                    <p className="text-amber-700 text-[10px]">
                      See <code className="bg-amber-100 px-1 rounded">docs/META_APP_QUICK_SETUP.md</code> for quick setup guide.
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
                  <p className="font-bold text-blue-900 mb-2">🔐 Use Your Normal Login</p>
                  <p className="text-blue-800 mb-3">
                    After clicking "Login with {channel.platform}", you'll be redirected to {channel.platform === "Facebook" || channel.platform === "Instagram" ? "Facebook" : channel.platform} where you'll log in with your <strong>normal username and password</strong>.
                  </p>
                  <div className="bg-white rounded p-3 border border-blue-100">
                    <p className="text-xs font-semibold text-gray-700 mb-1">What happens:</p>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Click "Login with {channel.platform}"</li>
                      <li>You'll go to {channel.platform === "Facebook" || channel.platform === "Instagram" ? "Facebook" : channel.platform}'s website</li>
                      <li>Enter your <strong>normal {channel.platform} credentials</strong></li>
                      <li>Authorize MobileMate to access your account</li>
                      <li>You'll be redirected back - done!</li>
                    </ol>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                    <p className="font-bold mb-1">Setup Required</p>
                    <p>{error}</p>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={startOauth} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      `Login with ${channel.platform}`
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* WhatsApp Setup */}
            {channel.platform === "WhatsApp" && authType === 'oauth' && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-bold text-amber-900 mb-2">⚠️ WhatsApp Setup Required</p>
                  <p className="text-amber-800 mb-3">
                    WhatsApp doesn't have a simple login like Facebook/Instagram. You need to set up WhatsApp Business API through one of these options:
                  </p>
                  <div className="bg-white rounded p-3 border border-amber-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Options:</p>
                    <div className="text-xs text-gray-600 space-y-2">
                      <div>
                        <strong>1. Twilio WhatsApp API</strong> (Recommended - No Meta Business Manager needed)
                        <br />
                        <span className="text-gray-500">Sign up at twilio.com, get WhatsApp enabled, use your Twilio credentials</span>
                      </div>
                      <div>
                        <strong>2. Meta Business Manager</strong>
                        <br />
                        <span className="text-gray-500">Set up WhatsApp Business Account through Meta</span>
                      </div>
                      <div>
                        <strong>3. Third-party services</strong> (Unipile, Whatsboost, etc.)
                        <br />
                        <span className="text-gray-500">Use services that connect via WhatsApp Web</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-3">
                    See <code className="bg-amber-100 px-1 rounded">docs/WHATSAPP_BUSINESS_NON_META_SETUP.md</code> for detailed setup instructions.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Your password is never stored by MobileMate in plain text. It is encrypted using AES-256-GCM and can only be used for authentication.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
