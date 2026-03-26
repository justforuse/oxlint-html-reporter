import fs from 'fs/promises'
import { execSync } from 'child_process'
import { generateHTML } from './template.js'
import type { OxlintResult } from './types.js'

function getGitBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return null
  }
}

async function buildSourceMap(
  messages: OxlintResult
): Promise<Map<string, string[]>> {
  const sourceMap = new Map<string, string[]>()
  const filenames = new Set(messages.map((m) => m.filename))
  await Promise.all(
    Array.from(filenames).map(async (filename) => {
      try {
        const content = await fs.readFile(filename, 'utf-8')
        sourceMap.set(filename, content.split('\n'))
      } catch {
        // Source file not accessible, skip
      }
    })
  )
  return sourceMap
}

export async function generateReport(inputFile: string, outputFile: string) {
  try {
    const jsonContent = await fs.readFile(inputFile, 'utf-8')
    const messages = JSON.parse(jsonContent).diagnostics as OxlintResult
    const branch = getGitBranch()
    const sourceMap = await buildSourceMap(messages)

    const html = generateHTML(messages, { branch, sourceMap })
    await fs.writeFile(outputFile, html, 'utf-8')

    return {
      success: true,
      totalIssues: messages.length,
      errors: messages.filter((m) => m.severity === 'error').length,
      warnings: messages.filter((m) => m.severity === 'warning').length,
    }
  } catch (error) {
    throw new Error(`Failed to generate report: ${(error as Error).message}`)
  }
}
