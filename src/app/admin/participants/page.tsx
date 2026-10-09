import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { listParticipants } from "@/data/participants";
import { ParticipantDialog } from "./_components/participant-dialog";
import { ParticipantsList } from "./_components/participants-list";

export const metadata: Metadata = { title: "Participantes" };

export default async function ParticipantsPage() {
  const { rows } = await listParticipants();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Participantes</h1>
          <p className="text-muted-foreground">{rows.length} pessoa{rows.length === 1 ? "" : "s"} cadastrada{rows.length === 1 ? "" : "s"}.</p>
        </div>
        <ParticipantDialog
          trigger={<button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground"><UserPlus className="size-4" aria-hidden /> Convidar participante</button>}
        />
      </div>
      <ParticipantsList
        rows={rows.map((r) => ({ id: r.id, name: r.name, email: r.email, createdAt: r.createdAt.toISOString(), lastSeenAt: r.lastSeenAt?.toISOString() ?? null, percent: r.percent, status: r.status }))}
      />
    </div>
  );
}
