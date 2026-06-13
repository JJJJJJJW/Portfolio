import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useLocation, useNavigate } from "react-router";
import React, { useEffect, useRef, useState } from "react";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import ColorBends from "../components/ColorBends.tsx";
import LandingPage from "../pages/LandingPage";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import GuestBanner from "../components/common/GuestBanner";
import { Modal } from "../components/ui/modal";
import Select from "../components/form/Select";
import Label from "../components/form/Label";
import Button from "../components/ui/button/Button";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isAuthenticated, user, updateProfile } = useUser();
  const isDashboardRoot = location.pathname === '/dashboard';
  const prevAuthRef = useRef(isAuthenticated);
  // Show landing page on the dashboard route for all users (guests and authenticated)
  const showLandingPage = isDashboardRoot;

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupCurrency, setSetupCurrency] = useState("USD");
  const [setupRisk, setSetupRisk] = useState("Moderate");

  useEffect(() => {
    if (isAuthenticated && user) {
      const needsSetup = !user.currency || !user.riskAppetite;
      setShowSetupModal(needsSetup);
    } else {
      setShowSetupModal(false);
    }
  }, [isAuthenticated, user]);

  const handleSetupSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const success = await updateProfile(
        user.displayName || "Google User",
        user.avatarUrl || "",
        setupCurrency,
        setupRisk
      );
      if (success) {
        setShowSetupModal(false);
      }
    }
  };

  useEffect(() => {
    // Scroll smoothly back to top (landing page) on logout
    if (prevAuthRef.current && !isAuthenticated) {
      const container = document.getElementById('main-scroll-container');
      if (container) {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    const oauthRedirectFrom = sessionStorage.getItem("oauth_redirect_from");
    if (oauthRedirectFrom) {
      sessionStorage.removeItem("oauth_redirect_from");
      if (oauthRedirectFrom !== "/dashboard" && oauthRedirectFrom !== "/signin" && oauthRedirectFrom !== "/signup") {
        navigate(oauthRedirectFrom, { replace: true });
      }
    }
  }, [navigate]);

  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("just_logged_in") === "true" ||
      (location.state && (location.state as any).scrollToOverview);

    if (justLoggedIn) {
      setTimeout(() => {
        const container = document.getElementById('main-scroll-container');
        const dashboard = document.getElementById('dashboard-content');

        if (container && dashboard) {
          const targetTop = dashboard.offsetTop || container.clientHeight || window.innerHeight;
          
          if (targetTop > 0) {
            // Temporarily disable smooth scroll to jump instantly
            const originalBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';
            
            container.scrollTop = targetTop;
            
            // Restore smooth scroll behavior
            container.style.scrollBehavior = originalBehavior;
            
            // Clear flags
            sessionStorage.removeItem("just_logged_in");
            window.history.replaceState({}, document.title);
          }
        }
      }, 100); // Wait 100ms for DOM layout to settle
    }
  }, [location, isAuthenticated]);

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (!container || !showLandingPage) return;

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
  }, [showLandingPage]);

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

      {showLandingPage && (
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
            <GuestBanner />
            <Outlet />
          </div>
        </div>
      </div>

      {/* First-time setup modal for logged in users */}
      <Modal isOpen={showSetupModal} onClose={() => {}} className="max-w-[500px] m-4" showCloseButton={false}>
        <div className="bg-white p-6 dark:bg-gray-900 rounded-3xl relative">
          <div className="mb-6">
            <h4 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-2">
              Setup Your Portfolio
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome to Techfolio! Please select your default currency and risk appetite to initialize your profile.
            </p>
          </div>
          <form onSubmit={handleSetupSave} className="space-y-4">
            <div>
              <Label>Currency</Label>
              <Select
                options={[
                  { value: "USD", label: "USD ($)" },
                  { value: "MYR", label: "MYR (RM)" },
                ]}
                defaultValue="USD"
                onChange={(val) => setSetupCurrency(val)}
              />
            </div>
            <div>
              <Label>Risk Appetite</Label>
              <Select
                options={[
                  { value: "Conservative", label: "Conservative" },
                  { value: "Moderate", label: "Moderate" },
                  { value: "Aggressive", label: "Aggressive" },
                ]}
                defaultValue="Moderate"
                onChange={(val) => setSetupRisk(val)}
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" size="sm">
                Get Started
              </Button>
            </div>
          </form>
        </div>
      </Modal>
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
