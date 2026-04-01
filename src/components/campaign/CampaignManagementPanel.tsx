import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSupabaseArtistByWallet, useSupabaseDropsByArtist } from "@/hooks/useSupabase";
import {
  getCampaignSubmissions,
  reviewCampaignSubmission,
  type CampaignSubmission,
} from "@/lib/db";
import { getRuntimeApiToken } from "@/lib/runtimeSession";
import { establishSecureSession } from "@/lib/secureAuth";

type CampaignManagementPanelProps = {
  artistWallet?: string | null;
};

export function CampaignManagementPanel({ artistWallet }: CampaignManagementPanelProps) {
  const normalizedArtistWallet = artistWallet?.trim().toLowerCase();
  const { data: artist } = useSupabaseArtistByWallet(normalizedArtistWallet);
  const { data: artistDrops } = useSupabaseDropsByArtist(artist?.id);
  const [submissionsByDropId, setSubmissionsByDropId] = useState<Record<string, CampaignSubmission[]>>({});
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const artistCampaigns = useMemo(
    () =>
      (artistDrops || []).filter((drop) => (drop.type || "").toLowerCase() === "campaign"),
    [artistDrops]
  );

  useEffect(() => {
    if (!normalizedArtistWallet || !artistCampaigns.length) {
      setSubmissionsByDropId({});
      return;
    }

    let cancelled = false;
    if (!getRuntimeApiToken()) {
      setSubmissionsByDropId({});
      return;
    }

    setLoading(true);
    (async () => {
        const pairs = await Promise.all(
          artistCampaigns.map(async (campaign) => [
            campaign.id,
            await getCampaignSubmissions(campaign.id, "artist"),
          ] as const)
        );

        if (!cancelled) {
          setSubmissionsByDropId(Object.fromEntries(pairs));
        }
      })()
      .catch((error) => {
        if (!cancelled) {
          console.warn("Failed to load campaign submissions:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artistCampaigns, normalizedArtistWallet]);

  const handleReview = async (
    dropId: string,
    submissionId: string,
    status: "approved" | "rejected"
  ) => {
    if (!normalizedArtistWallet) return;

    setReviewingId(submissionId);
    try {
      await establishSecureSession(normalizedArtistWallet);
      const updated = await reviewCampaignSubmission(dropId, submissionId, status);
      setSubmissionsByDropId((current) => ({
        ...current,
        [dropId]: (current[dropId] || []).map((submission) =>
          submission.id === submissionId && updated ? updated : submission
        ),
      }));
      toast.success(status === "approved" ? "Submission approved." : "Submission rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to review submission.");
    } finally {
      setReviewingId(null);
    }
  };

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
        const campaignSubmissions = submissionsByDropId[campaign.id] || [];
        const pendingSubmissions = campaignSubmissions.filter((submission) => submission.status === "pending");
        const approvedCount = campaignSubmissions.filter((submission) => submission.status === "approved").length;

        return (
          <div key={campaign.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{campaign.title}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {(campaign.status || "draft").toLowerCase()} · {campaign.price_eth || 0} ETH
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{campaignSubmissions.length} submissions</p>
                <p>{approvedCount} approved</p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading submissions...
              </div>
            ) : pendingSubmissions.length === 0 ? (
              <div className="rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                No pending submissions right now.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSubmissions.map((submission) => (
                  <div key={submission.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-xs font-medium text-foreground">{submission.submitter_wallet}</p>
                    {submission.content_url && (
                      <a
                        href={submission.content_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs text-primary hover:underline"
                      >
                        {submission.content_url}
                      </a>
                    )}
                    {submission.caption && (
                      <p className="mt-1 text-xs text-muted-foreground">{submission.caption}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        disabled={reviewingId === submission.id}
                        onClick={() => handleReview(campaign.id, submission.id, "approved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={reviewingId === submission.id}
                        onClick={() => handleReview(campaign.id, submission.id, "rejected")}
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
