import React, { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Profile Photo Uploader ──────────────────────────────────
// Uploads an avatar image via the Core.UploadFile integration,
// persists the URL to user.data.photo_url via base44.auth.updateMe.
// Falls back to initials when no photo is set.
// ─────────────────────────────────────────────────────────────
export default function ProfilePhotoUploader({ size = 'md' }) {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const photoUrl = user?.data?.photo_url || user?.photo_url;

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const initial = (user?.full_name || 'U')[0]?.toUpperCase();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({
        data: { ...(user?.data || {}), photo_url: file_url },
      });
      return file_url;
    },
    onSuccess: () => {
      checkUserAuth();
      toast({ title: 'Photo updated', description: 'Your profile photo has been updated.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Could not upload photo.',
      });
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Maximum size is 5 MB.' });
      return;
    }
    uploadMutation.mutate(file);
  };

  return (
    <div className="relative group">
      <Avatar className={cn(sizeClasses[size], 'border-2 border-border')}>
        {photoUrl && <AvatarImage src={photoUrl} alt={user?.full_name || 'Profile'} />}
        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
          {initial}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        title="Change photo"
      >
        {uploadMutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}