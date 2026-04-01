import { useMemo } from "react";
import { ArrowLeft, Clock3, Gift, Loader2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useContracts";
import { useSupabaseAllDrops } from "@/hooks/useSupabase";
import { useCampaignV2State, useRedeemCampaignV2 } from "@/hooks/useCampaignV2";
import { trackPOAPsView } from "@/lib/analyticsStore";
import { useEffect } from "react";

function formatRedeemCountdown(targetUnixSeconds: number): string {
  const diffMs = targetUnixSeconds * 1000 - Date.now();
  if (diffMs <= 0) return "Open now";
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours}h`;
  return `${Math.ceil(totalHours / 24)}d`;
}

function CampaignCreditCard({
  drop,
  wallet,
}: {
  drop: any;
  wallet: string;
}) {
  const {
    campaign,
    ethCredits,
    contentCredits,
    redeemedCredits,
    redeemableCredits,
    isLoading,
  } = useCampaignV2State(drop.contract_drop_id, wallet);
  const { redeem, isPending, isConfirming } = useRedeemCampaignV2();

  if (!drop.contract_drop_id) {
    return null;
  }

  const totalCredits = ethCredits + contentCredits;
  if (!isLoading && totalCredits === 0 && redeemedCredits === 0) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const status = !campaign
    ? "unavailable"
    : now < campaign.startTime
      ? "upcoming"
      : now <= campaign.endTime
        ? "live"
        : now < campaign.redeemStartTime
          ? "cooldown"
          : "redeemable";

  return (
    <div className="p-3 rounded-xl bg-card shadow-card border border-border">
      <div className="flex items-start gap-3">
        <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{drop.title}</p>
            <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading campaign credits...
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalCredits} total credits · {ethCredits} ETH · {contentCredits} content
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {redeemedCredits} redeemed · {redeemableCredits} redeemable now
              </p>

              {status === "redeemable" ? (
                redeemableCredits > 0 ? (
                  <Button
                    onClick={() => redeem(drop.contract_drop_id, redeemableCredits)}
                    disabled={isPending || isConfirming}
                    className="w-full mt-2 rounded-lg text-xs h-8 gradient-primary"
                  >
                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                    Redeem {redeemableCredits} {redeemableCredits === 1 ? "POAP" : "POAPs"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">No unredeemed credits left for this campaign.</p>
                )
              ) : status === "cooldown" && campaign ? (
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Redeem opens in {formatRedeemCountdown(campaign.redeemStartTime)}
                </p>
              ) : status === "live" ? (
                <p className="text-xs text-muted-foreground mt-2">Campaign is still live. Redemption starts 24 hours after close.</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Campaign has not started yet.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MyPOAPsPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const { data: allDrops } = useSupabaseAllDrops(Boolean(address));

  useEffect(() => {
    if (isConnected && address) {
      trackPOAPsView(address);
    }
  }, [isConnected, address]);

  const campaignDrops = useMemo(
    () =>
      (allDrops || []).filter(
        (drop) =>
          (drop.type || "").toLowerCase() === "campaign" &&
          drop.contract_drop_id !== null &&
          drop.contract_drop_id !== undefined
      ),
    [allDrops]
  );

  if (!isConnected || !address) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <p className="text-lg font-semibold text-foreground">Connect Your Wallet</p>
        <p className="text-sm text-muted-foreground">Connect to see your POAP rewards</p>
        <Button onClick={() => navigate(-1)} className="rounded-full gradient-primary text-primary-foreground">
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 z-10 bg-background px-4 pt-3 pb-2 flex items-center gap-3 border-b">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-secondary/50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">My POAP Rewards</h1>
          <p className="text-xs text-muted-foreground">
            Live onchain campaign credits and delayed redemptions
          </p>
        </div>
      </div>

      {campaignDrops.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-body">No campaign rewards yet.</p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Join a campaign through ETH entry or an approved content submission.
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Campaign Credits</p>
          {campaignDrops.map((drop) => (
            <CampaignCreditCard key={drop.id} drop={drop} wallet={address} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPOAPsPage;
