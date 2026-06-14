import {
  BackgroundRemovalBackendPreference,
  BackgroundTechnicalDiagnostics,
  BackgroundMaskData,
} from "../core/photo-project";
import { RmbgModelConfig } from "./rmbg-config";

export type BackgroundRemovalResult = {
  mask: BackgroundMaskData;
  diagnostics: BackgroundTechnicalDiagnostics;
  messages: string[];
};

export interface BackgroundRemovalRunner {
  load(
    backendPreference: BackgroundRemovalBackendPreference,
    config?: RmbgModelConfig,
  ): Promise<BackgroundTechnicalDiagnostics>;
  removeBackground(
    image: HTMLImageElement,
    backendPreference: BackgroundRemovalBackendPreference,
    config?: RmbgModelConfig,
  ): Promise<BackgroundRemovalResult>;
  dispose?(): Promise<void>;
}
