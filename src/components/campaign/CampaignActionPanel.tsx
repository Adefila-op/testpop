import { useEffect, useMemo, useState } from "react";
import { Clock, Gift, Loader2, Send } from "lucide-react";
import { formatEther } from "viem";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCampaignSubmissions,
  submitCampaignContent,
} from "@/lib/db";
import { getRuntimeApiToken } from "@/lib/runtimeSession";
import { establishSecureSession } from "@/lib/secureAuth";
import {
  useBuyCampaignEntriesV2,
  useCampaignV2State,
  useRedeemCampaignV2,
} from "@/hooks/useCampaignV2";
import { useWallet } from "@/hooks/useContracts";

type CampaignActionPanelProps = {
  dropId: string;
  fallbackTitle: string;
  contractCampaignId?: number | null;
  contractAddress?: string | null;
};

function formatTimeDistance(targetMs: number): string {
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return "now";
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours}h`;
  return `${Math.ceil(totalHours / 24)}d`;
}

function getCampaignDisplayStatus(campaign: {
  startTime: number;
  endTime: number;
  redeemStartTime: number;
} | null) {
  if (!campaign) return "unavailable";
  const now = Math.floor(Date.now() / 1000);
  if (now < campaign.startTime) return "upcoming";
  if (now <= campaign.endTime) return "live";
  if (now < campaign.redeemStartTime) return "cooldown";
  return "redeemable";
}

export function CampaignActionPanel({
  dropId,
  fallbackTitle,
  contractCampaignId,
  contractAddress,
}: CampaignActionPanelProps) {
  const { address, isConnected, connectWallet } = useWallet();
  const [entryQuantity, setEntryQuantity] = useState("1");
  const [contentUrl, setContentUrl] = useState("");
  const [contentCaption, setContentCaption] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<
    Awaited<ReturnType<typeof getCampaignSubmissions>>
  >([]);
  const {
    campaign,
    ethCredits,
    contentCredits,
    redeemedCredits,
    redeemableCredits,
    isLoading,
    refetchAll,
  } = useCampaignV2State(contractCampaignId, address, contractAddress);
  const {
    buyEntries,
    isPending: isBuyPending,
    isConfirming: isBuyConfirming,
    isSuccess: isBuySuccess,
    error: buyError,
  } = useBuyCampaignEntriesV2();
  const {
    redeem,
    isPending: isRedeemPending,
    isConfirming: isRedeemConfirming,
    isSuccess: isRedeemSuccess,
    error: redeemError,
  } = useRedeemCampaignV2();

  const status = getCampaignDisplayStatus(campaign);
  const entryModeLabel =
    campaign?.entryMode === 1 ? "content" : campaign?.entryMode === 2 ? "both" : "eth";
  const ticketPriceEth = campaign ? formatEther(campaign.ticketPriceWei) : "0";
  const pendingSubmissions = userSubmissions.filter((submission) => submission.status === "pending").length;
  const approvedSubmissions = userSubmissions.filter((submission) => submission.status === "approved").length;
  const hasApiSession = Boolean(getRuntimeApiToken());

  useEffect(() => {
    if (!address || !dropId) {
      setUserSubmissions([]);
      return;
    }

    let cancelled = false;
    if (!getRuntimeApiToken()) {
      setUserSubmissions([]);
      return;
    }

    setSubmissionLoading(true);
    getCampaignSubmissions(dropId, "mine")
      .then((submissions) => {
        if (!cancelled) {
          setUserSubmissions(submissions);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Failed to load campaign submissions:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSubmissionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, dropId, isBuySuccess, isRedeemSuccess]);

  useEffect(() => {
    if (isBuySuccess || isRedeemSuccess) {
      refetchAll().catch((error) => {
        console.warn("Failed to refresh campaign state:", error);
      });
    }
  }, [isBuySuccess, isRedeemSuccess, refetchAll]);

  useEffect(() => {
    if (buyError) {
      toast.error(buyError.message || "Failed to buy campaign entries.");
    }
  }, [buyError]);

  useEffect(() => {
    if (redeemError) {
      toast.error(redeemError.message || "Failed to redeem campaign rewards.");
    }
  }, [redeemError]);

  const summary = useMemo(
    () => ({
      totalCredits: ethCredits + contentCredits,
      approvedContent: contentCredits,
      ethEntries: ethCredits,
      redeemedCredits,
      redeemableCredits,
    }),
    [contentCredits, ethCredits, redeemedCredits, redeemableCredits]
  );

  if (!contractCampaignId) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        Campaign settings for {fallbackTitle} are still syncing onchain.
      </div>
    );
  }

  const quantity = Math.max(1, Number.parseInt(entryQuantity, 10) || 1);

  const handleBuyEntry = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    buyEntries(contractAddress, contractCampaignId, quantity, ticketPriceEth);
  };

  const handleSubmitContent = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (!address) {
      toast.error("Connect your wallet to submit content.");
      return;
    }
    if (!contentUrl.trim()) {
      toast.error("Add a content URL before submitting.");
      return;
    }

    setSubmissionLoading(true);
    try {
      await establishSecureSession(address);
      await submitCampaignContent({
        dropId,
        contentUrl: contentUrl.trim(),
        caption: contentCaption.trim(),
      });
      const nextSubmissions = await getCampaignSubmissions(dropId, "mine");
      setUserSubmissions(nextSubmissions);
      setContentUrl("");
      setContentCaption("");
      toast.success("Content submitted for artist review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit campaign content.");
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleUnlockSubmissionTools = async () => {
    if (!address) return;
    setUnlocking(true);
    try {
      await establishSecureSession(address);
      const nextSubmissions = await getCampaignSubmissions(dropId, "mine");
      setUserSubmissions(nextSubmissions);
      toast.success("Campaign submission tools unlocked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to unlock campaign tools.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleRedeem = async () => {
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (!summary.redeemableCredits) {
      toast.error("No redeemable credits are available for this wallet.");
      return;
    }

    redeem(contractAddress, contractCampaignId, summary.redeemableCredits);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="font-semibold text-foreground capitalize">{status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Entry mode</span>
          <span className="font-semibold text-foreground capitalize">{entryModeLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Redemption opens</span>
          <span className="font-semibold text-foreground">
            {campaign ? new Date(campaign.redeemStartTime * 1000).toLocaleString() : "--"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Your ETH entries</span>
          <span className="font-semibold text-foreground">{summary.ethEntries}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Your approved content</span>
          <span className="font-semibold text-foreground">{summary.approvedContent}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Redeemed</span>
          <span className="font-semibold text-foreground">{summary.redeemedCredits}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Redeemable now</span>
          <span className="font-semibold text-primary">{summary.redeemableCredits}</span>
        </div>
      </div>

      {(campaign?.entryMode === 0 || campaign?.entryMode === 2) && status === "live" && (
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
            <Button
              onClick={handleBuyEntry}
              disabled={isLoading || isBuyPending || isBuyConfirming}
              className="rounded-xl gradient-primary text-primary-foreground"
            >
              {isBuyPending || isBuyConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Buy ${ticketPriceEth} ETH`
              )}
            </Button>
          </div>
        </div>
      )}

      {(campaign?.entryMode === 1 || campaign?.entryMode === 2) && status === "live" && (
        <div className="rounded-xl border border-border p-3 space-y-2">
          <p className="text-sm font-semibold text-foreground">Submit content</p>
          <p className="text-xs text-muted-foreground">
            One approved submission creates one POAP credit. After approval, come back and redeem after the 24-hour lock.
          </p>
          {!hasApiSession && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              Sign once to submit content and view your submission approval status.
              <Button
                onClick={handleUnlockSubmissionTools}
                disabled={unlocking}
                size="sm"
                variant="outline"
                className="mt-3 w-full rounded-xl"
              >
                {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Unlock Submission Tools
              </Button>
            </div>
          )}
          <Input
            value={contentUrl}
            onChange={(event) => setContentUrl(event.target.value)}
            placeholder="Link to your content submission"
            className="h-10 rounded-xl"
            disabled={!hasApiSession}
          />
          <textarea
            value={contentCaption}
            onChange={(event) => setContentCaption(event.target.value)}
            placeholder="Short note for the artist"
            className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            disabled={!hasApiSession}
          />
          <Button
            onClick={handleSubmitContent}
            disabled={submissionLoading || !hasApiSession}
            variant="outline"
            className="w-full rounded-xl"
          >
            {submissionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit for approval
          </Button>
          {(pendingSubmissions > 0 || approvedSubmissions > 0) && (
            <p className="text-xs text-muted-foreground">
              {pendingSubmissions} pending · {approvedSubmissions} approved
            </p>
          )}
        </div>
      )}

      {status === "cooldown" && campaign && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Redemption opens in {formatTimeDistance(campaign.redeemStartTime * 1000)}.
        </div>
      )}

      {status === "redeemable" && summary.redeemableCredits > 0 && (
        <Button
          onClick={handleRedeem}
          disabled={isRedeemPending || isRedeemConfirming}
          className="w-full rounded-xl gradient-primary text-primary-foreground h-11"
        >
          {isRedeemPending || isRedeemConfirming ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Gift className="mr-2 h-4 w-4" />
          )}
          Redeem {summary.redeemableCredits}{" "}
          {summary.redeemableCredits === 1 ? "POAP" : "POAPs"}
        </Button>
      )}

      {status === "redeemable" && summary.redeemableCredits === 0 && (
        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          No POAP credits are ready to redeem for this wallet yet.
        </div>
      )}
    </div>
  );
}
