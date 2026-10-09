"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDelete({ title, description, onConfirm, trigger, confirmLabel = "Excluir", tone = "danger" }: {
  title: string; description: string; onConfirm: () => Promise<void>; trigger: React.ReactNode; confirmLabel?: string; tone?: "danger" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={tone === "danger" ? "min-h-11 bg-destructive text-white hover:bg-destructive/90" : "min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                await onConfirm();
                setOpen(false);
              });
            }}
          >
            {pending ? "Aguarde…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
