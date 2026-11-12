"use client";

import { CheckCircle2, Forward, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
 * Review buttons for the current user's role, all in plain sight: a note box,
 * a big "yes" button and a "send back" button (which needs a reason).
 */
export function ActionPanel({
  kind, id, title, status, children,
}: {
  kind: DocKind; id: string; title: string; status: Status; children?: React.ReactNode;
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
    if (noteRequired(action) && !note.trim()) {
      setError("detail.reasonRequired");
      return;
    }
    setBusy(action);
    setError("");
    try {
      await performAction(kind, id, title, profile, action, note);
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
      <CardContent className="grid gap-3">
        <p className="font-display text-2xl font-semibold">{t("detail.yourTurn")}</p>
        {children}
        <Field label={t("act.noteLabel")} htmlFor="note" error={error}>
          <Textarea id="note" rows={2} placeholder={t("detail.notePh")} value={note} aria-invalid={!!error}
            onChange={(e) => { setNote(e.target.value); if (error) setError(""); }} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((a) => {
            const Icon = ICON[a];
            const back = noteRequired(a);
            return (
              <Button key={a} disabled={!!busy} onClick={() => run(a)} variant={back ? "outline" : "accent"}
                className={back
                  ? "h-14 w-full border-2 border-destructive/50 text-lg text-destructive hover:bg-destructive/5 hover:text-destructive"
                  : "h-14 w-full text-lg"}>
                <Icon className="size-5" /> {busy === a ? t("saving") : t(`action.${a}`)}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
