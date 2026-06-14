import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
  BackgroundMaskData,
} from "../core/photo-project";

export type BackgroundRemovalResult = {
  mask: BackgroundMaskData;
  diagnostics: BackgroundTechnicalDiagnostics;
  messages: string[];
};

export interface BackgroundRemovalRunner {
  load(
    backendPreference: BackgroundRemovalBackendPreference,
  ): Promise<BackgroundTechnicalDiagnostics>;
  removeBackground(
    image: HTMLImageElement,
    backendPreference: BackgroundRemovalBackendPreference,
  ): Promise<BackgroundRemovalResult>;
  dispose?(): Promise<void>;
}
