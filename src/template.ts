import type { OxlintResult } from './types.js';

export const generateHTML = (messages: OxlintResult) => {
  const severityColors = {
    error: 'text-red-600',
    warning: 'text-yellow-600'
  };

  const messageElements = messages.map(msg => `
    <div class="mb-6 p-4 bg-white rounded-lg shadow-md">
      <div class="flex items-center justify-between mb-2">
        <span class="font-mono text-sm ${severityColors[msg.severity]} font-semibold">${msg.code}</span>
        <span class="px-2 py-1 text-sm rounded ${
          msg.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }">${msg.severity}</span>
      </div>
      <p class="text-gray-700 mb-2">${msg.message}</p>
      ${msg.help ? `<p class="text-gray-600 text-sm mb-2">${msg.help}</p>` : ''}
      <div class="flex items-center text-sm text-gray-500">
        <span class="font-medium">${msg.filename}</span>
        ${msg.url ? `
          <span class="mx-2">•</span>
          <a href="${msg.url}" target="_blank" class="text-blue-500 hover:text-blue-600">Documentation</a>
        ` : ''}
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oxlint Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <div class="mb-8">
            <div class="flex items-center gap-4">
                <img
                    src="https://cdn.jsdelivr.net/gh/oxc-project/oxc-assets/round.svg"
                    alt="Oxlint Logo"
                    class="w-12 h-12"
                />
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Oxlint Report</h1>
                    <p class="text-gray-600 mt-2">Generated on ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>

        <div class="mb-6">
            <div class="flex gap-4">
                <div class="bg-white p-4 rounded-lg shadow-md flex-1">
                    <h2 class="text-lg font-semibold text-gray-700">Total Issues</h2>
                    <p class="text-2xl font-bold mt-1">${messages.length}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-md flex-1">
                    <h2 class="text-lg font-semibold text-gray-700">Errors</h2>
                    <p class="text-2xl font-bold mt-1 text-red-600">
                        ${messages.filter(m => m.severity === 'error').length}
                    </p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-md flex-1">
                    <h2 class="text-lg font-semibold text-gray-700">Warnings</h2>
                    <p class="text-2xl font-bold mt-1 text-yellow-600">
                        ${messages.filter(m => m.severity === 'warning').length}
                    </p>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            ${messageElements}
        </div>
    </div>
</body>
</html>
  `;
};
