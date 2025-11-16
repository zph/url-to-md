# url-to-md

A Deno CLI tool that converts any webpage to clean Markdown format using Playwright and Mozilla Readability.

## Features

- Uses Playwright to render JavaScript-heavy websites
- Extracts main article content using Mozilla Readability
- Converts HTML to clean Markdown format
- Preserves article metadata (title, byline, excerpt)
- Outputs to file or stdout

## Prerequisites

- Deno 2.0 or later

## Installation

### Deno install technique

```
deno install -A --global -n url-to-md https://raw.githubusercontent.com/zph/url-to-md/refs/heads/main/url-to-md.ts
```

### Install Playwright browsers first

Before using the tool, install the required browser:

```bash
npx playwright install chromium
```

### Make executable

```bash
chmod +x url-to-md.ts
```

### Install globally

```bash
deno install -A -n url-to-md url-to-md.ts
```

After installation, you can use `url-to-md` from anywhere.

### Or run directly

```bash
# With shebang (after chmod +x)
./url-to-md.ts <url>

# Or with deno command
deno run -A url-to-md.ts <url>
```

## Usage

### Basic usage (output to stdout)

```bash
url-to-md https://example.com
```

### Save to file

```bash
url-to-md https://example.com -o article.md
```

### Using directly

```bash
./url-to-md.ts https://example.com -o article.md
```

## Command Line Options

- `-o, --output <file>` - Output file (default: stdout)
- `-h, --help` - Show help message

## How it works

1. Launches a headless Chromium browser using Playwright
2. Navigates to the specified URL and waits for the page to fully load
3. Extracts the rendered HTML content
4. Uses Mozilla Readability to extract the main article content
5. Converts the HTML to Markdown using Turndown
6. Adds metadata (title, byline, excerpt, source URL)
7. Outputs the result

## Permissions

The tool uses `-A` (all permissions) which includes:

- `--allow-net` - To fetch webpages
- `--allow-write` - To write output files
- `--allow-read` - To read configuration
- `--allow-env` - For Playwright to access environment variables
- `--allow-run` - For Playwright to launch the browser
- `--allow-ffi` - For Playwright's native bindings
- `--allow-sys` - For Playwright to detect system information

## Examples

Convert a blog post to Markdown:

```bash
url-to-md https://blog.example.com/my-post -o post.md
```

Convert a news article:

```bash
url-to-md https://news.example.com/article/123 -o article.md
```

Pipe output to another tool:

```bash
url-to-md https://example.com | grep "keyword"
```

## License

MIT
