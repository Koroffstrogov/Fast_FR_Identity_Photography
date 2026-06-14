import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
  BackgroundMaskData,
} from "../core/photo-project";
import { Rmbg2ModelConfig } from "./rmbg2-config";

export type BackgroundRemovalResult = {
  mask: BackgroundMaskData;
  diagnostics: BackgroundTechnicalDiagnostics;
  messages: string[];
};

export interface BackgroundRemovalRunner {
  load(
    backendPreference: BackgroundRemovalBackendPreference,
    config?: Rmbg2ModelConfig,
  ): Promise<BackgroundTechnicalDiagnostics>;
  removeBackground(
    image: HTMLImageElement,
    backendPreference: BackgroundRemovalBackendPreference,
    config?: Rmbg2ModelConfig,
  ): Promise<BackgroundRemovalResult>;
  dispose?(): Promise<void>;
}
