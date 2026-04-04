import { ShoppingCart } from "@/components/ShoppingCart";
import { ArrowRight, Flame, Package, ShieldCheck, User } from "lucide-react";
import { Link } from "react-router-dom";

export function CartPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.14),transparent_28%),linear-gradient(180deg,#f7fbff_0%,#eef5ff_100%)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/92 p-5 shadow-[0_35px_120px_rgba(37,99,235,0.10)] backdrop-blur md:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1d4ed8]">Cart</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground md:text-4xl">Complete your collector order</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review quantities, continue to checkout, or jump back into Drops without losing your basket.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-[#f3f8ff] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#e8f1ff]"
                  >
                    <User className="h-4 w-4 text-[#1d4ed8]" />
                    Profile
                  </Link>
                  <Link
                    to="/drops"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-[#f3f8ff] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#e8f1ff]"
                  >
                    <Flame className="h-4 w-4 text-[#1d4ed8]" />
                    Drops
                  </Link>
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-[#f3f8ff] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#e8f1ff]"
                  >
                    <Package className="h-4 w-4 text-[#1d4ed8]" />
                    Orders
                  </Link>
                </div>
              </div>

              <ShoppingCart />
            </section>

            <aside className="space-y-4">
              <div className="rounded-[1.6rem] border border-[#dbeafe] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1d4ed8]">Checkout Guide</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.2rem] bg-white/90 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe]">
                        <ShieldCheck className="h-4 w-4 text-[#1d4ed8]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Secure wallet checkout</p>
                        <p className="text-xs text-muted-foreground">Gas is confirmed in-wallet before payment finalizes.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/90 p-4">
                    <p className="text-sm font-semibold text-foreground">Track every order</p>
                    <p className="mt-1 text-xs text-muted-foreground">Your order history page keeps delivery status and tracking codes in one place.</p>
                    <Link to="/orders" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1d4ed8]">
                      Open order history
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
