import fs from 'fs/promises';
import { generateHTML } from './template.js';
import type { OxlintResult } from './types.js';

export async function generateReport(inputFile: string, outputFile: string) {
  try {
    const jsonContent = await fs.readFile(inputFile, 'utf-8');
    const messages = JSON.parse(jsonContent) as OxlintResult;

    const html = generateHTML(messages);
    await fs.writeFile(outputFile, html, 'utf-8');

    return {
      success: true,
      totalIssues: messages.length,
      errors: messages.filter(m => m.severity === 'error').length,
      warnings: messages.filter(m => m.severity === 'warning').length
    };
  } catch (error) {
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}
