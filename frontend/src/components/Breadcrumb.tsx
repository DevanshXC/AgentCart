import Link from "next/link";
import MaterialIcon from "./MaterialIcon";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-xs text-label-caps text-outline">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-xs">
          {i > 0 && <MaterialIcon icon="chevron_right" size={14} />}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-on-background">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
