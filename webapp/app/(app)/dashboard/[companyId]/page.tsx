"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Mail,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany, useCompanyEmails } from "@/lib/companies-client";
import type { Company, DraftedEmail } from "@/lib/types";

export default function CompanyDossierPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const { data: company, loading } = useCompany(companyId);
  const { data: emails } = useCompanyEmails(companyId);

  if (loading) return <DossierSkeleton />;

  if (!company) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Company not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dossier doesn&apos;t exist or has been removed.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6 rounded-full">
          <Link href="/dashboard">
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const latestEmail = emails[0];

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All prospects
      </Link>

      <CompanyHeader company={company} />

      <InterestPanel company={company} />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfilePanel company={company} />
          <RecentNewsPanel company={company} />
          <SourcesPanel company={company} />
        </div>
        <div className="space-y-6">
          <EmailPanel email={latestEmail} />
          <KeyPeoplePanel company={company} />
        </div>
      </div>
    </div>
  );
}

function CompanyHeader({ company }: { company: Company }) {
  return (
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-3xl font-semibold tracking-tight">{company.name}</h1>
          <StatusPill status={company.status} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <a
            href={`https://${company.domain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Globe className="size-3.5" />
            {company.domain}
            <ExternalLink className="size-3" />
          </a>
          {company.profile.industry ? (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5" />
              {company.profile.industry}
            </span>
          ) : null}
          {company.profile.headquarters ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {company.profile.headquarters}
            </span>
          ) : null}
          {company.profile.sizeEstimate ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {company.profile.sizeEstimate}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Company["status"] }) {
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
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return (
    <Badge
      variant="secondary"
      className="border-[var(--cta)]/20 bg-[var(--cta)]/15 text-[oklch(0.35_0.18_142)]"
    >
      Ready
    </Badge>
  );
}

function InterestPanel({ company }: { company: Company }) {
  if (!company.interest) return null;
  return (
    <div className="mt-6 flex items-start gap-2 rounded-lg border border-[var(--brand-violet)]/20 bg-[var(--brand-violet-soft)]/40 px-4 py-3">
      <Target className="mt-0.5 size-4 shrink-0 text-[var(--brand-violet-deep)]" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-violet-deep)]">
          Your angle
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {company.interest}
        </p>
      </div>
    </div>
  );
}

function ProfilePanel({ company }: { company: Company }) {
  const { description, technologies, funding } = company.profile;
  const hasFunding = funding && (funding.lastRound || funding.amount || funding.date);

  return (
    <Card className="border-border/70 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Company profile
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{description}</p>
      ) : (
        <p className="mt-3 text-sm italic text-muted-foreground">
          The agent hasn&apos;t written a description yet.
        </p>
      )}

      {technologies && technologies.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tech stack
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {technologies.map((t) => (
              <Badge key={t} variant="outline" className="rounded-full border-border/70 px-2.5 py-0.5 text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {hasFunding ? (
        <>
          <Separator className="my-5" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Funding</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {funding!.lastRound ? <span className="font-medium">{funding!.lastRound}</span> : null}
            {funding!.amount ? (
              <span className="text-[var(--brand-violet-deep)]">{funding!.amount}</span>
            ) : null}
            {funding!.date ? <span className="text-muted-foreground">{funding!.date}</span> : null}
          </div>
          {funding!.investors && funding!.investors.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Investors: {funding!.investors.join(", ")}
            </p>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function RecentNewsPanel({ company }: { company: Company }) {
  const news = company.profile.recentNews;
  if (!news || news.length === 0) return null;

  return (
    <Card className="border-border/70 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recent news
      </h2>
      <ul className="mt-3 space-y-3">
        {news.map((item) => (
          <li key={item.url} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-start gap-1.5 text-sm font-medium hover:text-[var(--brand-violet-deep)]"
            >
              <span className="flex-1">{item.headline}</span>
              <ExternalLink className="mt-0.5 size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
            {item.date ? <p className="mt-0.5 text-xs text-muted-foreground">{item.date}</p> : null}
            {item.summary ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SourcesPanel({ company }: { company: Company }) {
  if (!company.sources || company.sources.length === 0) return null;

  return (
    <Card className="border-border/70 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Sources ({company.sources.length})
      </h2>
      <ul className="mt-3 space-y-1.5">
        {company.sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-start gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="mt-0.5 size-3 shrink-0" />
              <span className="truncate">{s.title ?? s.url}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function KeyPeoplePanel({ company }: { company: Company }) {
  const people = company.profile.keyPeople;
  if (!people || people.length === 0) return null;

  return (
    <Card className="border-border/70 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Key people
      </h2>
      <ul className="mt-3 space-y-3">
        {people.map((p) => (
          <li key={`${p.name}-${p.role}`}>
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.role}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EmailPanel({ email }: { email: DraftedEmail | undefined }) {
  if (!email) {
    return (
      <Card className="border-border/70 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Drafted email
        </h2>
        <div className="mt-4 rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          <Mail className="mx-auto size-5 opacity-60" />
          <p className="mt-2">No draft yet.</p>
          <p className="text-xs">The agent writes one once research is done.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/70 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.22_295/0.08),transparent_70%)]"
      />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Drafted email
        </h2>
        <EmailStatusBadge status={email.status} />
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
        <p className="text-sm font-medium">{email.subject}</p>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Body</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{email.body}</p>
      </div>

      <Separator className="my-4" />

      <div className="rounded-lg border border-[var(--cta)]/20 bg-[var(--cta)]/10 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.35_0.18_142)]">
          <Calendar className="size-3" />
          Recommended send trigger
        </p>
        <p className="mt-1 text-sm text-foreground">{email.recommendedSendTrigger}</p>
      </div>
    </Card>
  );
}

function EmailStatusBadge({ status }: { status: DraftedEmail["status"] }) {
  if (status === "approved") {
    return (
      <Badge
        variant="secondary"
        className="border-[var(--cta)]/20 bg-[var(--cta)]/15 text-[oklch(0.35_0.18_142)]"
      >
        Approved
      </Badge>
    );
  }
  if (status === "pending_approval") {
    return (
      <Badge
        variant="secondary"
        className="border-[var(--brand-violet)]/20 bg-[var(--brand-violet-soft)] text-[var(--brand-violet-deep)]"
      >
        Awaiting approval
      </Badge>
    );
  }
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function DossierSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-6 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
