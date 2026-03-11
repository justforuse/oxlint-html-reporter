import type { OxlintResult } from './types.js'

function groupByRule(messages: OxlintResult): Map<string, OxlintResult> {
  const groups = new Map<string, OxlintResult>()
  for (const msg of messages) {
    const existing = groups.get(msg.code) ?? []
    existing.push(msg)
    groups.set(msg.code, existing)
  }
  return groups
}

export const generateHTML = (messages: OxlintResult) => {
  const severityColors = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
  }

  const byRule = groupByRule(messages)
  const severityOrder = { error: 0, warning: 1 } as const
  const sortedEntries = Array.from(byRule.entries()).sort(
    ([, msgsA], [, msgsB]) => {
      const severityDiff =
        severityOrder[msgsA[0].severity] - severityOrder[msgsB[0].severity]
      return severityDiff !== 0 ? severityDiff : msgsB.length - msgsA.length
    }
  )

  const ruleSections = sortedEntries
    .map(([code, ruleMessages]) => {
      const first = ruleMessages[0]
      const severity = first.severity
      const violationItems = ruleMessages
        .map((msg) => {
          const location = msg.labels?.[0]?.span
          const locationText = location
            ? `:${location.line}:${location.column}`
            : ''
          return `
      <li class="py-2 px-3 rounded odd:bg-gray-50/80 border-b border-gray-100 last:border-0">
        <p class="text-gray-700 break-words">${msg.message}</p>
        <div class="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
          <span class="font-medium break-all">${
            msg.filename
          }<span class="text-blue-600 font-mono">${locationText}</span></span>
        </div>
        ${
          msg.help
            ? `<p class="text-gray-600 text-sm mt-1 break-words">${msg.help}</p>`
            : ''
        }
      </li>
    `
        })
        .join('')

      return `
    <details class="mb-6 bg-white rounded-lg shadow-md overflow-hidden group/details">
      <summary class="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-200 bg-gray-50/50 cursor-pointer list-none hover:bg-gray-50/80">
        <span class="font-mono text-sm ${
          severityColors[severity]
        } font-semibold break-all pr-2 select-text">${code}</span>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-sm text-gray-500">${ruleMessages.length} violation${
        ruleMessages.length === 1 ? '' : 's'
      }</span>
          <span class="px-2 py-1 text-sm rounded ${
            severity === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }">${severity}</span>
          ${
            first.url
              ? `<a href="${first.url}" target="_blank" class="text-blue-500 hover:text-blue-600 text-sm" onclick="event.stopPropagation()">Documentation</a>`
              : ''
          }
          <span class="inline-block w-5 h-5 text-gray-400 transition-transform group-open/details:rotate-180" aria-hidden="true">▼</span>
        </div>
      </summary>
      <ul class="divide-y divide-gray-100">
        ${violationItems}
      </ul>
    </details>
  `
    })
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oxlint Report</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style>
      details summary::-webkit-details-marker { display: none; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen p-4 sm:p-8">
    <div class="max-w-4xl mx-auto">
        <div class="mb-6 sm:mb-8">
            <div class="flex flex-col sm:flex-row items-center gap-4">
                <img
                    src="https://cdn.jsdelivr.net/gh/oxc-project/oxc-assets/icon-flat-dark.svg"
                    alt="Oxlint Logo"
                    class="w-12 h-12"
                />
                <div class="text-center sm:text-left flex-1">
                    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Oxlint Report</h1>
                    <p class="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Generated on ${new Date().toLocaleString()}</p>
                </div>
                <a href="https://github.com/justforuse/oxlint-html-reporter" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-gray-700 transition-colors" title="View on GitHub">
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                </a>
            </div>
        </div>

        <div class="mb-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="bg-white p-4 rounded-lg shadow-md">
                    <h2 class="text-lg font-semibold text-gray-700">Total Issues</h2>
                    <p class="text-2xl font-bold mt-1">${messages.length}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-md">
                    <h2 class="text-lg font-semibold text-gray-700">Errors</h2>
                    <p class="text-2xl font-bold mt-1 text-red-600">
                        ${messages.filter((m) => m.severity === 'error').length}
                    </p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-md">
                    <h2 class="text-lg font-semibold text-gray-700">Warnings</h2>
                    <p class="text-2xl font-bold mt-1 text-yellow-600">
                        ${
                          messages.filter((m) => m.severity === 'warning')
                            .length
                        }
                    </p>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            ${ruleSections}
        </div>
    </div>
</body>
</html>
  `
}
