import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';

export default function SignatureDialog({ open, onOpenChange, record, entityName, onSigned }) {
  const [confirmName, setConfirmName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState(null);

  const handleSign = async () => {
    setIsSigning(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('digitalSignature', {
        action: 'sign',
        entity_name: entityName,
        record_id: record.id,
      });
      onSigned?.(response.data);
      onOpenChange(false);
      setConfirmName('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to apply signature');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orbitan-green" />
            Digital Sign-Off
          </DialogTitle>
          <DialogDescription>
            By signing, you confirm the information below is accurate and complete. This action is recorded as an immutable audit trail entry with a tamper-evident content hash for SOC 2 compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Record</p>
            <p className="text-sm font-semibold text-foreground">
              {record?.title || record?.po_number || 'Untitled Record'}
            </p>
            <p className="text-xs text-muted-foreground">
              {entityName} · ID: {record?.id?.slice(0, 12)}…
            </p>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Type your full name to confirm</Label>
            <Input
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              placeholder="Enter your full legal name"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-orbitan-blue-light rounded-lg p-2.5">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-orbitan-blue" />
            <span>Your signature will be cryptographically linked to this record's content via SHA-256 hash. Any subsequent modification invalidates the signature. This is irreversible.</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSign}
            disabled={!confirmName.trim() || isSigning}
            className="gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            {isSigning ? 'Signing…' : 'Apply Digital Signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}