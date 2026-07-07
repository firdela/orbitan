import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Brief delay to allow webhook to process
    const timer = setTimeout(() => setVerifying(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <OrbitanWordmark size="sm" variant="dark" showOS className="justify-center mb-8" />

        {verifying ? (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground">Activating your subscription...</h1>
            <p className="text-muted-foreground mt-2">Please wait while we confirm your payment.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Subscription Activated!</h1>
            <p className="text-muted-foreground mt-3">
              Your Orbitan subscription is now active. Welcome to the future of workforce operations.
            </p>
            <div className="mt-8 space-y-3">
              <Link to="/onboarding">
                <Button className="w-full h-11">
                  Set Up Your Organisation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full h-11">
                  Back to Home
                </Button>
              </Link>
            </div>
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-6">
                Session ID: {sessionId}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}