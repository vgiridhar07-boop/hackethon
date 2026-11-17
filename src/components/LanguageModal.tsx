import React from 'react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'sant', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'ks', name: 'Kashmiri', native: 'कॉशुर' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी' },
  { code: 'mni', name: 'Manipuri', native: 'ꯃꯤꯇꯩꯂꯣꯟ' },
];

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  activeLanguage,
  onSelectLanguage,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-stitch-card shadow-2xl max-w-xl w-full border border-stitch-surface-border overflow-hidden">
        <div className="bg-stitch-navy text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-stitch-terracotta-light">
              BHASHINI INDIC LANGUAGE ACCESSIBILITY
            </span>
            <h2 id="lang-modal-title" className="text-h3 font-black text-white">
              Choose Preferred Language (22 Official)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-sm"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-stitch-ink-muted">
            Civic Helpline India supports real-time multi-vernacular speech-to-text and UI localization powered by the National Language Translation Mission (Bhashini).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {LANGUAGES.map((lang) => {
              const isSelected = activeLanguage.toLowerCase().includes(lang.name.toLowerCase());
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    onSelectLanguage(lang.name);
                    onClose();
                  }}
                  className={`min-h-touch p-2.5 rounded-stitch-btn text-left border transition-all ${
                    isSelected
                      ? 'border-stitch-terracotta bg-stitch-terracotta-light/40 ring-2 ring-stitch-terracotta text-stitch-navy font-bold'
                      : 'border-stitch-surface-border bg-white hover:bg-slate-50 text-stitch-ink-primary'
                  }`}
                >
                  <div className="text-sm font-bold">{lang.native}</div>
                  <div className="text-[11px] text-stitch-ink-muted">{lang.name}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-stitch-surface-border flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-touch px-5 py-2 rounded-stitch-btn bg-slate-800 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

