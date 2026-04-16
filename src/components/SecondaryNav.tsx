/**
 * Secondary Navigation Menu
 * Location: src/components/SecondaryNav.tsx
 * 
 * Displays marketplace, collection, creator, and admin navigation items
 */

import { useState } from "react";
import { useLocation } from "react-router-dom";
import { secondaryNavItems } from "./appShellNav";
import { NavLink } from "./NavLink";
import { ChevronDown } from "lucide-react";

export function SecondaryNav() {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isPathActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {secondaryNavItems.map((section) => (
            <div key={section.section} className="space-y-1">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.section)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-foreground/70 hover:text-foreground transition-colors"
              >
                <span>{section.section}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    expandedSections.has(section.section) ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Section Items */}
              <div
                className={`space-y-0.5 overflow-hidden transition-all ${
                  expandedSections.has(section.section)
                    ? "max-h-96"
                    : "max-h-0 hidden"
                }`}
              >
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isPathActive(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="line-clamp-1">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default SecondaryNav;
