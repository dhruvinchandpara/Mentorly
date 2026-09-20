'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { validateRejectionReason } from '@/lib/booking-validation';

type RejectReasonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
};

export function RejectReasonModal({ open, onOpenChange, onConfirm, submitting = false }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');

  const validation = validateRejectionReason(reason);
  const canSubmit = validation.valid && !submitting;

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('');
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
          <DialogTitle className="text-[#0F1919] font-semibold">Reject session request</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="rejection-reason" className="text-xs font-semibold text-[#4A5454]">
            Reason for rejection
          </label>
          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Please provide more detail on what you'd like to cover"
            rows={4}
            className="w-full rounded-[12px] border border-[#E8E1D2] bg-white px-3 py-2 text-sm text-[#0F1919] outline-none transition-colors focus-visible:border-[#E5E55A] focus-visible:ring-2 focus-visible:ring-[#E5E55A]"
          />
        </div>

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
            className="px-4 py-2 text-sm font-semibold text-white bg-[#BA3B41] hover:bg-[#A8343A] rounded-full disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
