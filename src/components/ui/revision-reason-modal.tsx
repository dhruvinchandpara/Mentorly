'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { validateRevisionReason } from '@/lib/booking-validation';

type RevisionReasonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
  error?: string | null;
};

export function RevisionReasonModal({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
  error = null,
}: RevisionReasonModalProps) {
  const [reason, setReason] = useState('');

  const validation = validateRevisionReason(reason);
  const canSubmit = validation.valid && !submitting;

  // Clear reason whenever the modal transitions to closed, regardless of whether
  // that came from a user-driven close or a controlled `open` prop change from the
  // parent (e.g. closing on a successful submit) — see RejectReasonModal for why
  // this must be driven by `open`, not just the onOpenChange callback.
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white rounded-[20px] border border-[#E8E1D2] ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0F1919] font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#DFA396]" />
            Send back for revision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="revision-reason" className="text-xs font-semibold text-[#4A5454]">
            Reason for revision
          </label>
          <textarea
            id="revision-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., The student actionables are too vague to follow up on"
            rows={4}
            maxLength={500}
            className="w-full rounded-[12px] border border-[#E8E1D2] bg-white px-3 py-2 text-sm text-[#0F1919] outline-none transition-colors focus-visible:border-[#E5E55A] focus-visible:ring-2 focus-visible:ring-[#E5E55A]"
          />
          <p className="text-[11px] text-[#7C8585] text-right">{reason.length}/500</p>
        </div>

        {error && <p className="text-sm text-[#702327]">{error}</p>}

        <DialogFooter className="bg-white border-t border-[#E8E1D2] rounded-b-[20px]">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-[#0F1919] border border-[#0F1919]/20 rounded-full hover:bg-[#FBF4D7] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold text-[#0F1919] bg-white border border-[#0F1919]/30 hover:bg-[var(--peach-beige)]/25 rounded-full disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Sending…' : 'Send back for revision'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
