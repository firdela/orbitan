import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldGuard } from '@/lib/ShieldGuard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

/**
 * GovernanceOverrideModal — OrbitanOS Shield™ UI
 * 
 * Displays when a Shield policy blocks an action.
 * Pre-populated with violation context, allows user to request manager override.
 * 
 * Props:
 * - open: boolean
 * - onOpenChange: (open) => void
 * - overrideContext: object from shieldInterceptor response
 * - onSuccess: () => void (called when override is successfully requested)
 */
export default function GovernanceOverrideModal({
  open,
  onOpenChange,
  overrideContext,
  onSuccess
}) {
  const [requesterNotes, setRequesterNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!overrideContext) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await ShieldGuard.requestOverride(base44, overrideContext, requesterNotes);
      setSubmitted(true);
      onSuccess?.();
    } catch (error) {
      setSubmitError(error.message || 'Failed to submit override request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setRequesterNotes('');
    setSubmitError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-orbitan-red" />
            <DialogTitle className="text-lg font-heading font-semibold">
              Action Blocked by Orbitan Shield™
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            This action violates a governance policy. You can request a manager override to proceed.
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <>
            {/* Violation Context */}
            <div className="bg-orbitan-red-light/50 border border-orbitan-red/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orbitan-red flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-orbitan-red uppercase tracking-wide">
                    Policy Violation
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    {overrideContext.block_reason || 'Action blocked by governance policy'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Target Entity</p>
                  <p className="font-medium text-foreground">{overrideContext.target_entity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Request Type</p>
                  <p className="font-medium text-foreground">
                    {(overrideContext.request_type || 'custom').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Justification Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Your Justification <span className="text-orbitan-red">*</span>
              </label>
              <Textarea
                value={requesterNotes}
                onChange={(e) => setRequesterNotes(e.target.value)}
                placeholder="Explain why this override is necessary (e.g. 'Emergency stock replenishment for weekend rush')"
                className="min-h-[100px] text-sm"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This justification will be sent to your manager for approval.
              </p>
            </div>

            {submitError && (
              <Alert variant="destructive" className="text-xs">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !requesterNotes.trim()}
                className="bg-orbitan-blue hover:bg-orbitan-blue/90"
              >
                {isSubmitting ? 'Submitting...' : 'Request Override'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Success State */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-orbitan-green-light rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-orbitan-green" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground mb-1">
                Override Request Submitted
              </h3>
              <p className="text-sm text-muted-foreground">
                Your manager has been notified and will review your request.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}