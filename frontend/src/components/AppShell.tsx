import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col md:flex-row bg-background">
      {/* Sidebar hidden on mobile, fixed left */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0 relative">
        <TopNav />
        <div className="flex-1 mt-16 flex flex-col relative w-full pb-24 md:pb-16">
          {children}
        </div>
      </div>
    </div>
  );
}
