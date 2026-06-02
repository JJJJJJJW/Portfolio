import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserSettingsCard from "../components/UserProfile/UserSettingsCard";
import PageMeta from "../components/common/PageMeta";

export default function UserProfiles() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <PageMeta
        title="React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      
      <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
        <PageBreadcrumb pageTitle="Profile & Settings" />
      </div>
      
      <div className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 lg:p-6 transition-all duration-1000 delay-100 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
        <h3 className={`mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7 transition-all duration-1000 delay-200 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
          Profile
        </h3>
        <div className="space-y-6">
         
          <div className={`transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
            <UserInfoCard />
          </div>
          
          <h3 className={`mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7 transition-all duration-1000 delay-400 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
            Settings
          </h3>
        
          <div className={`transition-all duration-1000 delay-500 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-30 blur-xs'}`}>
            <UserSettingsCard />
          </div>
        
        </div>
      </div>
    </>
  );
}

