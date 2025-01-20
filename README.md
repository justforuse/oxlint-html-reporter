# oxlint-html-reporter

Generate beautiful HTML reports from oxlint output.

## Installation

```bash
npm install -g oxlint-html-reporter
```

## Usage

Pipe oxlint JSON output directly to oxlint-html:

```bash
npx oxlint -f=json | oxlint-html
```

This will create `oxlint-report.html` in the current directory. You can specify a different output file:

```bash
npx oxlint -f=json | oxlint-html custom-report.html
```

## Programmatic Usage

```javascript
import { generateReport } from 'oxlint-html-reporter';

await generateReport('input.json', 'output.html');
```

## Features

- Beautiful, modern UI using Tailwind CSS
- Summary statistics
- Detailed error and warning information
- File locations and code references
- Responsive design
- Zero dependencies for the HTML output

## License

MIT
