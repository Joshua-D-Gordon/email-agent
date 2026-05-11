"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanies } from "@/lib/companies-client";
import type { CompanyStatus } from "@/lib/types";
import { CompanyCard } from "./_components/company-card";
import { EmptyState } from "./_components/empty-state";
import { NewProspectDialog } from "./_components/new-prospect-dialog";

const STATUS_OPTIONS: { value: CompanyStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "ready", label: "Ready" },
  { value: "error", label: "Error" },
];

export default function DashboardPage() {
  const { data: companies, loading, error } = useCompanies();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<CompanyStatus>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter.size > 0 && !statusFilter.has(c.status)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        (c.profile.industry ?? "").toLowerCase().includes(q)
      );
    });
  }, [companies, search, statusFilter]);

  const totalCount = companies.length;
  const filterLabel =
    statusFilter.size === 0
      ? "All status"
      : statusFilter.size === 1
        ? STATUS_OPTIONS.find((s) => statusFilter.has(s.value))?.label ?? "Filtered"
        : `${statusFilter.size} statuses`;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 md:py-10">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Prospects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every company the agent has researched, with a live profile and drafted email.
          </p>
        </div>
        {totalCount > 0 ? <NewProspectDialog /> : null}
      </header>

      {totalCount > 0 ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, domain, or industry…"
              className="h-10 rounded-full border-border/70 bg-background pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 shrink-0 rounded-full border-border/70 px-4 text-sm font-medium"
              >
                {filterLabel}
                {statusFilter.size > 0 ? (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 rounded-full border-border/60 bg-foreground/10 px-1.5 text-[10px]"
                  >
                    {statusFilter.size}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={statusFilter.has(opt.value)}
                  onCheckedChange={(checked) => {
                    setStatusFilter((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(opt.value);
                      else next.delete(opt.value);
                      return next;
                    });
                  }}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <button
                    type="button"
                    onClick={() => setStatusFilter(new Set())}
                    className="block w-full px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear filters
                  </button>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className="mt-8">
        {error ? (
          <ErrorPanel message={error.message} />
        ) : loading ? (
          <LoadingGrid />
        ) : totalCount === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <NoResults onClear={() => { setSearch(""); setStatusFilter(new Set()); }} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CompanyCard key={c.id} company={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/70 p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-24" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <div className="mt-4 flex gap-1.5">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">No companies match those filters.</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="mt-3 h-8 rounded-full text-xs"
      >
        Clear search and filters
      </Button>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-sm text-destructive">
      <p className="font-medium">Couldn&apos;t load companies.</p>
      <p className="mt-1 text-destructive/80">{message}</p>
    </div>
  );
}
