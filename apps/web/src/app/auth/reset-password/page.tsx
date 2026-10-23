'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Lock, CheckCircle2, ShieldCheck, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordStrength {
  score: number; // 0 to 5
  label: 'Weak' | 'Fair' | 'Good' | 'Strong' | '';
  color: string;
  checks: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
  };
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Input State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: 'bg-muted',
    checks: { length: false, upper: false, lower: false, number: false, special: false },
  });

  // Calculate password strength
  useEffect(() => {
    const checks = {
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };

    const score = Object.values(checks).filter(Boolean).length;
    let label: PasswordStrength['label'] = '';
    let color = 'bg-muted';

    if (newPassword.length > 0) {
      if (score <= 2) {
        label = 'Weak';
        color = 'bg-red-500';
      } else if (score === 3) {
        label = 'Fair';
        color = 'bg-orange-500';
      } else if (score === 4) {
        label = 'Good';
        color = 'bg-blue-500';
      } else {
        label = 'Strong';
        color = 'bg-green-500';
      }
    }

    setStrength({ score, label, color, checks });
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!token) {
      setPasswordError('Reset token is missing or invalid.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (strength.score < 5) {
      setPasswordError('Password does not meet all security requirements');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setIsSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been updated successfully.',
      });
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Failed to reset password. The link may have expired.');
      toast({
        title: 'Reset failed',
        description: error.response?.data?.message || 'Failed to reset password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Invalid Reset Link</h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            The password reset link is invalid, corrupted, or missing a token. Please request a new verification code.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/auth/forgot-password"
            className="w-full inline-flex items-center justify-center h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg shadow-sm"
          >
            Go to Password Recovery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="reset-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Reset Password</h1>
                <p className="text-base text-muted-foreground">
                  Set a secure new password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {passwordError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-base font-semibold text-foreground">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 text-base h-11 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Password Strength:</span>
                      <span className="font-semibold text-foreground">{strength.label}</span>
                    </div>
                    {/* Live Segmented Color Indicator */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-muted'}`} />
                      <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-muted'}`} />
                      <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-muted'}`} />
                      <div className={`rounded-full h-full transition-all duration-300 ${strength.score >= 5 ? strength.color : 'bg-muted'}`} />
                    </div>

                    {/* Requirements list */}
                    <div className="space-y-1.5 pt-1 text-sm">
                      <div className="flex items-center gap-2">
                        {strength.checks.length ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={strength.checks.length ? 'text-green-500' : 'text-muted-foreground'}>At least 8 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {strength.checks.upper ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={strength.checks.upper ? 'text-green-500' : 'text-muted-foreground'}>At least one uppercase letter (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {strength.checks.lower ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={strength.checks.lower ? 'text-green-500' : 'text-muted-foreground'}>At least one lowercase letter (a-z)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {strength.checks.number ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={strength.checks.number ? 'text-green-500' : 'text-muted-foreground'}>At least one number (0-9)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {strength.checks.special ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={strength.checks.special ? 'text-green-500' : 'text-muted-foreground'}>At least one special character (!@#$ etc.)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base font-semibold text-foreground">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 text-base h-11 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || strength.score < 5}
                  className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Resetting Password...</>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-6"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Password Reset</h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Your password has been updated successfully.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/auth/login"
                className="w-full inline-flex items-center justify-center h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg shadow-sm"
              >
                Log In to Your Account
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-base text-muted-foreground">Loading password recovery...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
