import { useEffect, useMemo } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Gift, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useContracts";
import { trackCampaignInteraction, trackPOAPClaimed, trackPOAPsView } from "@/lib/analyticsStore";
import { getCampaignParticipantSummary, getCampaignStatus, useCampaignStore } from "@/stores/campaignStore";

function formatRedeemCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "Open now";

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours}h`;
  return `${Math.ceil(totalHours / 24)}d`;
}

const MyPOAPsPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const campaigns = useCampaignStore((state) => state.campaigns);
  const participants = useCampaignStore((state) => state.participants);
  const rewards = useCampaignStore((state) => state.rewards);
  const redeemEntries = useCampaignStore((state) => state.redeemEntries);

  useEffect(() => {
    if (isConnected && address) {
      trackPOAPsView(address);
    }
  }, [isConnected, address]);

  const redeemableCampaigns = useMemo(() => {
    if (!address) return [];

    return campaigns
      .map((campaign) => {
        const summary = getCampaignParticipantSummary(campaigns, participants, campaign.id, address);
        return {
          campaign,
          redeemableCount: summary.redeemableCount,
          status: getCampaignStatus(campaign),
          participant: summary.participant,
        };
      })
      .filter((entry) => (entry.participant?.ethEntries || 0) + (entry.participant?.approvedContentEntries || 0) > 0)
      .sort((a, b) => new Date(b.campaign.endAt).getTime() - new Date(a.campaign.endAt).getTime());
  }, [address, campaigns, participants]);

  const myRewards = useMemo(() => {
    if (!address) return [];
    const normalizedWallet = address.toLowerCase();
    return rewards
      .filter((reward) => reward.wallet === normalizedWallet)
      .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
  }, [address, rewards]);

  const handleRedeem = (campaignId: string, quantity: number) => {
    if (!address) {
      toast.error("Connect wallet to redeem.");
      return;
    }

    const result = redeemEntries(campaignId, address, quantity);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    trackCampaignInteraction(address, campaignId);
    trackPOAPClaimed(address);
    toast.success(`${quantity} ${quantity === 1 ? "POAP" : "POAPs"} redeemed.`);
  };

  if (!isConnected) {
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
            {redeemableCampaigns.length} active credits · {myRewards.length} redeemed
          </p>
        </div>
      </div>

      {redeemableCampaigns.length === 0 && myRewards.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-body">No campaign rewards yet.</p>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Join a campaign through ETH entry or an approved content submission.
          </p>
        </div>
      ) : (
        <>
          {redeemableCampaigns.length > 0 && (
            <div className="px-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">Campaign Credits</p>
              {redeemableCampaigns.map(({ campaign, participant, redeemableCount, status }) => {
                const totalCredits = (participant?.ethEntries || 0) + (participant?.approvedContentEntries || 0);
                const approvedContent = participant?.approvedContentEntries || 0;
                const ethEntries = participant?.ethEntries || 0;

                return (
                  <div key={campaign.id} className="p-3 rounded-xl bg-card shadow-card border border-border">
                    <div className="flex items-start gap-3">
                      <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{campaign.title}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{campaign.entryMode}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {totalCredits} total credits · {ethEntries} ETH · {approvedContent} content
                        </p>

                        {status === "redeemable" ? (
                          redeemableCount > 0 ? (
                            <Button
                              onClick={() => handleRedeem(campaign.id, redeemableCount)}
                              className="w-full mt-2 rounded-lg text-xs h-8 gradient-primary"
                            >
                              <Zap className="h-3.5 w-3.5 mr-1.5" />
                              Redeem {redeemableCount} {redeemableCount === 1 ? "POAP" : "POAPs"}
                            </Button>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-2">No unredeemed credits left for this campaign.</p>
                          )
                        ) : status === "cooldown" ? (
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Redeem opens in {formatRedeemCountdown(campaign.redeemAt)}
                          </p>
                        ) : status === "live" ? (
                          <p className="text-xs text-muted-foreground mt-2">Campaign is still live. Redemption starts 24 hours after close.</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-2">Campaign has not started yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {myRewards.length > 0 && (
            <div className="px-4 space-y-2">
              <p className="text-xs font-semibold text-foreground text-muted-foreground">Redeemed POAPs</p>
              {myRewards.map((reward) => (
                <div key={reward.id} className="p-3 rounded-xl bg-secondary/50">
                  <div className="flex items-start gap-3">
                    <Gift className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground/70">{reward.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Token #{reward.tokenId} · {new Date(reward.redeemedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="bg-green-600 text-white text-[10px]">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Redeemed
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyPOAPsPage;
