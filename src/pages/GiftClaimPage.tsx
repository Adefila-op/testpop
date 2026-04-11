import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useGuestCollector } from "@/hooks/useGuestCollector";
import { acceptFreshGift, fetchFreshGift, rejectFreshGift, type FreshGift } from "@/lib/freshApi";

function formatEth(value: number) {
  return `${Number(value || 0).toFixed(3)} ETH`;
}

export default function GiftClaimPage() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const collectorId = useGuestCollector();

  const [gift, setGift] = useState<FreshGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"accept" | "reject" | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const payload = await fetchFreshGift(token);
        if (!active) return;
        setGift(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load gift.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) {
      void load();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [token]);

  async function handleAccept() {
    try {
      setBusyAction("accept");
      await acceptFreshGift(token, collectorId);
      const payload = await fetchFreshGift(token);
      setGift(payload);
      toast.success("Gift accepted. Item is now in your collection.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept gift.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReject() {
    try {
      setBusyAction("reject");
      await rejectFreshGift(token);
      const payload = await fetchFreshGift(token);
      setGift(payload);
      toast.success("Gift rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject gift.");
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          Gift not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Gift claim</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Gift from {gift.sender_collector_id}</h1>
        <p className="mt-2 text-sm text-slate-600">Recipient label: {gift.recipient_label}</p>
        <p className="mt-1 text-sm text-slate-600">Order total: {formatEth(gift.order_total_eth)}</p>
        <p className="mt-1 text-sm text-slate-600">Status: {gift.status}</p>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Items</h2>
        {gift.items.map((item) => (
          <article key={item.product_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2">
            <img src={item.image_url} alt={item.title} className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{formatEth(item.line_total_eth)}</p>
          </article>
        ))}
      </section>

      {gift.status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={busyAction !== null}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busyAction === "accept" ? "Accepting..." : "Accept gift"}
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={busyAction !== null}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-70"
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject gift"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Go to profile
        </button>
      )}
    </div>
  );
}
