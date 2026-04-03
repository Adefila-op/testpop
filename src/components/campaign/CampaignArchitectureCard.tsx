export type CampaignDetailContent = {
  title?: string;
  intro?: string;
  primaryLabel?: string;
  primaryItems?: string[];
  secondaryLabel?: string;
  secondaryItems?: string[];
};

type CampaignArchitectureCardProps = {
  className?: string;
  details?: CampaignDetailContent | null;
};

export const DEFAULT_CAMPAIGN_DETAILS: Required<CampaignDetailContent> = {
  title: "Campaign Details",
  intro:
    "This campaign runs on the V2 contract, so entries, approvals, and redemption all follow the onchain credit flow.",
  primaryLabel: "How It Works",
  primaryItems: [
    "Campaign creation and timing are enforced by the V2 contract.",
    "ETH entry credits are recorded onchain per wallet.",
    "Artist-approved content writes credits onchain through the operator flow.",
    "POAP redemption mints from the contract using the wallet's earned credit balance.",
  ],
  secondaryLabel: "Collector Notes",
  secondaryItems: [
    "Each ETH entry buys one participation credit while the campaign is live.",
    "Approved content submissions add credits before redemption opens.",
    "Redemption unlocks 24 hours after the campaign closes.",
    "Credits are capped by the campaign supply.",
  ],
};

function normalizeItems(items: unknown, fallback: string[]) {
  if (!Array.isArray(items)) return fallback;
  const normalized = items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

export function CampaignArchitectureCard({ className, details }: CampaignArchitectureCardProps) {
  const resolved = {
    title: details?.title?.trim() || DEFAULT_CAMPAIGN_DETAILS.title,
    intro: details?.intro?.trim() || DEFAULT_CAMPAIGN_DETAILS.intro,
    primaryLabel: details?.primaryLabel?.trim() || DEFAULT_CAMPAIGN_DETAILS.primaryLabel,
    primaryItems: normalizeItems(details?.primaryItems, DEFAULT_CAMPAIGN_DETAILS.primaryItems),
    secondaryLabel: details?.secondaryLabel?.trim() || DEFAULT_CAMPAIGN_DETAILS.secondaryLabel,
    secondaryItems: normalizeItems(details?.secondaryItems, DEFAULT_CAMPAIGN_DETAILS.secondaryItems),
  };

  return (
    <div className={`space-y-4 rounded-2xl border border-border bg-card p-4 ${className ?? ""}`.trim()}>
      <div>
        <p className="text-sm font-semibold text-foreground">{resolved.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{resolved.intro}</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{resolved.primaryLabel}</p>
        <div className="space-y-2">
          {resolved.primaryItems.map((item) => (
            <div key={item} className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-foreground">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{resolved.secondaryLabel}</p>
        <div className="space-y-2">
          {resolved.secondaryItems.map((item) => (
            <div key={item} className="rounded-xl bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
