import React, { useState, useRef } from 'react';
import { StateUT, DistrictRouting } from '../types';

interface AdministrativeEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedState: StateUT;
  selectedDistrict: DistrictRouting;
  onSubmitDossier?: (dossier: any) => void;
}

export const AdministrativeEscalationModal: React.FC<AdministrativeEscalationModalProps> = ({
  isOpen,
  onClose,
  selectedState,
  selectedDistrict,
  onSubmitDossier,
}) => {
  const [issueSubject, setIssueSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);
  const [isConfidential, setIsConfidential] = useState<boolean>(true);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedRefId, setSubmittedRefId] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileSize, setAttachedFileSize] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  const handleVoiceToggle = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsVoiceRecording((prev) => !prev);
      return;
    }

    if (isVoiceRecording) {
      recognitionRef.current?.stop();
      setIsVoiceRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setDescription((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        };
        recognition.onerror = () => {
          setIsVoiceRecording(false);
        };
        recognition.onend = () => {
          setIsVoiceRecording(false);
        };
        recognition.start();
        recognitionRef.current = recognition;
        setIsVoiceRecording(true);
      } catch {
        setIsVoiceRecording(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!validExtensions.includes(ext)) {
        setUploadError('Invalid format. Supported: PDF, JPG, PNG, DOC up to 15MB.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadError('File exceeds 15MB maximum size limit.');
        return;
      }

      setAttachedFileName(file.name);
      setAttachedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueSubject) {
      alert('Please select an Incident / Issue Subject before submitting.');
      return;
    }
    if (!description.trim()) {
      alert('Please provide a detailed complaint description for the District Magistrate.');
      return;
    }

    const stateCode = selectedState.code || 'IN';
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const refId = `CPG-2026-DM-${stateCode}-${randomSeq}`;
    setSubmittedRefId(refId);
    setIsSubmitted(true);

    if (onSubmitDossier) {
      onSubmitDossier({
        refId,
        issueSubject,
        description,
        isConfidential,
        district: selectedDistrict.district_name,
        state: selectedState.name,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalation-desk-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-start sm:py-6 px-0 sm:px-4"
    >
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl relative border-x border-slate-200 flex flex-col overflow-hidden animate-fadeIn my-auto">
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Top iOS Status Bar */}
        <div className="w-full bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-slate-800 border-b border-slate-100 sticky top-0 z-30">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-800">
            <span className="material-symbols-outlined text-[13px]">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-[13px]">wifi</span>
            <span className="material-symbols-outlined text-[15px]">battery_full</span>
          </div>
        </div>

        {/* Top Navigation Header */}
        <header className="bg-white px-4 py-3 border-b border-slate-200 sticky top-7 z-20">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Go back to categories"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 bg-blue-50/80 active:bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Categories</span>
            </button>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-300 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Direct Desk Escalation
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 space-y-4 pb-12">
          {isSubmitted ? (
            <div className="space-y-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  APEX ESCALATION DOSSIER TRANSMITTED
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {submittedRefId}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Routed to {selectedDistrict.district_name} District Magistrate &amp; Municipal Commissioner
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Subject</span>
                  <span className="font-bold text-slate-800">{issueSubject}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Dispatched to DM Office
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Confidentiality</span>
                  <span className="font-semibold text-emerald-700">
                    {isConfidential ? 'Protected Whistleblower Identity' : 'Public Transparency'}
                  </span>
                </div>
                {attachedFileName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Evidence Attached</span>
                    <span className="font-mono text-slate-700 truncate max-w-[180px]">
                      {attachedFileName} ({attachedFileSize})
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Close Escalation Desk
              </button>
            </div>
          ) : (
            <>
              {/* Government Banner */}
              <section className="bg-stitch-navy text-white rounded-stitch-card p-4 shadow-stitch-sm border border-stitch-navy-light/30 relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 text-lg shadow-inner">
                      <span className="material-symbols-outlined">balance</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">
                        Civic Helpline Portal • Option 6
                      </span>
                      <h1 id="escalation-desk-title" className="text-sm font-extrabold leading-snug">
                        Administrative Grievance Desk
                      </h1>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg px-2.5 py-1.5 border border-white/10 text-[11px] text-blue-100 font-medium">
                    District Magistrate &amp; Municipal Commissioner Office ({selectedDistrict.district_name})
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-100/90 pt-0.5">
                    Escalate unlisted municipal disputes, official inaction, public safety or police coordination directly to apex nodal officers.
                  </p>
                </div>
              </section>

              {/* Key Authority Hotlines */}
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-600 text-sm">bolt</span>
                    Key Authority Hotlines
                  </h2>
                  <span className="text-[10px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    24x7 Nodal Access
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Card 1: Dial 100/112 */}
                  <div className="bg-white rounded-xl p-3 border border-red-200 shadow-xs hover:border-red-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm mb-2 border border-red-100">
                        <span className="material-symbols-outlined text-base">shield</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Dial 100 / 112</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Police Emergency &amp; PCR Control
                      </p>
                    </div>
                    <a
                      href="tel:112"
                      className="mt-2.5 inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg text-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">call</span>
                      <span>Call 112</span>
                    </a>
                  </div>

                  {/* Card 2: IAS Collectorate Desk */}
                  <div className="bg-white rounded-xl p-3 border border-blue-200 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center text-sm mb-2 border border-blue-100">
                        <span className="material-symbols-outlined text-base">account_balance</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">IAS Collectorate Desk</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        District Magistrate Control Room
                      </p>
                    </div>
                    <a
                      href={`tel:${selectedState.nodal_helpline || '1902'}`}
                      className="mt-2.5 inline-flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg text-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">cell_tower</span>
                      <span>DM Hotline</span>
                    </a>
                  </div>

                  {/* Card 3: CM Helpline */}
                  <div className="bg-white rounded-xl p-3 border border-indigo-200 shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm mb-2 border border-indigo-100">
                        <span className="material-symbols-outlined text-base">support_agent</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">CM Helpline</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {selectedState.nodal_helpline || '1902'} | 181 Toll Free
                      </p>
                    </div>
                    <a
                      href={`tel:${selectedState.nodal_helpline || '1902'}`}
                      className="mt-2.5 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg text-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">call</span>
                      <span>Dial {selectedState.nodal_helpline || '1902'}</span>
                    </a>
                  </div>

                  {/* Card 4: Municipal Commissioner */}
                  <div className="bg-white rounded-xl p-3 border border-teal-200 shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm mb-2 border border-teal-100">
                        <span className="material-symbols-outlined text-base">location_city</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 leading-tight">Municipal Commissioner</h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        ULB Public Grievance Cell
                      </p>
                    </div>
                    <a
                      href="tel:155304"
                      className="mt-2.5 inline-flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg text-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">forum</span>
                      <span>ULB Desk</span>
                    </a>
                  </div>
                </div>
              </section>

              {/* Escalation Grievance Dossier Form */}
              <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-900 text-base">edit_note</span>
                      Escalation Grievance Dossier
                    </h2>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Form Ref #ADM-2026
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Please specify precise facts to fast-track administrative intervention.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Dropdown: Issue Subject */}
                  <div className="space-y-1">
                    <label htmlFor="escalation-subject" className="block text-xs font-semibold text-slate-700">
                      Incident / Issue Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="escalation-subject"
                      value={issueSubject}
                      onChange={(e) => setIssueSubject(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="" disabled>
                        Select category for DM review...
                      </option>
                      <option value="Unlisted Civic Hazard">Unlisted Civic Hazard</option>
                      <option value="Encroachment & Public Space">Encroachment &amp; Public Space</option>
                      <option value="Officer Non-Responsiveness / Delay">
                        Officer Non-Responsiveness / Delay
                      </option>
                      <option value="Local Public Dispute / Law & Order">
                        Local Public Dispute / Law &amp; Order
                      </option>
                    </select>
                  </div>

                  {/* Description Box with Voice Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label htmlFor="escalation-desc" className="block text-xs font-semibold text-slate-700">
                        Description of Complaint <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleVoiceToggle}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
                      >
                        <span className={`material-symbols-outlined text-[13px] text-red-500 ${isVoiceRecording ? 'animate-pulse' : ''}`}>
                          mic
                        </span>
                        <span>{isVoiceRecording ? 'Listening...' : 'Voice Input'}</span>
                      </button>
                    </div>
                    <textarea
                      id="escalation-desc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter detailed complaint description for District Magistrate review (dates, location, officials contacted)..."
                      className="w-full text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
                    />
                  </div>

                  {/* Attach Reference Evidence */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Attach Reference Evidence{' '}
                      <span className="text-slate-400 font-normal">(Photos, Notice copies, FIR)</span>
                    </label>

                    {uploadError && (
                      <p className="text-[10px] text-red-600 font-semibold">{uploadError}</p>
                    )}

                    {attachedFileName ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-900 text-lg">description</span>
                          <div>
                            <p className="text-xs font-bold text-slate-800 truncate">{attachedFileName}</p>
                            <p className="text-[10px] text-slate-500">{attachedFileSize}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedFileName('');
                            setAttachedFileSize('');
                          }}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50/70 hover:bg-blue-50/40 transition-colors cursor-pointer flex items-center justify-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-sm">cloud_upload</span>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-slate-700">
                            Upload documents or photos
                          </p>
                          <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 15MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Citizen Verification Block */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">verified_user</span>
                      Citizen Verification
                    </h3>

                    {/* Aadhaar Jan-Samvaad Badge */}
                    <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-emerald-950">Aadhaar Jan-Samvaad</span>
                            <span className="text-[9px] bg-emerald-200 text-emerald-800 font-bold px-1.5 rounded">
                              VERIFIED
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 font-mono">UIDAI Masked: XXXX-XXXX-4819</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                    </div>

                    {/* Confidential Whistleblower Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <div className="pr-2">
                        <label
                          htmlFor="confidential-toggle"
                          className="text-xs font-bold text-slate-800 cursor-pointer block"
                        >
                          Confidential Whistleblower Protection
                        </label>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Seal citizen identity from local station handlers under Official Secret Protection.
                        </p>
                      </div>
                      <button
                        id="confidential-toggle"
                        type="button"
                        onClick={() => setIsConfidential(!isConfidential)}
                        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                          isConfidential ? 'bg-blue-900' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            isConfidential ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Primary Submit CTA */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-blue-900 hover:bg-blue-800 text-white rounded-xl py-3 px-4 shadow-md transition-all font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span>SUBMIT DOSSIER TO DISTRICT MAGISTRATE (उच्चाधिकारी को भेजें)</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-2 font-medium">
                      Routed under Centralized Public Grievance Redress and Monitoring System (CPGRAMS)
                    </p>
                  </div>
                </form>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
