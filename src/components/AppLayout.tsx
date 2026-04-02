import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";

const AppLayout = () => {
  return (
    <div className="min-h-screen-safe bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_30%),linear-gradient(to_bottom,_rgba(15,23,42,0.03),_transparent_20%)]">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-0 pb-16 md:px-4 md:pb-8 lg:px-6">
        <div className="md:pt-6 lg:pt-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
