import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useGuestCollector } from "@/hooks/useGuestCollector";
import {
  addFreshCartItem,
  checkoutFresh,
  fetchFreshCart,
  removeFreshCartItem,
  updateFreshCartItem,
  type FreshCart,
} from "@/lib/freshApi";
import { ACTIVE_CHAIN } from "@/lib/wagmi";

function formatEth(value: number) {
  return `${Number(value || 0).toFixed(3)} ETH`;
}

function resolveFulfillmentLabel(items: FreshCart["items"]) {
  const modes = new Set(items.map((item) => item.delivery_mode));
  if (modes.has("deliver_physical")) return "Physical delivery";
  if (modes.has("collect_onchain")) return "Onchain collection";
  if (modes.has("render_online")) return "Online rendering";
  return "Mobile download";
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectorId = useGuestCollector();

  const productFromQuery = String(searchParams.get("product") || "").trim();
  const giftFromQuery = searchParams.get("gift") === "1";

  const [cart, setCart] = useState<FreshCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"onchain" | "offramp_partner">("offramp_partner");
  const [isGift, setIsGift] = useState(giftFromQuery);
  const [recipientLabel, setRecipientLabel] = useState("");
  const [completed, setCompleted] = useState<{
    orderId: string;
    paymentMethod: string;
    giftUrl: string | null;
  } | null>(null);

  useEffect(() => {
    setIsGift(giftFromQuery);
  }, [giftFromQuery]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        setLoading(true);
        if (productFromQuery) {
          await addFreshCartItem(collectorId, productFromQuery, 1);
          navigate(giftFromQuery ? "/checkout?gift=1" : "/checkout", { replace: true });
          return;
        }
        const payload = await fetchFreshCart(collectorId);
        if (!active) return;
        setCart(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load checkout cart.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [collectorId, giftFromQuery, navigate, productFromQuery]);

  async function refreshCart() {
    const payload = await fetchFreshCart(collectorId);
    setCart(payload);
  }

  async function changeQuantity(productId: string, quantity: number) {
    try {
      const payload = await updateFreshCartItem(collectorId, productId, quantity);
      setCart(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update quantity.");
    }
  }

  async function removeItem(productId: string) {
    try {
      const payload = await removeFreshCartItem(collectorId, productId);
      setCart(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove item.");
    }
  }

  async function handleCheckout() {
    if (!cart || cart.items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    if (isGift && !recipientLabel.trim()) {
      toast.error("Enter who should receive the gift.");
      return;
    }

    try {
      setIsCheckingOut(true);
      const payload = await checkoutFresh({
        collectorId,
        paymentMethod,
        gift: isGift ? { recipient_label: recipientLabel.trim() } : undefined,
      });

      setCompleted({
        orderId: payload.order.id,
        paymentMethod: payload.order.payment_method,
        giftUrl: payload.gift?.claim_url || null,
      });
      await refreshCart();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  function openCoinbasePay() {
    const appId = import.meta.env.VITE_COINBASE_PAY_APP_ID?.trim();
    if (!appId) {
      toast.error("Coinbase Pay is not configured yet.");
      return;
    }
    const url = `https://pay.coinbase.com/buy/select-asset?appId=${encodeURIComponent(appId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <CheckCircle className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Payment Confirmed</h1>
          <p className="mt-2 text-sm text-slate-600">Order {completed.orderId} completed via {completed.paymentMethod}.</p>
          {completed.giftUrl ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Gift claim link</p>
              <a
                href={completed.giftUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-sm font-medium text-sky-700 underline underline-offset-2"
              >
                {completed.giftUrl}
              </a>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/discover")}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Continue Discovering
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Open Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <button
        type="button"
        onClick={() => navigate("/discover")}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {!cart || cart.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Cart is empty. Add a product from discover.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">Checkout Cart</h2>
            <div className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <article key={item.product_id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start gap-3">
                    <img src={item.image_url} alt={item.title} className="h-16 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.creator_name}</p>
                      <p className="text-xs text-slate-500">{item.product_type}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatEth(item.line_total_eth)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void changeQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                      className="h-7 w-7 rounded-full border border-slate-300 text-sm font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-slate-700">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => void changeQuantity(item.product_id, item.quantity + 1)}
                      className="h-7 w-7 rounded-full border border-slate-300 text-sm font-bold text-slate-700"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.product_id)}
                      className="ml-auto text-xs font-semibold uppercase tracking-[0.14em] text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">Payment</h2>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                <input
                  type="radio"
                  checked={paymentMethod === "onchain"}
                  onChange={() => setPaymentMethod("onchain")}
                />
                <span className="text-sm font-medium text-slate-700">Onchain wallet payment</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                <input
                  type="radio"
                  checked={paymentMethod === "offramp_partner"}
                  onChange={() => setPaymentMethod("offramp_partner")}
                />
                <span className="text-sm font-medium text-slate-700">Off-ramp partner payment</span>
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs uppercase tracking-[0.18em] text-slate-500">
              {paymentMethod === "onchain"
                ? `Chain: ${ACTIVE_CHAIN.name}`
                : "Offchain: Coinbase Pay (stubbed)"}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Fulfillment mode: {cart ? resolveFulfillmentLabel(cart.items) : "Loading"}
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isGift} onChange={(event) => setIsGift(event.target.checked)} />
                <span className="text-sm font-medium text-slate-700">Pay as a gift for another collector</span>
              </label>
              {isGift ? (
                <input
                  value={recipientLabel}
                  onChange={(event) => setRecipientLabel(event.target.value)}
                  placeholder="Recipient name, handle, or wallet label"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                />
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Total</span>
                <span className="text-lg font-bold text-slate-900">{formatEth(cart.total_eth)}</span>
              </div>
            </div>

            {paymentMethod === "offramp_partner" ? (
              <button
                type="button"
                onClick={openCoinbasePay}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Open Coinbase Pay
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={isCheckingOut}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Buy now
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
