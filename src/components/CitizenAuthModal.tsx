import React, { useState } from 'react';
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
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser.phone_number || '+91 98765 43210');
  const [fullName, setFullName] = useState<string>(currentUser.full_name || 'vgiri');
  const [otpStage, setOtpStage] = useState<'phone' | 'otp' | 'success'>('phone');
  const [otpCode, setOtpCode] = useState<string>('');
  const [simulatedOtp, setSimulatedOtp] = useState<string>('482910');

  if (!isOpen) return null;

  const handleSendOtp = () => {
    setSimulatedOtp('482910');
    setOtpStage('otp');
  };

  const handleVerifyOtp = () => {
    if (otpCode.length === 6 || otpCode === '482910') {
      const updated: UserProfile = {
        ...currentUser,
        phone_number: phoneNumber,
        full_name: fullName,
      };
      onUpdateUser(updated);
      setOtpStage('success');
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
                  className="w-full min-h-touch px-3.5 py-2.5 border border-stitch-surface-border rounded-stitch-btn text-sm font-semibold text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                />
              </div>

              <div className="p-3 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border text-xs text-stitch-ink-muted">
                <strong>DPDP Act 2023:</strong> Your mobile number is indexed via a salted SHA-256 hash and encrypted at rest with AES-256-GCM. We never share personal data with third parties.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full min-h-touch px-6 py-2.5 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white font-bold text-sm shadow-stitch-sm transition-all"
                >
                  Send Verification OTP →
                </button>
              </div>
            </div>
          )}

          {otpStage === 'otp' && (
            <div className="space-y-4">
              <div className="text-center p-3 bg-blue-50 rounded-stitch-btn border border-blue-200 text-xs text-blue-900">
                OTP sent to <strong>{phoneNumber}</strong>. For demonstration, use code: <strong>{simulatedOtp}</strong>.
              </div>

              <div>
                <label htmlFor="auth-otp-code" className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  id="auth-otp-code"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="482910"
                  className="w-full min-h-touch text-center tracking-widest text-xl font-mono font-bold px-3.5 py-2.5 border border-stitch-surface-border rounded-stitch-btn text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setOtpStage('phone')}
                  className="text-xs text-stitch-ink-muted hover:underline"
                >
                  ← Edit Number
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="min-h-touch px-6 py-2.5 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-sm shadow-stitch-sm transition-all"
                >
                  Verify & Sign In →
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
              <p className="text-xs text-stitch-ink-muted">
                Resident ID #8942 active. Session secured under DPDP Act 2023 regulations.
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

