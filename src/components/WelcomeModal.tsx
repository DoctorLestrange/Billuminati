import React from 'react';
import { ExternalLink, FileText, Building2, ShieldAlert, X } from 'lucide-react';

interface WelcomeModalProps {
  onDismiss: () => void;
  onSetupSellerProfile: () => void;
}

export const GITHUB_REPO_URL = 'https://github.com/DoctorLestrange/Billuminati';

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  onDismiss,
  onSetupSellerProfile,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2a2a2e] rounded-xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-[#2a2a2e]">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              First-Time Workspace Setup · Open-Source Project
            </p>
            <h2
              id="welcome-modal-title"
              className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Welcome to <span className="font-brand">Billuminati</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close welcome screen"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#26262a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          <p className="text-sm text-zinc-800 dark:text-zinc-200">
            <strong>Billuminati</strong> is an{' '}
            <strong>open-source, AI-generated</strong> GST Tax Invoice and
            billing studio designed for fast, offline-capable invoicing,
            bidirectional tax calculations, and print-ready PDF exports.
          </p>

          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-[#202024] border border-zinc-200 dark:border-[#2a2a2e] space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Official GitHub Repository
              </span>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                <span>github.com/DoctorLestrange/Billuminati</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              All invoices, seller details, logos, and catalog presets are stored
              locally in your browser (<code>localStorage</code>) with portable
              JSON backup and restore.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
            <div>
              <strong className="font-semibold">
                Use at Your Own Risk:
              </strong>{' '}
              Because this is an open-source, AI-generated utility provided
              &ldquo;AS IS&rdquo; without warranties, please verify all GST
              calculations, tax rates, and invoice details independently. The
              developer assumes no responsibility or liability for its use.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50/80 dark:bg-[#1c1c20] border-t border-zinc-200 dark:border-[#2a2a2e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline-offset-4 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Source on GitHub
          </a>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onSetupSellerProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-white dark:bg-[#26262a] border border-zinc-300 dark:border-[#36363d] hover:bg-zinc-100 dark:hover:bg-[#303036] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              Set Up Seller Profile
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
