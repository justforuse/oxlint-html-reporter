#!/usr/bin/env node

import { Command } from 'commander'
import { generateReport } from '../dist/index.js'
import fs from 'fs/promises'
import { stdin } from 'process'
import { execSync } from 'child_process'

const program = new Command()

async function getStdinData(timeoutMs = 100) {
  return new Promise((resolve) => {
    const chunks = []
    let hasData = false

    function cleanup() {
      stdin.removeAllListeners('data')
      stdin.removeAllListeners('end')
      stdin.pause()
      if (stdin.unref) stdin.unref()
    }

    const timeout = setTimeout(() => {
      if (!hasData) {
        cleanup()
        resolve(null)
      }
    }, timeoutMs)

    stdin.on('data', (chunk) => {
      hasData = true
      clearTimeout(timeout)
      chunks.push(chunk)
    })

    stdin.on('end', () => {
      clearTimeout(timeout)
      cleanup()
      if (chunks.length > 0) {
        resolve(Buffer.concat(chunks).toString('utf8'))
      } else {
        resolve(null)
      }
    })

    stdin.resume()
  })
}

function getOxlintVersion() {
  try {
    return execSync('npx oxlint --version', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
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
      console.log('🔍 Starting report generation...')
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
      } else {
        // Try to read from stdin first, fallback to running oxlint
        const stdinData = await getStdinData()

        if (stdinData) {
          inputFile = 'oxlint-temp.json'
          await fs.writeFile(inputFile, stdinData)
          shouldCleanup = true
        } else {
          // Run oxlint directly
          const version = getOxlintVersion()
          console.log(`🔍 No input detected, running oxlint (${version})...`)
          const jsonData = runOxlint()
          inputFile = 'oxlint-temp.json'
          await fs.writeFile(inputFile, jsonData)
          shouldCleanup = true
        }
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
