import { ReactNode } from "react";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import { SidebarAvailableContext } from "@/components/Layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrialBanner } from "@/components/TrialBanner";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export const AppLayout = ({ children, title }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <SidebarAvailableContext.Provider value={true}>
        <div className="flex h-screen w-full bg-gray-50">
          <Sidebar />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header title={title} />
            
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <TrialBanner />
              {children}
            </main>
          </div>
        </div>
      </SidebarAvailableContext.Provider>
    </SidebarProvider>
  );
};
