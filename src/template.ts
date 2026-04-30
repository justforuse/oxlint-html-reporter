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

interface ReportMeta {
  branch?: string | null
  sourceMap?: Map<string, string[]>
}

const CONTEXT_LINES = 5

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getCodeSnippet(
  sourceMap: Map<string, string[]> | undefined,
  filename: string,
  line: number
): string {
  if (!sourceMap) return ''
  const lines = sourceMap.get(filename)
  if (!lines) return ''

  const start = Math.max(0, line - 1 - CONTEXT_LINES)
  const end = Math.min(lines.length, line + CONTEXT_LINES)

  const snippet = lines.slice(start, end).map((content, i) => {
    const lineNum = start + i + 1
    const isTarget = lineNum === line
    const escaped = escapeHtml(content)
    return `<span class="inline-block w-full ${isTarget ? 'bg-red-100/60' : ''}">`
      + `<span class="inline-block w-10 text-right pr-3 text-gray-400 select-none">${lineNum}</span>`
      + `${escaped}</span>`
  }).join('\n')

  return `<pre class="mt-2 text-xs leading-5 font-mono bg-gray-50 rounded border border-gray-200 overflow-x-auto p-2">${snippet}</pre>`
}

export const generateHTML = (messages: OxlintResult, meta: ReportMeta = {}) => {
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

  const TOP_N = 5
  const topErrors = sortedEntries
    .filter(([, msgs]) => msgs[0].severity === 'error')
    .slice(0, TOP_N)
  const topWarnings = sortedEntries
    .filter(([, msgs]) => msgs[0].severity === 'warning')
    .slice(0, TOP_N)

  function buildTopTable(
    title: string,
    titleColor: string,
    entries: typeof topErrors
  ) {
    if (entries.length === 0) return ''
    const rows = entries
      .map(
        ([code, msgs]) => {
          const ruleCell = msgs[0].url
            ? `<a href="${msgs[0].url}" target="_blank" class="hover:underline">${code}</a>`
            : code
          return `
          <tr class="border-b border-gray-100 last:border-0">
            <td class="py-2 px-3 font-mono text-sm text-blue-600 break-all">${ruleCell}</td>
            <td class="py-2 px-3 text-right text-sm font-semibold text-gray-700 tabular-nums">${msgs.length}</td>
          </tr>`
        }
      )
      .join('')
    return `
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-semibold ${titleColor} mb-2">${title}</h3>
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rule</th>
              <th class="py-2 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  const topErrorsHtml = buildTopTable('Top Errors', 'text-red-600', topErrors)
  const topWarningsHtml = buildTopTable(
    'Top Warnings',
    'text-yellow-600',
    topWarnings
  )

  const hasTops = topErrors.length > 0 || topWarnings.length > 0
  const topSummaryHtml = hasTops
    ? `<div class="mb-6 bg-white rounded-lg shadow-md p-4">
        <div class="flex flex-col sm:flex-row gap-6">
          ${topErrorsHtml}
          ${topWarningsHtml}
        </div>
      </div>`
    : ''

  const ruleSections = sortedEntries
    .map(([code, ruleMessages]) => {
      const first = ruleMessages[0]
      const severity = first.severity

      const allSameMessage = ruleMessages.every(
        (msg) => msg.message === first.message
      )
      const allSameHelp = ruleMessages.every(
        (msg) => msg.help === first.help
      )

      const violationItems = ruleMessages
        .map((msg) => {
          const location = msg.labels?.[0]?.span
          const locationText = location
            ? `:${location.line}:${location.column}`
            : ''
          const messageHtml = allSameMessage
            ? ''
            : `<p class="text-gray-700 break-words">${msg.message}</p>`
          const helpHtml =
            !allSameHelp && msg.help
              ? `<p class="text-gray-600 text-sm mt-1 break-words">${msg.help}</p>`
              : ''
          const snippetHtml = location
            ? getCodeSnippet(meta.sourceMap, msg.filename, location.line)
            : ''
          return `
      <li class="py-2 px-3 rounded odd:bg-gray-50/80 border-b border-gray-100 last:border-0">
        ${messageHtml}
        <div class="flex flex-wrap items-center gap-2 ${allSameMessage ? '' : 'mt-1 '}text-sm text-gray-500">
          <span class="font-medium break-all">${
            msg.filename
          }<span class="text-blue-600 font-mono">${locationText}</span></span>
        </div>
        ${helpHtml}
        ${snippetHtml}
      </li>
    `
        })
        .join('')

      const sharedMessageHtml = allSameMessage
        ? `<div class="px-4 py-3 border-b border-gray-100 bg-gray-50/30">
            <p class="text-gray-700 break-words">${first.message}</p>
            ${allSameHelp && first.help ? `<p class="text-gray-600 text-sm mt-1 break-words">${first.help}</p>` : ''}
          </div>`
        : ''

      return `
    <details class="mb-6 bg-white rounded-lg shadow-md overflow-hidden group/details">
      <summary class="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-200 bg-gray-50/50 cursor-pointer list-none hover:bg-gray-50/80">
        ${
          first.url
            ? `<a href="${first.url}" target="_blank" class="font-mono text-sm ${severityColors[severity]} font-semibold break-all pr-2 select-text hover:underline" onclick="event.stopPropagation()">${code}</a>`
            : `<span class="font-mono text-sm ${severityColors[severity]} font-semibold break-all pr-2 select-text">${code}</span>`
        }
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-sm text-gray-500">${ruleMessages.length} violation${
        ruleMessages.length === 1 ? '' : 's'
      }</span>
          <span class="inline-block w-5 h-5 text-gray-400 transition-transform group-open/details:rotate-180" aria-hidden="true">▼</span>
        </div>
      </summary>
      ${sharedMessageHtml}
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
    <link rel="icon" type="image/svg+xml" href="https://cdn.jsdelivr.net/gh/oxc-project/oxc-assets/icon-flat-dark.svg">
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
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                        <span>Generated on ${new Date().toLocaleString()}</span>
                        ${meta.branch ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-mono"><svg class="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/></svg>${meta.branch}</span>` : ''}
                    </div>
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

        ${topSummaryHtml}

        <div class="space-y-4">
            ${ruleSections}
        </div>
    </div>
</body>
</html>
  `
}
