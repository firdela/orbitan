import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';

export default function CheckoutCancelled() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <OrbitanWordmark size="sm" variant="dark" showOS className="justify-center mb-8" />

        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Checkout Cancelled</h1>
        <p className="text-muted-foreground mt-3">
          No charge was made. You can try again whenever you're ready.
        </p>
        <div className="mt-8 space-y-3">
          <Link to="/checkout">
            <Button className="w-full h-11">
              View Plans Again
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full h-11">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}