import { useEffect, useState } from "react";
import { Boxes, LayoutDashboard, Loader2, Package, Sparkles, Ticket, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGuestCollector } from "@/hooks/useGuestCollector";
import {
  fetchFreshProfile,
  removeFreshCartItem,
  updateFreshCartItem,
  type FreshProfile,
} from "@/lib/freshApi";

function formatEth(value: number) {
  return `${Number(value || 0).toFixed(3)} ETH`;
}

export default function RebootProfileDashboardPage() {
  const navigate = useNavigate();
  const collectorId = useGuestCollector();
  const [profile, setProfile] = useState<FreshProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const payload = await fetchFreshProfile(collectorId);
        if (!active) return;
        setProfile(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [collectorId]);

  async function refreshProfile() {
    const payload = await fetchFreshProfile(collectorId);
    setProfile(payload);
  }

  async function updateQuantity(productId: string, nextQuantity: number) {
    try {
      setBusyItem(productId);
      const safeQuantity = Math.max(1, nextQuantity);
      await updateFreshCartItem(collectorId, productId, safeQuantity);
      await refreshProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update cart.");
    } finally {
      setBusyItem(null);
    }
  }

  async function removeItem(productId: string) {
    try {
      setBusyItem(productId);
      await removeFreshCartItem(collectorId, productId);
      await refreshProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove cart item.");
    } finally {
      setBusyItem(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-2">
      <section className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Profile Hub</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Collector + Artist Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Collector ID: {collectorId}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/discover")}
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700"
          >
            Discover feed
          </button>
          <button
            type="button"
            onClick={() => navigate("/studio")}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
          >
            Artist dashboard
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Boxes className="h-5 w-5" />
          Collection
        </h2>
        {profile?.collection.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {profile.collection.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <img src={item.image_url} alt={item.title} className="h-36 w-full rounded-lg object-cover" />
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.creator_name}</p>
                {item.render_mode === "delivery" ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-600">
                    Physical delivery
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate(`/products/${item.product_id}`)}
                  className="mt-2 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {item.render_mode === "delivery" ? "View delivery details" : "Open asset"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No collection items yet.</div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Ticket className="h-5 w-5" />
            POAP
          </h2>
          {profile?.poaps.length ? (
            <div className="mt-3 space-y-2">
              {profile.poaps.map((poap) => (
                <div key={poap.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <p className="text-sm font-semibold text-slate-900">{poap.title}</p>
                  <p className="text-xs text-slate-600">{poap.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No POAP earned yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5" />
            Subscriptions
          </h2>
          {profile?.subscriptions.length ? (
            <div className="mt-3 space-y-2">
              {profile.subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <p className="text-sm font-semibold text-slate-900">{sub.creator_id}</p>
                  <p className="text-xs text-slate-600">{sub.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No active subscriptions.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Package className="h-5 w-5" />
          Cart
        </h2>
        {profile?.cart.items.length ? (
          <div className="space-y-2">
            {profile.cart.items.map((item) => (
              <article key={item.product_id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{formatEth(item.unit_price_eth)} each</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatEth(item.line_total_eth)}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void updateQuantity(item.product_id, item.quantity - 1)}
                    disabled={busyItem === item.product_id}
                    className="h-7 w-7 rounded-full border border-slate-300 text-sm font-bold text-slate-700"
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold text-slate-700">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => void updateQuantity(item.product_id, item.quantity + 1)}
                    disabled={busyItem === item.product_id}
                    className="h-7 w-7 rounded-full border border-slate-300 text-sm font-bold text-slate-700"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeItem(item.product_id)}
                    disabled={busyItem === item.product_id}
                    className="ml-auto text-xs font-semibold uppercase tracking-[0.14em] text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm text-slate-600">Total</p>
              <p className="text-base font-bold text-slate-900">{formatEth(profile.cart.total_eth)}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Go to checkout
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">Cart is empty.</div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Truck className="h-5 w-5" />
          Order Tracking
        </h2>
        {profile?.orders.length ? (
          <div className="space-y-2">
            {profile.orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{order.id}</p>
                  <p className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.status}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{order.payment_method} | {formatEth(order.total_eth)}</p>
                {order.gift_token ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/gift/${order.gift_token}`)}
                    className="mt-2 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    Open gift status
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No orders yet.</div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <LayoutDashboard className="h-5 w-5" />
          Creator Dashboard
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            Campaign studio, tokenized creator card, and portfolio showcase are consolidated into the artist dashboard.
          </p>
          <button
            type="button"
            onClick={() => navigate("/studio")}
            className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open artist dashboard
          </button>
        </div>
      </section>

      {profile?.pending_gifts.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Pending Gift Links</h2>
          <div className="space-y-2">
            {profile.pending_gifts.map((gift) => (
              <article key={gift.token} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">Recipient: {gift.recipient_label}</p>
                <a
                  href={gift.claim_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-xs text-sky-700 underline underline-offset-2"
                >
                  {gift.claim_url}
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
