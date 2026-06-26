import type { OrderStage, ShipmentStage } from "@/types/domain";

export function badgeColor(stage: string): string {
  if (stage === "created") return "bg-[#4B98CF]/10 text-[#4B98CF]";
  if (stage === "en_preparacion") return "bg-[#E3AA75]/10 text-[#E3AA75]";
  if (stage === "en_reparto") return "bg-purple-50 text-purple-600";
  if (stage === "entregado") return "bg-green-50 text-green-600";
  if (stage === "cancelado") return "bg-red-50 text-red-500";
  return "bg-muted text-muted-foreground";
}

export function stageLabel(stage: string): string {
  if (stage === "created") return "Pendiente";
  if (stage === "en_preparacion") return "Preparacion";
  if (stage === "en_reparto") return "En reparto";
  if (stage === "entregado") return "Entregado";
  if (stage === "cancelado") return "Cancelado";
  return stage;
}

export function shipmentStepIndex(stage: string): number {
  const s = stage.toLowerCase();
  if (s === "entregado") return 2;
  if (s === "en_reparto") return 1;
  if (s === "cancelado") return -1;
  return 0;
}

export const STEP_LABELS = ["Preparacion", "En reparto", "Entregado"] as const;

export const ORDER_STAGES = ["created", "en_preparacion", "en_reparto", "entregado"] as const;
export const ORDER_STAGE_LABELS = ["Recibido", "Preparacion", "En reparto", "Entregado"] as const;

export function orderStageIndex(stage: OrderStage): number {
  return ORDER_STAGES.indexOf(stage);
}

export function stageColorDot(index: number, currentIndex: number): string {
  if (index < currentIndex) return "bg-[#4EB4A5]";
  if (index === currentIndex) return "bg-[#4B98CF]";
  return "bg-[#ECEEF0]";
}

export function stageConnectorColor(index: number, currentIndex: number): string {
  return index < currentIndex ? "bg-[#4EB4A5]" : "bg-[#ECEEF0]";
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  if (hrs < 24) return `Hace ${hrs}h`;
  if (days === 1) return "Ayer";
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}
