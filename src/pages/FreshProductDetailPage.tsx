import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useGuestCollector } from "@/hooks/useGuestCollector";
import { addFreshCartItem, fetchFreshProduct, type FreshProduct } from "@/lib/freshApi";

function formatEth(value: number) {
  return `${Number(value || 0).toFixed(3)} ETH`;
}

export default function FreshProductDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const collectorId = useGuestCollector();
  const [product, setProduct] = useState<FreshProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const payload = await fetchFreshProduct(id);
        if (!active) return;
        setProduct(payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load product.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) {
      void load();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [id]);

  async function handleBuyNow() {
    if (!product) return;
    try {
      setBusy(true);
      await addFreshCartItem(collectorId, product.id, 1);
      navigate("/checkout");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          Product not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{product.product_type}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{product.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{product.description}</p>
        <p className="mt-3 text-lg font-semibold text-slate-900">{formatEth(product.price_eth)}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {product.render_mode === "image" ? (
          <div className="space-y-3">
            <img src={product.image_url} alt={product.title} className="max-h-[520px] w-full rounded-xl object-contain" />
            {product.download_url ? (
              <a
                href={product.download_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Download image
              </a>
            ) : null}
          </div>
        ) : null}

        {product.render_mode === "ebook" ? (
          <div className="space-y-3">
            {product.readable_url ? (
              <iframe
                src={product.readable_url}
                title={product.title}
                className="h-[560px] w-full rounded-xl border border-slate-200"
              />
            ) : (
              <p className="text-sm text-slate-600">Ebook preview unavailable.</p>
            )}
            {product.download_url ? (
              <a
                href={product.download_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Download ebook
              </a>
            ) : null}
          </div>
        ) : null}

        {product.render_mode === "download" ? (
          <div className="space-y-3">
            {product.image_url ? <img src={product.image_url} alt={product.title} className="h-72 w-full rounded-xl object-cover" /> : null}
            {product.download_url ? (
              <a
                href={product.download_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Download file
              </a>
            ) : (
              <p className="text-sm text-slate-600">No download path is configured for this file.</p>
            )}
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleBuyNow()}
          disabled={busy}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {busy ? "Adding..." : "Buy now"}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/checkout?product=${encodeURIComponent(product.id)}&gift=1`)}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Gift this product
        </button>
      </div>
    </div>
  );
}
