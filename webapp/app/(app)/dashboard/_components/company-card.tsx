"use client";

import Link from "next/link";
import { ExternalLink, Users, Mail, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Company } from "@/lib/types";

function StatusBadge({ status }: { status: Company["status"] }) {
  if (status === "researching") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-[var(--brand-violet)]/20 bg-[var(--brand-violet-soft)] text-[var(--brand-violet-deep)]"
      >
        <Loader2 className="size-3 animate-spin" />
        Researching
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="border-destructive/20">
        Error
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="border-[var(--cta)]/20 bg-[var(--cta)]/15 text-[oklch(0.35_0.18_142)]"
    >
      Ready
    </Badge>
  );
}

export function CompanyCard({ company }: { company: Company }) {
  const description = company.profile.description?.trim();
  const tech = company.profile.technologies?.slice(0, 4) ?? [];
  const peopleCount = company.profile.keyPeople?.length ?? 0;
  const newsCount = company.profile.recentNews?.length ?? 0;
  const updated = company.updatedAt?.toDate?.();
  const updatedLabel = updated ? relativeTime(updated) : null;

  return (
    <Link href={`/dashboard/${company.id}`} className="group block focus:outline-none">
      <Card className="relative h-full overflow-hidden border-border/70 p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-violet)]/30 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.08),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold tracking-tight">{company.name}</h3>
              {company.profile.industry ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">·</span>
              ) : null}
              {company.profile.industry ? (
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  {company.profile.industry}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <span>{company.domain}</span>
              <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
          </div>
          <StatusBadge status={company.status} />
        </div>

        {description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        ) : (
          <p className="mt-3 line-clamp-2 text-sm italic text-muted-foreground/70">
            No description yet — the agent is still gathering details.
          </p>
        )}

        {tech.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tech.map((t) => (
              <Badge key={t} variant="outline" className="rounded-full border-border/70 px-2 py-0 text-[10px] font-medium">
                {t}
              </Badge>
            ))}
            {(company.profile.technologies?.length ?? 0) > 4 ? (
              <Badge variant="outline" className="rounded-full border-border/70 px-2 py-0 text-[10px] text-muted-foreground">
                +{(company.profile.technologies?.length ?? 0) - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {peopleCount} {peopleCount === 1 ? "person" : "people"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3.5" />
            {newsCount} {newsCount === 1 ? "story" : "stories"}
          </span>
          {updatedLabel ? <span className="ml-auto">{updatedLabel}</span> : null}
        </div>
      </Card>
    </Link>
  );
}

function relativeTime(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
