import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CampaignEntryMode = "eth" | "content" | "both";
export type CampaignSubmissionStatus = "pending" | "approved" | "rejected";

export type CampaignRecord = {
  id: string;
  dropId: string;
  title: string;
  description: string;
  imageUrl?: string;
  metadataUri?: string;
  artistWallet: string;
  artistName: string;
  startAt: string;
  endAt: string;
  redeemAt: string;
  entryMode: CampaignEntryMode;
  priceEth: string;
  maxSupply: number;
  createdAt: string;
};

export type CampaignParticipantRecord = {
  campaignId: string;
  wallet: string;
  ethEntries: number;
  approvedContentEntries: number;
  redeemedEntries: number;
  updatedAt: string;
};

export type CampaignSubmissionRecord = {
  id: string;
  campaignId: string;
  wallet: string;
  contentUrl?: string;
  caption?: string;
  status: CampaignSubmissionStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type CampaignRewardRecord = {
  id: string;
  campaignId: string;
  wallet: string;
  tokenId: number;
  title: string;
  imageUrl?: string;
  redeemedAt: string;
};

type CreateCampaignInput = Omit<CampaignRecord, "createdAt">;

type CampaignStoreState = {
  campaigns: CampaignRecord[];
  participants: CampaignParticipantRecord[];
  submissions: CampaignSubmissionRecord[];
  rewards: CampaignRewardRecord[];
  nextTokenId: number;
  createCampaign: (campaign: CreateCampaignInput) => void;
  buyEntries: (campaignId: string, wallet: string, quantity: number) => { ok: true } | { ok: false; error: string };
  submitContent: (
    campaignId: string,
    wallet: string,
    payload: { contentUrl?: string; caption?: string }
  ) => { ok: true; submissionId: string } | { ok: false; error: string };
  reviewSubmission: (
    campaignId: string,
    submissionId: string,
    reviewerWallet: string,
    status: CampaignSubmissionStatus
  ) => { ok: true } | { ok: false; error: string };
  redeemEntries: (
    campaignId: string,
    wallet: string,
    quantity: number
  ) => { ok: true; rewards: CampaignRewardRecord[] } | { ok: false; error: string };
};

function normalizeWallet(wallet: string): string {
  return wallet.trim().toLowerCase();
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function getCampaignStatus(campaign: CampaignRecord, now = Date.now()): "upcoming" | "live" | "cooldown" | "redeemable" {
  const start = new Date(campaign.startAt).getTime();
  const end = new Date(campaign.endAt).getTime();
  const redeem = new Date(campaign.redeemAt).getTime();

  if (now < start) return "upcoming";
  if (now <= end) return "live";
  if (now < redeem) return "cooldown";
  return "redeemable";
}

function getCampaignById(campaigns: CampaignRecord[], campaignId: string): CampaignRecord | undefined {
  return campaigns.find((campaign) => campaign.id === campaignId);
}

function getParticipant(
  participants: CampaignParticipantRecord[],
  campaignId: string,
  wallet: string
): CampaignParticipantRecord | undefined {
  const normalizedWallet = normalizeWallet(wallet);
  return participants.find((participant) => participant.campaignId === campaignId && participant.wallet === normalizedWallet);
}

function getRedeemableCount(
  participant: CampaignParticipantRecord | undefined
): number {
  if (!participant) return 0;
  return Math.max(0, participant.ethEntries + participant.approvedContentEntries - participant.redeemedEntries);
}

function getCampaignRedeemedTotal(
  participants: CampaignParticipantRecord[],
  campaignId: string
): number {
  return participants
    .filter((participant) => participant.campaignId === campaignId)
    .reduce((total, participant) => total + participant.redeemedEntries, 0);
}

export function getCampaignParticipantSummary(
  campaigns: CampaignRecord[],
  participants: CampaignParticipantRecord[],
  campaignId: string,
  wallet?: string | null
) {
  const campaign = getCampaignById(campaigns, campaignId);
  const participant = wallet ? getParticipant(participants, campaignId, wallet) : undefined;
  const redeemableCount = getRedeemableCount(participant);

  return {
    campaign,
    participant,
    redeemableCount,
    redeemedTotal: campaign ? getCampaignRedeemedTotal(participants, campaign.id) : 0,
  };
}

export { getCampaignStatus, getRedeemableCount };

export const useCampaignStore = create<CampaignStoreState>()(
  persist(
    (set, get) => ({
      campaigns: [],
      participants: [],
      submissions: [],
      rewards: [],
      nextTokenId: 1,
      createCampaign: (campaign) =>
        set((state) => ({
          campaigns: [
            {
              ...campaign,
              artistWallet: normalizeWallet(campaign.artistWallet),
              createdAt: new Date().toISOString(),
            },
            ...state.campaigns.filter((existing) => existing.id !== campaign.id),
          ],
        })),
      buyEntries: (campaignId, wallet, quantity) => {
        const normalizedWallet = normalizeWallet(wallet);
        const campaign = getCampaignById(get().campaigns, campaignId);
        const now = Date.now();

        if (!campaign) {
          return { ok: false as const, error: "Campaign not found." };
        }
        if (!(campaign.entryMode === "eth" || campaign.entryMode === "both")) {
          return { ok: false as const, error: "This campaign does not accept ETH participation." };
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return { ok: false as const, error: "Choose at least one entry." };
        }
        if (getCampaignStatus(campaign, now) !== "live") {
          return { ok: false as const, error: "This campaign is not currently accepting entries." };
        }

        set((state) => {
          const existing = getParticipant(state.participants, campaignId, normalizedWallet);
          const updatedParticipant: CampaignParticipantRecord = existing
            ? {
                ...existing,
                ethEntries: existing.ethEntries + quantity,
                updatedAt: new Date().toISOString(),
              }
            : {
                campaignId,
                wallet: normalizedWallet,
                ethEntries: quantity,
                approvedContentEntries: 0,
                redeemedEntries: 0,
                updatedAt: new Date().toISOString(),
              };

          return {
            participants: existing
              ? state.participants.map((participant) =>
                  participant.campaignId === campaignId && participant.wallet === normalizedWallet
                    ? updatedParticipant
                    : participant
                )
              : [...state.participants, updatedParticipant],
          };
        });

        return { ok: true as const };
      },
      submitContent: (campaignId, wallet, payload) => {
        const normalizedWallet = normalizeWallet(wallet);
        const campaign = getCampaignById(get().campaigns, campaignId);
        const now = Date.now();

        if (!campaign) {
          return { ok: false as const, error: "Campaign not found." };
        }
        if (!(campaign.entryMode === "content" || campaign.entryMode === "both")) {
          return { ok: false as const, error: "This campaign does not accept content submissions." };
        }
        if (getCampaignStatus(campaign, now) !== "live") {
          return { ok: false as const, error: "This campaign is not currently accepting submissions." };
        }
        if (!payload.contentUrl?.trim() && !payload.caption?.trim()) {
          return { ok: false as const, error: "Add a content link or a short caption before submitting." };
        }

        const submissionId = makeId("submission");
        set((state) => ({
          submissions: [
            {
              id: submissionId,
              campaignId,
              wallet: normalizedWallet,
              contentUrl: payload.contentUrl?.trim() || undefined,
              caption: payload.caption?.trim() || undefined,
              status: "pending",
              createdAt: new Date().toISOString(),
            },
            ...state.submissions,
          ],
        }));

        return { ok: true as const, submissionId };
      },
      reviewSubmission: (campaignId, submissionId, reviewerWallet, status) => {
        const campaign = getCampaignById(get().campaigns, campaignId);
        if (!campaign) {
          return { ok: false as const, error: "Campaign not found." };
        }

        const submission = get().submissions.find(
          (entry) => entry.id === submissionId && entry.campaignId === campaignId
        );

        if (!submission) {
          return { ok: false as const, error: "Submission not found." };
        }

        const previousStatus = submission.status;
        const normalizedWallet = normalizeWallet(submission.wallet);

        set((state) => {
          const existingParticipant = getParticipant(state.participants, campaignId, normalizedWallet);
          const approvedDelta =
            previousStatus === "approved" && status !== "approved"
              ? -1
              : previousStatus !== "approved" && status === "approved"
              ? 1
              : 0;

          let participants = state.participants;
          if (approvedDelta !== 0) {
            const updatedParticipant: CampaignParticipantRecord = existingParticipant
              ? {
                  ...existingParticipant,
                  approvedContentEntries: Math.max(0, existingParticipant.approvedContentEntries + approvedDelta),
                  updatedAt: new Date().toISOString(),
                }
              : {
                  campaignId,
                  wallet: normalizedWallet,
                  ethEntries: 0,
                  approvedContentEntries: Math.max(0, approvedDelta),
                  redeemedEntries: 0,
                  updatedAt: new Date().toISOString(),
                };

            participants = existingParticipant
              ? state.participants.map((participant) =>
                  participant.campaignId === campaignId && participant.wallet === normalizedWallet
                    ? updatedParticipant
                    : participant
                )
              : [...state.participants, updatedParticipant];
          }

          return {
            participants,
            submissions: state.submissions.map((entry) =>
              entry.id === submissionId
                ? {
                    ...entry,
                    status,
                    reviewedAt: new Date().toISOString(),
                    reviewedBy: normalizeWallet(reviewerWallet),
                  }
                : entry
            ),
          };
        });

        return { ok: true as const };
      },
      redeemEntries: (campaignId, wallet, quantity) => {
        const normalizedWallet = normalizeWallet(wallet);
        const state = get();
        const campaign = getCampaignById(state.campaigns, campaignId);
        const participant = getParticipant(state.participants, campaignId, normalizedWallet);

        if (!campaign) {
          return { ok: false as const, error: "Campaign not found." };
        }
        if (getCampaignStatus(campaign) !== "redeemable") {
          return { ok: false as const, error: "Redemption opens 24 hours after the campaign closes." };
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return { ok: false as const, error: "Choose at least one POAP to redeem." };
        }

        const redeemableCount = getRedeemableCount(participant);
        if (redeemableCount < quantity) {
          return { ok: false as const, error: "You do not have that many POAP credits available." };
        }

        const redeemedTotal = getCampaignRedeemedTotal(state.participants, campaignId);
        if (redeemedTotal + quantity > campaign.maxSupply) {
          return { ok: false as const, error: "Campaign reward supply has been exhausted." };
        }

        const nowIso = new Date().toISOString();
        const rewards: CampaignRewardRecord[] = Array.from({ length: quantity }, (_, index) => ({
          id: makeId("reward"),
          campaignId,
          wallet: normalizedWallet,
          tokenId: state.nextTokenId + index,
          title: campaign.title,
          imageUrl: campaign.imageUrl,
          redeemedAt: nowIso,
        }));

        set((currentState) => {
          const currentParticipant = getParticipant(currentState.participants, campaignId, normalizedWallet);
          if (!currentParticipant) {
            return currentState;
          }

          return {
            participants: currentState.participants.map((entry) =>
              entry.campaignId === campaignId && entry.wallet === normalizedWallet
                ? {
                    ...entry,
                    redeemedEntries: entry.redeemedEntries + quantity,
                    updatedAt: nowIso,
                  }
                : entry
            ),
            rewards: [...rewards, ...currentState.rewards],
            nextTokenId: currentState.nextTokenId + quantity,
          };
        });

        return { ok: true as const, rewards };
      },
    }),
    {
      name: "campaign-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
