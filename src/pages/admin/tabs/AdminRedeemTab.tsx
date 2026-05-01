import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  adminCreateRedeemCode,
  adminDeleteRedeemCode,
  adminListRedeemClaims,
  adminListRedeemCodes,
  adminSetRedeemCodeActive,
  type AdminRedeemClaimRow,
  type AdminRedeemCodeRow,
} from "@/services/redeemService";

export const AdminRedeemTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyCodeId, setBusyCodeId] = useState<string | null>(null);
  const [codes, setCodes] = useState<AdminRedeemCodeRow[]>([]);
  const [claims, setClaims] = useState<AdminRedeemClaimRow[]>([]);
  const [form, setForm] = useState({
    code: "",
    rewardAmount: "100",
    maxClaims: "100",
  });

  const loadCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await adminListRedeemCodes();
      const claimRows = await adminListRedeemClaims();
      setCodes(rows);
      setClaims(claimRows);
    } catch (error) {
      toast({
        title: "Failed to load redeem codes",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const onCreate = async () => {
    if (!form.code.trim()) {
      toast({ title: "Code is required", variant: "destructive" });
      return;
    }
    const rewardAmount = Number(form.rewardAmount);
    const maxClaims = Number(form.maxClaims);
    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      toast({ title: "Reward amount must be greater than 0", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(maxClaims) || maxClaims <= 0) {
      toast({ title: "Max claims must be a positive integer", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await adminCreateRedeemCode({
        code: form.code.trim().toUpperCase(),
        rewardAmount,
        maxClaims,
        isActive: true,
      });
      toast({ title: "Redeem code created" });
      setForm({ code: "", rewardAmount: "100", maxClaims: "100" });
      await loadCodes();
      onChanged?.();
    } catch (error) {
      toast({
        title: "Failed to create redeem code",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onToggleActive = async (row: AdminRedeemCodeRow) => {
    setBusyCodeId(row.id);
    try {
      await adminSetRedeemCodeActive(row.id, !row.is_active);
      toast({ title: `Code ${!row.is_active ? "activated" : "terminated"}` });
      await loadCodes();
      onChanged?.();
    } catch (error) {
      toast({
        title: "Failed to update code",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyCodeId(null);
    }
  };

  const onDeleteCode = async (row: AdminRedeemCodeRow) => {
    if (!window.confirm(`Delete redeem code "${row.code}"? This will also remove its claim records.`)) {
      return;
    }
    setBusyCodeId(row.id);
    try {
      await adminDeleteRedeemCode(row.id);
      toast({ title: "Redeem code deleted" });
      await loadCodes();
      onChanged?.();
    } catch (error) {
      toast({
        title: "Failed to delete code",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
    finally {
      setBusyCodeId(null);
    }
  };

  const runningCodes = codes.filter((row) => row.is_active && Number(row.claims_used) < Number(row.max_claims));
  const endedCodes = codes.filter((row) => !row.is_active || Number(row.claims_used) >= Number(row.max_claims));

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-4 rounded-lg border border-border/40 p-5">
        <h3 className="text-base font-semibold">Create Redeem Code</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Code (e.g. UNIONVEST100)"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Reward amount"
            value={form.rewardAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, rewardAmount: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Max claims"
            value={form.maxClaims}
            onChange={(e) => setForm((prev) => ({ ...prev, maxClaims: e.target.value }))}
          />
        </div>
        <Button onClick={onCreate} disabled={isSaving}>
          {isSaving ? "Creating..." : "Create Code"}
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 p-4">
        <h3 className="text-base font-semibold mb-3">Running Redeem Codes</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading redeem codes...</p>
        ) : runningCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No running codes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3">Code</th>
                  <th className="text-left py-2 pr-3">Reward</th>
                  <th className="text-left py-2 pr-3">Claims</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {runningCodes.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{row.code}</td>
                    <td className="py-2 pr-3">₹{Number(row.reward_amount).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      {Number(row.claims_used).toLocaleString()} / {Number(row.max_claims).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">Running</td>
                    <td className="py-2 space-x-2">
                      <Button variant="outline" size="sm" disabled={busyCodeId === row.id} onClick={() => onToggleActive(row)}>
                        Terminate
                      </Button>
                      <Button variant="destructive" size="sm" disabled={busyCodeId === row.id} onClick={() => onDeleteCode(row)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/40 p-4">
        <h3 className="text-base font-semibold mb-3">Used / Ended Codes</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading ended codes...</p>
        ) : endedCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ended codes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3">Code</th>
                  <th className="text-left py-2 pr-3">Reward</th>
                  <th className="text-left py-2 pr-3">Claims</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {endedCodes.map((row) => {
                  const limitReached = Number(row.claims_used) >= Number(row.max_claims);
                  return (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">{row.code}</td>
                      <td className="py-2 pr-3">₹{Number(row.reward_amount).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        {Number(row.claims_used).toLocaleString()} / {Number(row.max_claims).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">{limitReached ? "Limit Reached" : "Terminated"}</td>
                      <td className="py-2 space-x-2">
                        <Button variant="outline" size="sm" disabled={busyCodeId === row.id || limitReached} onClick={() => onToggleActive(row)}>
                          Activate
                        </Button>
                        <Button variant="destructive" size="sm" disabled={busyCodeId === row.id} onClick={() => onDeleteCode(row)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/40 p-4">
        <h3 className="text-base font-semibold mb-3">Used Redeem Code History</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading claim history...</p>
        ) : claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No redeem usage yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3">Code</th>
                  <th className="text-left py-2 pr-3">User</th>
                  <th className="text-left py-2 pr-3">Phone</th>
                  <th className="text-left py-2 pr-3">Amount</th>
                  <th className="text-left py-2">Used At</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((row) => (
                  <tr key={row.claim_id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{row.code}</td>
                    <td className="py-2 pr-3">{row.user_nickname}</td>
                    <td className="py-2 pr-3">{row.user_phone || "-"}</td>
                    <td className="py-2 pr-3">₹{Number(row.amount).toLocaleString()}</td>
                    <td className="py-2">{new Date(row.claimed_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
