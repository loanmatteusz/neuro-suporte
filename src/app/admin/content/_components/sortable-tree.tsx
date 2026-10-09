"use client";

import { useState, useTransition } from "react";
import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor,
  useDroppable, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reorderItems, reorderModules } from "@/app/admin/content/reorder-actions";
import { ItemRow, ModuleCard, type TreeModule } from "./content-tree";

const M = (id: string) => `module:${id}`;
const I = (id: string) => `item:${id}`;
const C = (id: string) => `container:${id}`;
const raw = (id: string | number) => String(id).split(":")[1];
const kind = (id: string | number) => String(id).split(":")[0] as "module" | "item" | "container";

function Handle({ label, listeners, attributes }: { label: string; listeners?: object; attributes?: object }) {
  return (
    <button type="button" aria-label={label} className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing" {...attributes} {...listeners}>
      <GripVertical className="size-5" />
    </button>
  );
}

function SortableItem({ item }: { item: TreeModule["items"][number] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: I(item.id) });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "opacity-40" : undefined}>
      <ItemRow item={item} handle={<Handle label={`Mover ${item.title}`} listeners={listeners} attributes={attributes} />} />
    </li>
  );
}

function ItemsContainer({ m }: { m: TreeModule }) {
  const { setNodeRef } = useDroppable({ id: C(m.id) });
  return (
    <SortableContext items={m.items.map((i) => I(i.id))} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} className="min-h-12 space-y-2 rounded-xl">
        {m.items.length === 0 && <li className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Solte um conteúdo aqui</li>}
        {m.items.map((it) => <SortableItem key={it.id} item={it} />)}
      </ol>
    </SortableContext>
  );
}

function SortableModule({ m, index }: { m: TreeModule; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: M(m.id) });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "opacity-40" : undefined}>
      <ModuleCard m={m} index={index} handle={<Handle label={`Mover módulo ${m.title}`} listeners={listeners} attributes={attributes} />}>
        <ItemsContainer m={m} />
      </ModuleCard>
    </li>
  );
}

export function SortableTree({ modules: initial }: { modules: TreeModule[] }) {
  const [modules, setModules] = useState(initial);
  const [snapshot, setSnapshot] = useState<TreeModule[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, start] = useTransition();
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setModules(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findModuleOfItem = (itemId: string, list = modules) => list.find((m) => m.items.some((i) => i.id === itemId));

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setSnapshot(modules);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || kind(active.id) !== "item") return;
    const itemId = raw(active.id);
    const from = findModuleOfItem(itemId);
    const to = kind(over.id) === "item" ? findModuleOfItem(raw(over.id)) : kind(over.id) === "container" ? modules.find((m) => m.id === raw(over.id)) : undefined;
    if (!from || !to || from.id === to.id) return;
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === from.id) return { ...m, items: m.items.filter((i) => i.id !== itemId) };
        if (m.id === to.id) {
          const moving = from.items.find((i) => i.id === itemId)!;
          const overIndex = kind(over.id) === "item" ? m.items.findIndex((i) => i.id === raw(over.id)) : m.items.length;
          const items = [...m.items];
          items.splice(overIndex < 0 ? items.length : overIndex, 0, moving);
          return { ...m, items };
        }
        return m;
      }),
    );
  }

  function persist(save: () => Promise<{ ok: boolean; error?: string }>, rollback: TreeModule[]) {
    start(async () => {
      const r = await save();
      if (!r.ok) {
        setModules(rollback);
        toast.error(r.error ?? "Não conseguimos salvar a nova ordem.");
      } else {
        toast.success("Ordem salva.");
      }
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    const before = snapshot ?? modules;
    setSnapshot(null);
    if (!over) return setModules(before);

    if (kind(active.id) === "module") {
      if (kind(over.id) !== "module" || active.id === over.id) return;
      const oldIndex = modules.findIndex((m) => m.id === raw(active.id));
      const newIndex = modules.findIndex((m) => m.id === raw(over.id));
      const next = arrayMove(modules, oldIndex, newIndex);
      setModules(next);
      persist(() => reorderModules(next.map((m) => m.id)), before);
      return;
    }

    const itemId = raw(active.id);
    const target = findModuleOfItem(itemId);
    if (!target) return setModules(before);
    let items = target.items;
    if (kind(over.id) === "item") {
      const oldIndex = items.findIndex((i) => i.id === itemId);
      const newIndex = items.findIndex((i) => i.id === raw(over.id));
      if (newIndex >= 0 && oldIndex !== newIndex) items = arrayMove(items, oldIndex, newIndex);
    }
    const next = modules.map((m) => (m.id === target.id ? { ...m, items } : m));
    setModules(next);

    const source = findModuleOfItem(itemId, before)!;
    const changes = [{ moduleId: target.id, orderedItemIds: items.map((i) => i.id) }];
    if (source.id !== target.id) {
      changes.unshift({ moduleId: source.id, orderedItemIds: next.find((m) => m.id === source.id)!.items.map((i) => i.id) });
    } else if (items.map((i) => i.id).join() === source.items.map((i) => i.id).join()) {
      return; // nada mudou
    }
    persist(() => reorderItems(changes), before);
  }

  const activeItem = activeId && kind(activeId) === "item" ? modules.flatMap((m) => m.items).find((i) => i.id === raw(activeId)) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        if (snapshot) setModules(snapshot);
        setActiveId(null);
      }}
      accessibility={{
        screenReaderInstructions: { draggable: "Para mover, pressione espaço. Use as setas para escolher o lugar e espaço de novo para soltar. Esc cancela." },
        announcements: {
          onDragStart: () => "Item pego.",
          onDragOver: () => "Movendo.",
          onDragEnd: () => "Item solto.",
          onDragCancel: () => "Movimento cancelado.",
        },
      }}
    >
      <SortableContext items={modules.map((m) => M(m.id))} strategy={verticalListSortingStrategy}>
        <ol className="space-y-4">
          {modules.map((m, i) => <SortableModule key={m.id} m={m} index={i} />)}
        </ol>
      </SortableContext>
      <DragOverlay>{activeItem ? <ItemRow item={activeItem} /> : null}</DragOverlay>
    </DndContext>
  );
}
