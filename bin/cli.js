#!/usr/bin/env node

import { Command } from 'commander'
import { generateReport } from '../dist/index.js'
import fs from 'fs/promises'
import { stdin } from 'process'
import { execSync } from 'child_process'

const program = new Command()

function hasStdinData() {
  return !stdin.isTTY
}

async function getStdinData() {
  const chunks = []
  for await (const chunk of stdin) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function runOxlint() {
  try {
    return execSync('npx oxlint --format=json', { encoding: 'utf8' })
  } catch (error) {
    if (error.stdout) {
      return error.stdout
    }
    throw new Error('Failed to run oxlint. Make sure oxlint is installed.')
  }
}

program
  .name('oxlint-html')
  .description('Generate HTML report from oxlint JSON output')
  .version('1.0.0')
  .argument(
    '[input]',
    'Input JSON file (if not provided, will run oxlint automatically)'
  )
  .argument('[output]', 'Output HTML file', 'oxlint-report.html')
  .action(async (input, output) => {
    try {
      const startTime = performance.now()

      let inputFile = input
      let shouldCleanup = false

      if (inputFile) {
        // Use specified input file
        try {
          await fs.access(inputFile)
        } catch {
          throw new Error(`Input file not found: ${inputFile}`)
        }
      } else if (hasStdinData()) {
        // Read from stdin
        const jsonData = await getStdinData()
        inputFile = 'oxlint-temp.json'
        await fs.writeFile(inputFile, jsonData)
        shouldCleanup = true
      } else {
        // Run oxlint directly
        console.log('🔍 No input detected, running oxlint...')
        const jsonData = runOxlint()
        inputFile = 'oxlint-temp.json'
        await fs.writeFile(inputFile, jsonData)
        shouldCleanup = true
      }

      const result = await generateReport(inputFile, output)

      if (shouldCleanup) {
        await fs.unlink(inputFile)
      }

      const elapsed = (performance.now() - startTime) / 1000
      console.log(`✨ Report generated successfully at ${output}`)
      console.log(`📊 Summary:`)
      console.log(`   Total Issues: ${result.totalIssues}`)
      console.log(`   Errors: ${result.errors}`)
      console.log(`   Warnings: ${result.warnings}`)
      console.log(`   Time: ${elapsed.toFixed(3)}s`)
    } catch (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }
  })

program.parse()
