export type AppMode = "crop" | "background" | "quality" | "sheet" | "export";

export const APP_MODES: { id: AppMode; label: string }[] = [
  { id: "crop", label: "Cadrer" },
  { id: "background", label: "Fond" },
  { id: "quality", label: "Qualite" },
  { id: "sheet", label: "Planche" },
  { id: "export", label: "Export" },
];

export function getAppModeLabel(mode: AppMode): string {
  return APP_MODES.find((appMode) => appMode.id === mode)?.label ?? mode;
}
