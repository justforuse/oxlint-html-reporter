import { expect, test, describe } from 'vitest'
import { generateReport } from '../src/index'
import fs from 'fs/promises'

describe('oxlint-html-reporter', () => {
  test('generates report from valid input', async () => {
    // Create test input in oxlint JSON format
    const testInput = {
      diagnostics: [
        {
          message: "Identifier 'path' is imported but never used.",
          code: 'eslint(no-unused-vars)',
          severity: 'warning',
          causes: [],
          url: 'https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-unused-vars.html',
          help: 'Consider removing this import.',
          filename: 'test.js',
          labels: [
            {
              span: {
                offset: 38,
                length: 4,
                line: 2,
                column: 10,
              },
            },
          ],
          related: [],
        },
      ],
      number_of_files: 1,
      number_of_rules: 93,
      threads_count: 14,
      start_time: 0.023164833,
    }

    const inputFile = 'test-input.json'
    const outputFile = 'test-output.html'

    await fs.writeFile(inputFile, JSON.stringify(testInput))

    const result = await generateReport(inputFile, outputFile)

    expect(result.success).toBe(true)
    expect(result.totalIssues).toBe(1)
    expect(result.errors).toBe(0)
    expect(result.warnings).toBe(1)

    const outputContent = await fs.readFile(outputFile, 'utf-8')
    expect(outputContent).toContain('eslint(no-unused-vars)')
    expect(outputContent).toContain(
      "Identifier 'path' is imported but never used."
    )
    expect(outputContent).toContain('Consider removing this import.')

    // Cleanup
    await fs.unlink(inputFile)
    await fs.unlink(outputFile)
  })
})
