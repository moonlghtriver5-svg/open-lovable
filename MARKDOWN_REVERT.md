# Markdown Rendering - Easy Revert Guide

## Quick Disable (if issues occur)

If you experience any issues with markdown rendering in chat messages, you can quickly disable it:

### Method 1: Config Toggle (Recommended)
1. Open `/config/markdown.config.ts`
2. Change `enabled: true` to `enabled: false`
3. Save the file - the change will take effect immediately

### Method 2: Component-level Fallback
You can force fallback mode by passing `fallback={true}` to any MarkdownRenderer component.

## Complete Removal (if needed)

If you want to completely remove markdown rendering:

1. **Revert the chat message change:**
   In `/app/generation/page.tsx`, change:
   ```tsx
   <MarkdownRenderer content={msg.content} className="text-body-input" />
   ```
   Back to:
   ```tsx
   <span className="text-body-input">{msg.content}</span>
   ```

2. **Remove the import:**
   Delete this line from `/app/generation/page.tsx`:
   ```tsx
   import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
   ```

3. **Uninstall packages (optional):**
   ```bash
   npm uninstall remark remark-html remark-gfm remark-breaks react-markdown rehype-highlight rehype-raw
   ```

4. **Delete files (optional):**
   - `/components/chat/MarkdownRenderer.tsx`
   - `/config/markdown.config.ts`
   - This file (`MARKDOWN_REVERT.md`)

## Features Added

The MarkdownRenderer supports:
- **Bold** and *italic* text
- `inline code` with styling
- Code blocks with syntax highlighting
- Lists (bullet and numbered)
- Links (opens in new tab)
- Blockquotes
- Headers
- Automatic error fallback to plain text
- Server-side rendering safety