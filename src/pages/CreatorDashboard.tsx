import { LayoutDashboard, Presentation, Sparkles, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CreatorDashboard() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          <LayoutDashboard className="h-4 w-4" />
          Artist dashboard
        </div>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Creator Operations Hub</h1>
        <p className="mt-2 text-sm text-slate-600">
          Campaign studio, tokenized creator card, and portfolio showcase are now consolidated into this dashboard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <Presentation className="h-5 w-5 text-slate-700" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Campaign Studio</h2>
          <p className="mt-1 text-sm text-slate-600">Create and manage release campaigns from one place.</p>
          <button
            type="button"
            onClick={() => navigate("/studio?tab=drops")}
            className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Campaign Studio
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <WalletCards className="h-5 w-5 text-slate-700" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Tokenized Creator Card</h2>
          <p className="mt-1 text-sm text-slate-600">Launch and monitor creator-card offerings.</p>
          <button
            type="button"
            onClick={() => navigate("/studio?tab=raises")}
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Open Creator Card Flow
          </button>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <Sparkles className="h-5 w-5 text-slate-700" />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">Portfolio Showcase</h2>
          <p className="mt-1 text-sm text-slate-600">Curate public portfolio highlights and creator profile assets.</p>
          <button
            type="button"
            onClick={() => navigate("/studio?tab=profile")}
            className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Open Portfolio
          </button>
        </article>
      </section>
    </div>
  );
}

export default CreatorDashboard;
