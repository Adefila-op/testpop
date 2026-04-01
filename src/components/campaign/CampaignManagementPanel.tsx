import { useMemo } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCampaignStatus,
  useCampaignStore,
} from "@/stores/campaignStore";

type CampaignManagementPanelProps = {
  artistWallet?: string | null;
};

export function CampaignManagementPanel({ artistWallet }: CampaignManagementPanelProps) {
  const normalizedArtistWallet = artistWallet?.trim().toLowerCase();
  const campaigns = useCampaignStore((state) => state.campaigns);
  const submissions = useCampaignStore((state) => state.submissions);
  const participants = useCampaignStore((state) => state.participants);
  const reviewSubmission = useCampaignStore((state) => state.reviewSubmission);

  const artistCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) =>
        normalizedArtistWallet ? campaign.artistWallet === normalizedArtistWallet : false
      ),
    [campaigns, normalizedArtistWallet]
  );

  if (!normalizedArtistWallet || artistCampaigns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Campaign submissions</h3>
        <span className="text-xs text-muted-foreground">{artistCampaigns.length} campaigns</span>
      </div>

      {artistCampaigns.map((campaign) => {
        const campaignSubmissions = submissions.filter((submission) => submission.campaignId === campaign.id);
        const pendingSubmissions = campaignSubmissions.filter((submission) => submission.status === "pending");
        const participantCount = participants.filter((participant) => participant.campaignId === campaign.id).length;
        const redeemedCount = participants
          .filter((participant) => participant.campaignId === campaign.id)
          .reduce((total, participant) => total + participant.redeemedEntries, 0);

        return (
          <div key={campaign.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{campaign.title}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {campaign.entryMode} entry · {getCampaignStatus(campaign)}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{participantCount} wallets</p>
                <p>{redeemedCount}/{campaign.maxSupply} redeemed</p>
              </div>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                No pending submissions right now.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSubmissions.map((submission) => (
                  <div key={submission.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-medium text-foreground">{submission.wallet}</p>
                    {submission.contentUrl && (
                      <a
                        href={submission.contentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs text-primary hover:underline"
                      >
                        {submission.contentUrl}
                      </a>
                    )}
                    {submission.caption && (
                      <p className="mt-1 text-xs text-muted-foreground">{submission.caption}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        onClick={() =>
                          reviewSubmission(campaign.id, submission.id, normalizedArtistWallet, "approved")
                        }
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() =>
                          reviewSubmission(campaign.id, submission.id, normalizedArtistWallet, "rejected")
                        }
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
