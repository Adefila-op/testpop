/**
 * Gift Dialog Component
 * Location: src/components/phase3/gift/GiftDialog.tsx
 * 
 * Modal dialog for creating and sending gifts
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Gift, Loader2, CheckCircle } from 'lucide-react';
import { useCreateGift } from '@/hooks/useGiftStore';
import { useFormState, useDebouncedValue } from '@/hooks/useCustomHooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: number;
  productName?: string;
  products?: Array<{ id: number; name: string }>;
  onGiftSent?: () => void;
}

interface GiftFormData {
  productId: number;
  recipientEmail: string;
  message: string;
}

export function GiftDialog({
  open,
  onOpenChange,
  productId,
  productName,
  products = [],
  onGiftSent,
}: GiftDialogProps) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<'form' | 'confirming' | 'success'>('form');

  const { mutate: createGift, isLoading, isError, error } = useCreateGift();

  const { formData, handleChange, handleSubmit, reset, errors } = useFormState<GiftFormData>(
    {
      productId: productId || 0,
      recipientEmail: '',
      message: '',
    },
    async (data) => {
      if (!isConnected) throw new Error('Please connect your wallet');
      if (!data.productId) throw new Error('Please select a product');
      if (!data.recipientEmail) throw new Error('Please enter recipient email');

      createGift(
        {
          productId: data.productId,
          recipientEmail: data.recipientEmail,
          message: data.message,
        },
        {
          onSuccess: () => {
            setStep('success');
            setTimeout(() => {
              handleClose();
              onGiftSent?.();
            }, 3000);
          },
        }
      );
    }
  );

  const debouncedEmail = useDebouncedValue(formData.recipientEmail, 500);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);

  const handleClose = () => {
    reset();
    setStep('form');
    onOpenChange(false);
  };

  const canSubmit =
    isConnected &&
    formData.productId > 0 &&
    isValidEmail &&
    !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            Send a Gift
          </DialogTitle>
          <DialogDescription>
            Send a digital gift to someone special and have it delivered directly to their wallet
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 py-4">
            {/* Wallet Check */}
            {!isConnected && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold">Wallet Not Connected</p>
                  <p>Connect your wallet to send a gift</p>
                </div>
              </div>
            )}

            {/* Product Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Product to Gift</label>
              {productId ? (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold">{productName}</p>
                  <p className="text-xs text-gray-600">Ready to gift</p>
                </div>
              ) : (
                <Select
                  value={formData.productId.toString()}
                  onValueChange={(value) => handleChange('productId', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Recipient Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Recipient Email</label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={formData.recipientEmail}
                onChange={(e) => handleChange('recipientEmail', e.target.value)}
                disabled={!isConnected}
              />
              {isValidEmail && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Valid email address
                </p>
              )}
              {formData.recipientEmail && !isValidEmail && (
                <p className="text-xs text-red-600">Invalid email format</p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Message (Optional)</label>
              <textarea
                placeholder="Write a personal message..."
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows={3}
                disabled={!isConnected}
                maxLength={500}
              />
              <p className="text-xs text-gray-600 text-right">
                {formData.message.length}/500
              </p>
            </div>

            {/* Error Messages */}
            {isError && error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold">Error</p>
                  <p>{(error as any)?.message || 'Failed to send gift'}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={!canSubmit}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Send Gift
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirming' && (
          <div className="space-y-4 py-8 text-center">
            <div className="flex justify-center">
              <div className="animate-spin">
                <Gift className="w-12 h-12 text-pink-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Processing your gift...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-semibold">Gift Sent Successfully! 🎉</p>
              <p className="text-sm text-gray-600">
                A claim email has been sent to <span className="font-mono">{formData.recipientEmail}</span>
              </p>
              <p className="text-xs text-gray-500">
                They can claim their gift within 90 days
              </p>
            </div>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 space-y-2 text-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">Recipient Email:</span> {formData.recipientEmail}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Product:</span> {productName}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default GiftDialog;
