import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 mt-16 flex flex-col relative w-full">
        {children}
      </div>
    </div>
  );
}

