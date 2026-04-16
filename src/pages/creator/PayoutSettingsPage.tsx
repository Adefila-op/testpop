/**
 * Payout Settings Page
 * Location: src/pages/creator/PayoutSettingsPage.tsx
 * 
 * Configure creator's payout method and address
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSetPayoutMethod } from '@/hooks/usePayoutStore';
import { useGetPayoutMethod } from '@/hooks/usePayoutStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, DollarSign, Wallet } from 'lucide-react';
import { useFormState } from '@/hooks/useCustomHooks';

interface PayoutSettings {
  method: 'bank' | 'crypto' | 'stripe';
  payoutAddress?: string;
  bankAccount?: {
    accountHolder: string;
    iban: string;
  };
}

export function PayoutSettingsPage() {
  const { address, isConnected } = useAccount();
  const { data: currentMethod, isLoading: methodLoading } = useGetPayoutMethod();
  const { mutate: setPayoutMethod, isLoading: settingLoading } = useSetPayoutMethod();

  const { formData, handleChange, handleSubmit, errors, isSubmitting } = useFormState<PayoutSettings>(
    {
      method: 'crypto',
      payoutAddress: address,
      bankAccount: { accountHolder: '', iban: '' },
    },
    async (data) => {
      if (!isConnected) throw new Error('Please connect your wallet');

      setPayoutMethod(
        {
          method: data.method,
          payoutAddress: data.payoutAddress || address,
          bankAccount: data.bankAccount,
        },
        {
          onSuccess: () => {
            // Success
          },
        }
      );
    }
  );

  if (!isConnected) {
    return (
      <div className="space-y-4 p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to configure payout settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Payout Settings</h1>
        <p className="text-gray-600">Configure how you receive your earnings</p>
      </div>

      {/* Current Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Current Payout Method
          </CardTitle>
          <CardDescription>
            Your earnings will be sent using this method
          </CardDescription>
        </CardHeader>
        <CardContent>
          {methodLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <Badge className="px-4 py-2 text-base">
              <CheckCircle className="w-4 h-4 mr-2" />
              {currentMethod?.method || 'Not configured'}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Payout Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Payout Method</CardTitle>
          <CardDescription>Select how you want to receive payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Crypto Option */}
            <button
              onClick={() => handleChange('method', 'crypto')}
              className={`p-4 border rounded-lg text-center transition-all cursor-pointer ${
                formData.method === 'crypto'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Wallet className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold">Crypto Wallet</p>
              <p className="text-xs text-gray-600 mt-1">Direct to Ethereum wallet</p>
            </button>

            {/* Bank Transfer Option */}
            <button
              onClick={() => handleChange('method', 'bank')}
              className={`p-4 border rounded-lg text-center transition-all cursor-pointer ${
                formData.method === 'bank'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="font-semibold">Bank Transfer</p>
              <p className="text-xs text-gray-600 mt-1">SEPA or international transfer</p>
            </button>

            {/* Stripe Option */}
            <button
              onClick={() => handleChange('method', 'stripe')}
              className={`p-4 border rounded-lg text-center transition-all cursor-pointer ${
                formData.method === 'stripe'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Wallet className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="font-semibold">Stripe</p>
              <p className="text-xs text-gray-600 mt-1">Via Stripe Connect</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Method-Specific Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configure {formData.method === 'crypto' ? 'Wallet' : formData.method === 'bank' ? 'Bank Account' : 'Stripe'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.method === 'crypto' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Ethereum Address</label>
              <Input
                type="text"
                placeholder="0x..."
                value={formData.payoutAddress || address}
                onChange={(e) => handleChange('payoutAddress', e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-gray-600">
                Must be a valid Ethereum address starting with 0x
              </p>
            </div>
          )}

          {formData.method === 'bank' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Account Holder Name</label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={formData.bankAccount?.accountHolder || ''}
                  onChange={(e) =>
                    handleChange('bankAccount', {
                      ...formData.bankAccount,
                      accountHolder: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">IBAN</label>
                <Input
                  type="text"
                  placeholder="DE89370400440532013000"
                  value={formData.bankAccount?.iban || ''}
                  onChange={(e) =>
                    handleChange('bankAccount', {
                      ...formData.bankAccount,
                      iban: e.target.value,
                    })
                  }
                  className="font-mono"
                />
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold">Bank transfers may take 1-3 business days</p>
                  <p className="text-xs mt-1">Conversion from ETH to your local currency applies</p>
                </div>
              </div>
            </div>
          )}

          {formData.method === 'stripe' && (
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                Connect Stripe Account
              </Button>
              <p className="text-xs text-gray-600">
                You'll be redirected to Stripe to authorize the connection
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2">
        <Button
          onClick={() => handleSubmit()}
          disabled={settingLoading || isSubmitting}
          className="px-8"
          size="lg"
        >
          {settingLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

export default PayoutSettingsPage;
