import Link from "next/link";
import SearchBox from "./SearchBox";
import NotificationsPopover from "./NotificationsPopover";
import { getUserAvatar, getRecentNotifications } from "@/lib/api";

export default async function TopNav() {
  const userAvatar = await getUserAvatar();
  const notifications = await getRecentNotifications();

  return (
    <nav className="fixed top-0 right-0 left-0 md:left-64 z-40 flex justify-between items-center px-lg py-md bg-background/80 backdrop-blur-md h-16">
      <div className="flex items-center gap-sm md:hidden">
        <Link href="/buyer" className="text-headline-md font-bold text-on-background hover:text-primary transition-colors duration-200">
          AgentCart
        </Link>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-md">
        <SearchBox />
        <NotificationsPopover items={notifications} />
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
