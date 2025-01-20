export interface OxlintMessage {
  message: string;
  code: string;
  severity: 'error' | 'warning';
  causes: any[];
  url?: string;
  help?: string;
  filename: string;
  labels: any[];
  related: any[];
}

export type OxlintResult = OxlintMessage[];
