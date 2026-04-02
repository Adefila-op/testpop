import { Link, useLocation } from "react-router-dom";
import { appShellNavItems, isAppShellNavActive } from "./appShellNav";

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl safe-bottom md:hidden">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2 pb-safe">
        {appShellNavItems.map((item) => {
          const isActive = isAppShellNavActive(item.path, location.pathname);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 md:px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-4 w-4 md:h-5 md:w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
