import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-forest-500">
      {trail.map((c, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {c.href && !isLast ? (
              <Link href={c.href} className="hover:text-forest-700 hover:underline">{c.label}</Link>
            ) : (
              <span className={isLast ? "text-forest-700 font-medium" : ""}>{c.label}</span>
            )}
            {!isLast && <CaretRight size={11} className="opacity-60" />}
          </span>
        );
      })}
    </nav>
  );
}
