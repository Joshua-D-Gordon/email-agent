import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { BrandMark } from "./brand-mark";

const LINKS = [
  { label: "Chat agent", href: "/chat" },
  { label: "Live dashboard", href: "/dashboard" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <BrandMark />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            The AI outbound research agent for B2B revenue teams.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
        >
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Separator className="max-w-xs" />

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Agent Email · All rights reserved
        </p>
      </div>
    </footer>
  );
}
