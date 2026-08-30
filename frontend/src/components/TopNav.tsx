import Link from "next/link";
import MaterialIcon from "./MaterialIcon";
import { getUserAvatar } from "@/lib/api";

export default async function TopNav() {
  const userAvatar = await getUserAvatar();

  return (
    <nav className="fixed top-0 right-0 left-0 md:left-64 z-40 flex justify-between items-center px-lg py-md bg-background/80 backdrop-blur-md h-16">
      <div className="flex items-center gap-sm md:hidden">
        <Link href="/buyer" className="text-headline-md font-bold text-on-background hover:text-primary transition-colors duration-200">
          AgentCart
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-xs px-md py-sm rounded-full">
        <span className="w-2 h-2 rounded-full bg-secondary" />
        <span className="text-label-caps text-on-surface-variant">
          AI Agent Ready
        </span>
      </div>

      <div className="flex items-center gap-md">
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-200">
          <MaterialIcon icon="search" />
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative">
          <MaterialIcon icon="notifications" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all duration-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={userAvatar}
            alt="User profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </nav>
  );
}
