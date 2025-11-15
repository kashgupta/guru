'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';

export default function PhonePage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else {
      // For international numbers, just return the digits
      return cleaned;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const validatePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    // Accept US numbers (10 digits) or international (more than 10)
    return cleaned.length >= 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/submit-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user info in sessionStorage and cookie
        sessionStorage.setItem('user', JSON.stringify(data.user));

        // Set cookie for middleware
        document.cookie = `user_phone=${encodeURIComponent(data.user.phoneNumber)}; path=/; max-age=31536000; SameSite=Lax`;

        // Redirect to main page
        router.push('/');
      } else {
        setError(data.message || 'Failed to submit phone number');
      }
    } catch (err) {
      console.error('Error submitting phone number:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
            <Phone className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to Guru
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your AI-powered guide for healthcare, financial, and legal assistance
          </p>
        </div>

        {/* Phone Input Card */}
        <div className="rounded-lg border bg-white p-8 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Get Started
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Please enter your phone number to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="text-lg"
                autoFocus
                disabled={isSubmitting}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting || !phoneNumber}
            >
              {isSubmitting ? 'Submitting...' : 'Continue'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              By continuing, you agree to receive messages from Guru.
              <br />
              Your privacy matters to us.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-700">Healthcare</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-700">Financial</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-700">Legal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
