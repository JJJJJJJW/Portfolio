import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation } from "react-router";
import React, { useEffect } from "react";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import ColorBends from "../components/ColorBends";
import LandingPage from "../pages/LandingPage";
import { useTheme } from "../context/ThemeContext";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const { theme } = useTheme();
  const isDashboardRoot = location.pathname === '/dashboard';

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (!container || !isDashboardRoot) return;

    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const handleWheel = (e: WheelEvent) => {
      // If currently animating a scroll, prevent native scroll
      if (isScrolling) {
        e.preventDefault();
        return;
      }

      const isAtTop = container.scrollTop === 0;
      // Use a tolerance of 10px to account for fractional scrolling or zoom levels
      const isAtDashboardTop = Math.abs(container.scrollTop - container.clientHeight) < 10;

      if (isAtTop && e.deltaY > 0) {
        e.preventDefault();
        isScrolling = true;
        document.getElementById('dashboard-content')?.scrollIntoView({ behavior: 'smooth' });

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => { isScrolling = false; }, 800);
      } else if (isAtDashboardTop && e.deltaY < 0) {
        e.preventDefault();
        isScrolling = true;
        document.getElementById('landing-page')?.scrollIntoView({ behavior: 'smooth' });

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => { isScrolling = false; }, 800);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isDashboardRoot]);

  return (
    <div className="relative h-screen flex flex-col overflow-y-auto scroll-smooth  text-slate-200 dark:bg-transparent dark:text-inherit" id="main-scroll-container">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0">
          <ColorBends
            colors={theme === "light" ? ["#96c4ffff", "#8ad6ffff", "#8a8cffff"] : ["#0400ffff", "#0011ffff", "#2600ffff"]}
            rotation={115}
            speed={0.2}
            scale={1}
            frequency={1}
            warpStrength={1}
            mouseInfluence={0}
            noise={0.08}
            parallax={0}
            iterations={1}
            intensity={1.5}
            bandWidth={4}
            transparent
          />
        </div>

      </div>

      {isDashboardRoot && (
        <div id="landing-page" className="relative z-20 w-full min-h-screen snap-start shrink-0">
          <LandingPage />
        </div>
      )}

      <div id="dashboard-content" className="relative z-10 flex w-full flex-1 snap-start shrink-0 min-h-screen">
        <div className="sticky top-0 h-screen w-0 z-50">
          <AppSidebar />
          <Backdrop />
        </div>
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
            } ${isMobileOpen ? "ml-0" : ""}`}
        >
          <AppHeader />
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
