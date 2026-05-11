"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { ArrowUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ComposerProps = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  disabledReason,
  placeholder = "Tell the agent which company to research…",
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
      <div
        className={cn(
          "relative rounded-2xl border bg-background shadow-sm transition",
          disabled ? "border-border/60 opacity-90" : "border-border focus-within:border-[var(--brand-violet)]/40 focus-within:shadow-md",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3.5 pr-14 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />

        <div className="absolute bottom-2 right-2">
          <SendButton disabled={disabled} disabledReason={disabledReason} canSend={value.trim().length > 0} onClick={onSubmit} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-muted-foreground">
        <span>
          {disabled ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" />
              {disabledReason ?? "Disabled"}
            </span>
          ) : (
            <>
              <kbd className="rounded border border-border/70 bg-muted/50 px-1 py-0.5 font-sans text-[9px] font-medium">Enter</kbd>{" "}
              to send ·{" "}
              <kbd className="rounded border border-border/70 bg-muted/50 px-1 py-0.5 font-sans text-[9px] font-medium">Shift</kbd>{" "}
              <kbd className="rounded border border-border/70 bg-muted/50 px-1 py-0.5 font-sans text-[9px] font-medium">Enter</kbd>{" "}
              for newline
            </>
          )}
        </span>
        <span>Powered by LangGraph + OpenAI</span>
      </div>
    </div>
  );
}

function SendButton({
  disabled,
  disabledReason,
  canSend,
  onClick,
}: {
  disabled: boolean;
  disabledReason?: string;
  canSend: boolean;
  onClick: () => void;
}) {
  const btn = (
    <Button
      type="button"
      size="icon"
      disabled={disabled || !canSend}
      onClick={onClick}
      className={cn(
        "size-9 rounded-xl shadow-sm transition",
        disabled || !canSend
          ? "bg-muted text-muted-foreground"
          : "bg-foreground text-background hover:bg-foreground/90",
      )}
      aria-label="Send"
    >
      <ArrowUp className="size-4" />
    </Button>
  );

  if (!disabled || !disabledReason) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Wrap so the tooltip can fire over a disabled button */}
        <span tabIndex={0}>{btn}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
