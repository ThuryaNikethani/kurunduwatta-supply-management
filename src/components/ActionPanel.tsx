"use client";

import { CheckCircle2, Forward, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { performAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { errorText, useI18n } from "@/lib/i18n";
import type { Action, DocKind, Status } from "@/lib/types";
import { availableActions, noteRequired } from "@/lib/workflow";
import { Field } from "./common";

const ICON: Record<Action, typeof Send> = {
  submit: Send,
  resubmit: Send,
  forward_to_hr: Forward,
  return_to_chef: Undo2,
  reject_to_supervisor: Undo2,
  approve: CheckCircle2,
};

/**
 * Review buttons for the current user's role. Sending back requires a reason;
 * the chef can resend with a note explaining their quantities.
 */
export function ActionPanel({
  kind, id, title, status, children, forward,
}: {
  kind: DocKind; id: string; title: string; status: Status; children?: React.ReactNode;
  /**
   * Supervisor's own changes to send along with "forward to HR". A reason is
   * then required, and `summary` (what changed) is added under the reason.
   */
  forward?: { changes: Record<string, unknown>; summary: string; problem?: string } | null;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");

  if (!profile) return null;
  const actions = availableActions(profile.role, status);
  if (!actions.length) return null;

  async function run(action: Action) {
    if (!profile) return;
    const withChanges = action === "forward_to_hr" && forward ? forward : null;
    if (withChanges?.problem) {
      setError(withChanges.problem);
      return;
    }
    if ((noteRequired(action) || withChanges) && !note.trim()) {
      setError(withChanges ? "adjust.reasonNeeded" : "detail.reasonRequired");
      return;
    }
    setBusy(action);
    setError("");
    try {
      const fullNote = withChanges ? `${note.trim()}\n\n${withChanges.summary}` : note;
      await performAction(kind, id, title, profile, action, fullNote, withChanges?.changes);
      setNote("");
      toast.success(t(`did.${action}`));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="no-print border-amber/60 ring-2 ring-amber/30">
      <CardHeader>
        <CardTitle className="font-display text-2xl">{t("detail.yourTurn")}</CardTitle>
        <CardDescription>{t(`status.${status}`)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {children}
        <Field label={t("detail.reason")} htmlFor="note" error={error}>
          <Textarea
            id="note"
            rows={3}
            placeholder={t("detail.notePh")}
            value={note}
            aria-invalid={!!error}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError("");
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const Icon = ICON[a];
            return (
              <Button
                key={a}
                disabled={!!busy}
                onClick={() => run(a)}
                variant={noteRequired(a) ? "outline" : a === "approve" ? "default" : "accent"}
                className={noteRequired(a) ? "border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive" : ""}
              >
                <Icon />
                {busy === a ? t("saving") : t(`action.${a}`)}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
