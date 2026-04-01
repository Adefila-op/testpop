import { useMemo, useState } from "react";
import { Clock, Gift, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackCampaignInteraction, trackPOAPClaimed } from "@/lib/analyticsStore";
import { useWallet } from "@/hooks/useContracts";
import {
  getCampaignParticipantSummary,
  getCampaignStatus,
  useCampaignStore,
} from "@/stores/campaignStore";

type CampaignActionPanelProps = {
  campaignId: string;
  fallbackTitle: string;
};

function formatTimeDistance(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "now";

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours}h`;

  const totalDays = Math.ceil(totalHours / 24);
  return `${totalDays}d`;
}

export function CampaignActionPanel({ campaignId, fallbackTitle }: CampaignActionPanelProps) {
  const { address, isConnected, connectWallet } = useWallet();
  const [entryQuantity, setEntryQuantity] = useState("1");
  const [contentUrl, setContentUrl] = useState("");
  const [contentCaption, setContentCaption] = useState("");
  const campaigns = useCampaignStore((state) => state.campaigns);
  const participants = useCampaignStore((state) => state.participants);
  const submissions = useCampaignStore((state) => state.submissions);
  const buyEntries = useCampaignStore((state) => state.buyEntries);
  const submitContent = useCampaignStore((state) => state.submitContent);
  const redeemEntries = useCampaignStore((state) => state.redeemEntries);

  const campaign = campaigns.find((entry) => entry.id === campaignId);
  const summary = useMemo(
    () => getCampaignParticipantSummary(campaigns, participants, campaignId, address),
    [address, campaignId, campaigns, participants]
  );

  const status = campaign ? getCampaignStatus(campaign) : null;
  const userSubmissions = submissions.filter(
    (submission) => submission.campaignId === campaignId && submission.wallet === address?.toLowerCase()
  );
  const pendingSubmissions = userSubmissions.filter((submission) => submission.status === "pending").length;
  const approvedSubmissions = userSubmissions.filter((submission) => submission.status === "approved").length;

  if (!campaign) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        Campaign settings for {fallbackTitle} have not been initialized yet.
      </div>
    );
  }

  const quantity = Math.max(1, Number.parseInt(entryQuantity, 10) || 1);

  const handleBuyEntry = () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!address) {
      toast.error("Connect your wallet to participate.");
      return;
    }

    const result = buyEntries(campaign.id, address, quantity);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    trackCampaignInteraction(address, campaign.id);
    toast.success(`${quantity} ETH ${quantity === 1 ? "entry" : "entries"} added.`);
  };

  const handleSubmitContent = () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!address) {
      toast.error("Connect your wallet to submit content.");
      return;
    }

    const result = submitContent(campaign.id, address, {
      contentUrl,
      caption: contentCaption,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    trackCampaignInteraction(address, campaign.id);
    setContentUrl("");
    setContentCaption("");
    toast.success("Content submitted for artist review.");
  };

  const handleRedeem = () => {
    if (!isConnected) {
      connectWallet();
      return;
    }
    if (!address) {
      toast.error("Connect your wallet to redeem.");
      return;
    }

    const result = redeemEntries(campaign.id, address, summary.redeemableCount);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    trackPOAPClaimed(address);
    toast.success(
      `${result.rewards.length} ${result.rewards.length === 1 ? "POAP" : "POAPs"} redeemed from ${campaign.title}.`
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="font-semibold text-foreground capitalize">{status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Redemption opens</span>
          <span className="font-semibold text-foreground">{new Date(campaign.redeemAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Your ETH entries</span>
          <span className="font-semibold text-foreground">{summary.participant?.ethEntries || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Your approved content</span>
          <span className="font-semibold text-foreground">{summary.participant?.approvedContentEntries || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Redeemable now</span>
          <span className="font-semibold text-primary">{summary.redeemableCount}</span>
        </div>
      </div>

      {(campaign.entryMode === "eth" || campaign.entryMode === "both") && status === "live" && (
        <div className="rounded-xl border border-border p-3 space-y-2">
          <p className="text-sm font-semibold text-foreground">Buy ETH participation</p>
          <p className="text-xs text-muted-foreground">
            Each ETH entry creates one POAP credit. Redemption happens 24 hours after the campaign closes.
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={entryQuantity}
              onChange={(event) => setEntryQuantity(event.target.value)}
              className="h-10 rounded-xl"
            />
            <Button onClick={handleBuyEntry} className="rounded-xl gradient-primary text-primary-foreground">
              Buy {campaign.priceEth} ETH
            </Button>
          </div>
        </div>
      )}

      {(campaign.entryMode === "content" || campaign.entryMode === "both") && status === "live" && (
        <div className="rounded-xl border border-border p-3 space-y-2">
          <p className="text-sm font-semibold text-foreground">Submit content</p>
          <p className="text-xs text-muted-foreground">
            One approved submission creates one POAP credit. You come back after approval and redeem after the 24-hour lock.
          </p>
          <Input
            value={contentUrl}
            onChange={(event) => setContentUrl(event.target.value)}
            placeholder="Link to your content submission"
            className="h-10 rounded-xl"
          />
          <textarea
            value={contentCaption}
            onChange={(event) => setContentCaption(event.target.value)}
            placeholder="Short note for the artist"
            className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={handleSubmitContent} variant="outline" className="w-full rounded-xl">
            <Send className="mr-2 h-4 w-4" />
            Submit for approval
          </Button>
          {(pendingSubmissions > 0 || approvedSubmissions > 0) && (
            <p className="text-xs text-muted-foreground">
              {pendingSubmissions} pending · {approvedSubmissions} approved
            </p>
          )}
        </div>
      )}

      {status === "cooldown" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Redemption opens in {formatTimeDistance(campaign.redeemAt)}.
        </div>
      )}

      {status === "redeemable" && summary.redeemableCount > 0 && (
        <Button onClick={handleRedeem} className="w-full rounded-xl gradient-primary text-primary-foreground h-11">
          <Gift className="mr-2 h-4 w-4" />
          Redeem {summary.redeemableCount} {summary.redeemableCount === 1 ? "POAP" : "POAPs"}
        </Button>
      )}

      {status === "redeemable" && summary.redeemableCount === 0 && (
        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          No POAP credits are ready to redeem for this wallet yet.
        </div>
      )}
    </div>
  );
}
