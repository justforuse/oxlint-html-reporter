export interface LabelSpan {
  offset: number;
  length: number;
  line: number;
  column: number;
}

export interface Label {
  span: LabelSpan;
  label?: string;
}

export interface OxlintMessage {
  message: string;
  code: string;
  severity: 'error' | 'warning';
  causes: any[];
  url?: string;
  help?: string;
  filename: string;
  labels: Label[];
  related: any[];
}

export type OxlintResult = OxlintMessage[];
