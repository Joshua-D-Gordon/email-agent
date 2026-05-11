"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authedFetch } from "@/lib/api-client";

export function NewProspectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [interest, setInterest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setName("");
    setDomain("");
    setInterest("");
    setError(null);
    setPending(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await authedFetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain, interest }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const { id } = (await res.json()) as { id: string };
      setOpen(false);
      reset();
      router.push(`/chat?company=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            className="h-9 rounded-full bg-foreground px-4 text-background hover:bg-foreground/90"
          >
            <Sparkles />
            New prospect
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New prospect</DialogTitle>
          <DialogDescription>
            We&apos;ll create an empty profile and open a chat where the agent can research them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prospect-name">Company name</Label>
            <Input
              id="prospect-name"
              required
              autoFocus
              placeholder="Monday.com"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-domain">Domain</Label>
            <Input
              id="prospect-domain"
              required
              placeholder="monday.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Used as the profile&apos;s primary key. Without http:// or www.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prospect-interest">Interest in company</Label>
            <textarea
              id="prospect-interest"
              required
              rows={3}
              placeholder="e.g. We sell a payroll platform for fast-growing SaaS companies and want to pitch them on consolidating their global payroll."
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              disabled={pending}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              What you&apos;re pitching them. The agent uses this to angle the research and email.
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {pending ? "Creating…" : "Start researching"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
