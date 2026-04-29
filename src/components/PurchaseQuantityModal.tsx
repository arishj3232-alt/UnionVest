import React, { useEffect, useState } from 'react';
import { X, Minus, Plus, ShoppingCart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VIPPack } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  pack?: VIPPack;
  walletBalance: number;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  onRecharge: () => void;
}

const MAX_QTY = 50;

const PurchaseQuantityModal: React.FC<Props> = ({
  isOpen, pack, walletBalance, isProcessing, onClose, onConfirm, onRecharge,
}) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => { if (isOpen) setQuantity(1); }, [isOpen, pack?.id]);

  if (!isOpen || !pack) return null;

  const total = pack.price * quantity;
  const insufficient = total > walletBalance;
  const shortBy = insufficient ? total - walletBalance : 0;

  const dec = () => setQuantity((q) => Math.max(1, q - 1));
  const inc = () => setQuantity((q) => Math.min(MAX_QTY, q + 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => !isProcessing && onClose()} />
      <div className={cn("relative w-full max-w-sm bg-card rounded-md shadow-2xl overflow-hidden border border-border animate-scale-in")}>
        <div className="h-1 bg-primary" />
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="p-6 text-center">
          <div className="flex justify-center mb-3">
            <ShoppingCart className="w-12 h-12 text-primary" strokeWidth={2.25} />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-1 uppercase tracking-wider">
            {pack.name}
          </h2>
          <p className="text-xs text-muted-foreground mb-5 uppercase tracking-wider">
            {pack.category === 'silver' ? 'Worker' : 'Leadership'} Plan · Level {pack.level}
          </p>

          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              type="button"
              onClick={dec}
              disabled={isProcessing || quantity <= 1}
              className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="min-w-[64px]">
              <p className="font-display text-4xl font-bold text-foreground tabular-nums">{quantity}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity</p>
            </div>
            <button
              type="button"
              onClick={inc}
              disabled={isProcessing || quantity >= MAX_QTY}
              className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Breakdown */}
          <div className="bg-muted/50 rounded-md border border-border p-3 mb-4 text-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price per pack</span>
              <span className="font-semibold tabular-nums">₹{pack.price.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-semibold tabular-nums">× {quantity}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider">Total</span>
              <span className={cn(
                "font-display font-bold text-lg tabular-nums",
                insufficient ? "text-destructive" : "text-primary"
              )}>
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Wallet balance</span>
              <span className="tabular-nums text-muted-foreground">₹{walletBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {insufficient && (
            <div className="flex items-start gap-2 text-left bg-destructive/10 border border-destructive/30 rounded-md p-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-destructive">Insufficient balance</p>
                <p className="text-muted-foreground">Short by ₹{shortBy.toLocaleString('en-IN')}. Recharge to continue.</p>
              </div>
            </div>
          )}

          {insufficient ? (
            <Button
              onClick={onRecharge}
              variant="valentine"
              size="lg"
              className="w-full uppercase tracking-wider"
            >
              Recharge Now
            </Button>
          ) : (
            <Button
              onClick={() => onConfirm(quantity)}
              disabled={isProcessing}
              variant="valentine"
              size="lg"
              className="w-full uppercase tracking-wider"
            >
              {isProcessing
                ? 'Processing…'
                : `Confirm · ₹${total.toLocaleString('en-IN')}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseQuantityModal;