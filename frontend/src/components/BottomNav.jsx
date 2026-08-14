import { NavLink } from "react-router-dom";
import { HomeIcon, PlateIcon, HeartPulseIcon, UserIcon } from "./Icons";

const TABS = [
  { to: "/home", label: "Home", Icon: HomeIcon },
  { to: "/nutriscan", label: "NutriScan", Icon: PlateIcon },
  { to: "/first-responder", label: "Responder", Icon: HeartPulseIcon },
  { to: "/profile", label: "Profile", Icon: UserIcon },
];

export default function BottomNav() {
  return (
    <nav
      className="glass-elevated fixed z-40 flex
                 bottom-4 left-4 right-4 justify-around py-2 px-2
                 md:top-6 md:left-6 md:bottom-6 md:right-auto md:w-20 md:flex-col md:justify-start md:gap-2 md:py-6"
      style={{ borderRadius: 24 }}
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="flex flex-col items-center gap-1 px-3 py-1.5 text-[11px] transition-colors"
        >
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? "var(--color-sky)" : "rgba(234,244,255,0.55)" }}>
                <Icon size={22} />
              </span>
              <span style={{ color: isActive ? "var(--color-sky)" : "rgba(234,244,255,0.55)" }}>
                {label}
              </span>
              {isActive && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: "var(--color-sky)" }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
