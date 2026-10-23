'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Lock, CheckCircle2, ShieldCheck, KeyRound, AlertCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Schemas for validation
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Verification code must be exactly 6 digits').regex(/^\d+$/, 'Verification code must be numeric'),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

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

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // New Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: 'bg-muted',
    checks: { length: false, upper: false, lower: false, number: false, special: false },
  });

  // Timer for Resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

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

  // Form hooks
  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  // Handle Step 1: Submit Email
  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      setStep(2);
      setResendTimer(60);
      toast({
        title: 'Verification code sent',
        description: 'Check your inbox for the verification code.',
      });
    } catch (error: any) {
      toast({
        title: 'Error sending code',
        description: error.response?.data?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setResendTimer(60);
      toast({
        title: 'Code resent',
        description: 'A new verification code has been sent to your email.',
      });
    } catch (error: any) {
      toast({
        title: 'Error resending code',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Verify OTP
  const onOtpSubmit = async (data: OtpFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ data: { verificationToken: string } }>('/auth/verify-reset-otp', {
        email,
        otp: data.otp,
      });
      // Store in React state only (Never localStorage)
      setVerificationToken(response.data.data.verificationToken);
      setStep(3);
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.response?.data?.message || 'Invalid or expired verification code.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 3: Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

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
        token: verificationToken,
        newPassword,
      });
      setStep(4);
      toast({
        title: 'Password Updated',
        description: 'Your password has been updated successfully.',
      });
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Failed to reset password. Token may have expired.');
      toast({
        title: 'Reset failed',
        description: error.response?.data?.message || 'Failed to reset password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {/* STEP 1: ENTER EMAIL */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Forgot Password?</h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Enter your email address and we'll send you a 6-digit OTP code to verify your identity.
                </p>
              </div>

              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold text-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@college.edu"
                      {...emailForm.register('email')}
                      className="pl-10 text-base h-11 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary"
                      required
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-red-500 font-medium">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Sending Code...</>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </form>

              <div className="text-center pt-2 border-t border-border mt-4">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Log In
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: ENTER OTP */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Verify Identity</h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  We sent a 6-digit verification code to <span className="font-semibold text-foreground">{email}</span>.
                </p>
              </div>

              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-base font-semibold text-foreground">Verification Code</Label>
                  <div className="relative">
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      {...otpForm.register('otp')}
                      className="text-center text-2xl tracking-[0.5em] font-mono h-12 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary"
                      required
                    />
                  </div>
                  {otpForm.formState.errors.otp && (
                    <p className="text-sm text-red-500 font-medium text-center">{otpForm.formState.errors.otp.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Verifying Code...</>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
              </form>

              <div className="text-center space-y-4">
                <div className="text-base text-muted-foreground">
                  Didn't receive code?{' '}
                  {resendTimer > 0 ? (
                    <span className="font-semibold text-foreground">Resend OTP (available in ${resendTimer}s)</span>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="font-semibold text-primary hover:underline focus:outline-none"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Change Email
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 3 && (
          <motion.div
            key="step3"
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
                <h1 className="text-3xl font-bold tracking-tight text-foreground">New Password</h1>
                <p className="text-base text-muted-foreground">
                  Set a secure new password for your account.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
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
        )}

        {/* STEP 4: SUCCESS SCREEN */}
        {step === 4 && (
          <motion.div
            key="step4"
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
