import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface CitizenAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

export const CitizenAuthModal: React.FC<CitizenAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser.phone_number || '9876543210');
  const [fullName, setFullName] = useState<string>(currentUser.full_name || 'vgiri');
  const [otpStage, setOtpStage] = useState<'phone' | 'otp' | 'success'>('phone');
  const [otpCode, setOtpCode] = useState<string>('');
  const [virtualSmsToast, setVirtualSmsToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setErrorMsg(null);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      setVirtualSmsToast(data.virtualSmsToast || 'SMS dispatched to mobile device.');
      setOtpCode('');
      setResendCooldown(30);
      setOtpStage('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    if (otpCode.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      const updated: UserProfile = {
        ...currentUser,
        phone_number: `+91 ${cleanPhone}`,
        full_name: fullName,
      };
      onUpdateUser(updated);
      setOtpStage('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-stitch-card shadow-2xl max-w-md w-full border border-stitch-surface-border overflow-hidden">
        <div className="bg-stitch-navy text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-stitch-terracotta-light">
              PASSWORDLESS CITIZEN IDENTITY
            </span>
            <h2 id="auth-modal-title" className="text-h3 font-black text-white">
              {otpStage === 'otp' ? 'Enter 6-Digit OTP' : 'Citizen Verification'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-sm"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-stitch-btn bg-stitch-emergency-surface border border-stitch-emergency-border text-stitch-emergency text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {otpStage === 'phone' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="auth-full-name" className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1">
                  Full Citizen Name
                </label>
                <input
                  id="auth-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full min-h-touch px-3.5 py-2.5 border border-stitch-surface-border rounded-stitch-btn text-sm font-semibold text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="auth-phone-num" className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1">
                  Mobile Number (India +91)
                </label>
                <input
                  id="auth-phone-num"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9876543210"
                  className="w-full min-h-touch px-3.5 py-2.5 border border-stitch-surface-border rounded-stitch-btn text-sm font-semibold text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                />
              </div>

              <div className="p-3 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border text-xs text-stitch-ink-muted">
                <strong>DPDP Act 2023:</strong> Your mobile number is indexed via a salted SHA-256 hash and encrypted at rest with AES-256-GCM. We never share personal data with third parties.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className="w-full min-h-touch px-6 py-2.5 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white font-bold text-sm shadow-stitch-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Dispatching SMS OTP...' : 'Send Verification OTP \u2192'}
                </button>
              </div>
            </div>
          )}

          {otpStage === 'otp' && (
            <div className="space-y-4">
              {virtualSmsToast && (
                <div className="p-3 bg-blue-50 rounded-stitch-btn border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm text-blue-700 shrink-0 mt-0.5">sms</span>
                  <div className="flex-1">
                    <span className="font-mono text-[10px] font-bold text-blue-800 uppercase block">
                      SMS Gateway Delivery
                    </span>
                    <p className="mt-0.5 font-medium">{virtualSmsToast}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-otp-code" className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  id="auth-otp-code"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoComplete="one-time-code"
                  className="w-full min-h-touch text-center tracking-widest text-xl font-mono font-bold px-3.5 py-2.5 border border-stitch-surface-border rounded-stitch-btn text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStage('phone');
                    setVirtualSmsToast(null);
                  }}
                  className="text-stitch-ink-muted hover:underline"
                >
                  Edit Number
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="font-bold text-stitch-navy hover:text-stitch-terracotta disabled:text-slate-400"
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={otpCode.length !== 6 || loading}
                  onClick={handleVerifyOtp}
                  className="w-full min-h-touch px-6 py-2.5 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-sm shadow-stitch-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In \u2192'}
                </button>
              </div>
            </div>
          )}

          {otpStage === 'success' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl mx-auto">
                <span className="material-symbols-outlined text-xl">check</span>
              </div>
              <h3 className="text-h3 font-black text-stitch-ink-primary">
                Identity Verified
              </h3>
              <p className="text-xs text-stitch-ink-secondary">
                Citizen profile active for <strong>{fullName}</strong> (+91 {cleanPhone}).
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-touch px-6 py-2.5 rounded-stitch-btn bg-slate-800 text-white font-bold text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
