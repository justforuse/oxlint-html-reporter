#!/usr/bin/env node

import { Command } from 'commander';
import { generateReport } from '../dist/index.js';
import fs from 'fs/promises';
import { stdin } from 'process';

const program = new Command();

async function getStdinData() {
  const chunks = [];
  for await (const chunk of stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

program
  .name('oxlint-html')
  .description('Generate HTML report from oxlint JSON output')
  .version('1.0.0')
  .argument('[output]', 'Output HTML file', 'oxlint-report.html')
  .action(async (output) => {
    try {
      // Create a temporary file for the JSON input
      const tmpFile = 'oxlint-temp.json';
      
      // Read from stdin if no input file is provided
      const jsonData = await getStdinData();
      await fs.writeFile(tmpFile, jsonData);

      const result = await generateReport(tmpFile, output);
      console.log(`✨ Report generated successfully at ${output}`);
      console.log(`📊 Summary:`);
      console.log(`   Total Issues: ${result.totalIssues}`);
      console.log(`   Errors: ${result.errors}`);
      console.log(`   Warnings: ${result.warnings}`);

      // Clean up temporary file
      await fs.unlink(tmpFile);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();