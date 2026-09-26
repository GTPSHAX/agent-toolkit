/**
 * @fileoverview Minimal HTML-to-Markdown conversion for documentation capture.
 *
 * Produces a Markdown rendering of a page so extracted documentation keeps
 * headings, links, lists, tables, and fenced code blocks.
 */

import {cleanSpaces, decodeEntities} from './web-core.js';

/** Tags whose subtree is dropped from the Markdown output. */
const SKIP_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'noscript',
  'svg',
  'head',
  'template',
  'iframe',
  'canvas',
  'form',
  'button',
  'select',
  'textarea',
  'option',
  'nav',
  'footer',
]);

/** Tags that never contain children. */
const VOID_TAGS: ReadonlySet<string> = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Heading tag names mapped to their Markdown level. */
const HEADINGS: Readonly<Record<string, number>> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

/** A decoded text run. */
interface TextNode {
  readonly type: 'text';
  readonly value: string;
}

/** An element with its raw attributes and parsed children. */
interface ElementNode {
  readonly type: 'element';
  readonly name: string;
  readonly attributes: string;
  readonly children: MarkdownNode[];
}

/** Any node of the parsed document tree. */
type MarkdownNode = TextNode | ElementNode;

/** An opening tag. */
interface OpenTag {
  readonly kind: 'open';
  readonly name: string;
  readonly attributes: string;
  readonly selfClosing: boolean;
}

/** A closing tag. */
interface CloseTag {
  readonly kind: 'close';
  readonly name: string;
}

/** Raw text between tags. */
interface RawText {
  readonly kind: 'text';
  readonly value: string;
}

/** A lexed HTML token. */
type Token = OpenTag | CloseTag | RawText;

/** Options accepted by {@link htmlToMarkdown}. */
export interface HtmlToMarkdownOptions {
  /** Base URL used to resolve relative links and images. */
  readonly baseUrl?: string;
}

/**
 * @brief Converts an HTML document into Markdown.
 *
 * @param html Raw HTML.
 * @param options Conversion options.
 * @return Markdown rendering of the document body.
 *
 * @see htmlToText
 */
export function htmlToMarkdown(
  html: string,
  options: HtmlToMarkdownOptions = {},
): string {
  const baseUrl = options.baseUrl;
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<![^>]*>/g, '')
    .replace(/\r\n?/g, '\n');
  const tree = buildTree(tokenize(cleaned));

  /**
   * @brief Reads a named attribute from a raw attribute string.
   *
   * @param attributes Raw attributes.
   * @param name Attribute name.
   * @return Decoded attribute value, or `undefined` when absent.
   */
  function attribute(attributes: string, name: string): string | undefined {
    const found = readHtmlAttribute(attributes, name);
    return found === undefined ? undefined : decodeEntities(found);
  }

  /**
   * @brief Resolves a URL against the conversion base URL.
   *
   * @param value Raw URL.
   * @return Absolute URL, or the input when it cannot be resolved.
   */
  function resolve(value: string): string {
    if (baseUrl === undefined) {
      return value;
    }
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return value;
    }
  }

  /**
   * @brief Collects the plain text of a subtree.
   *
   * @param node Node to read.
   * @return Concatenated text of the subtree.
   */
  function textOf(node: MarkdownNode): string {
    return node.type === 'text'
      ? node.value
      : node.children.map(textOf).join('');
  }

  /**
   * @brief Renders a node to Markdown.
   *
   * @param node Node to render.
   * @return Markdown fragment.
   */
  function renderNode(node: MarkdownNode): string {
    return node.type === 'text' ? node.value : renderElement(node);
  }

  /**
   * @brief Renders a list of nodes to Markdown.
   *
   * @param children Child nodes.
   * @return Markdown fragment.
   */
  function renderChildren(children: readonly MarkdownNode[]): string {
    return children.map(renderNode).join('');
  }

  /**
   * @brief Renders one element to Markdown.
   *
   * @param node Element node.
   * @return Markdown fragment.
   */
  function renderElement(node: ElementNode): string {
    const heading = HEADINGS[node.name];
    if (heading !== undefined) {
      const text = cleanSpaces(renderChildren(node.children));
      return text.length > 0 ? `\n\n${'#'.repeat(heading)} ${text}\n\n` : '';
    }
    switch (node.name) {
      case 'p': {
        const text = renderChildren(node.children).trim();
        return text.length > 0 ? `\n\n${text}\n\n` : '';
      }
      case 'br':
        return '  \n';
      case 'hr':
        return '\n\n---\n\n';
      case 'strong':
      case 'b': {
        const text = renderChildren(node.children).trim();
        return text.length > 0 ? `**${text}**` : '';
      }
      case 'em':
      case 'i': {
        const text = renderChildren(node.children).trim();
        return text.length > 0 ? `*${text}*` : '';
      }
      case 'del':
      case 's':
      case 'strike': {
        const text = renderChildren(node.children).trim();
        return text.length > 0 ? `~~${text}~~` : '';
      }
      case 'code': {
        const text = textOf(node).trim();
        return text.length > 0 ? `\`${text}\`` : '';
      }
      case 'pre': {
        const text = textOf(node).replace(/\n+$/, '');
        return text.length > 0 ? `\n\n\`\`\`\n${text}\n\`\`\`\n\n` : '';
      }
      case 'blockquote': {
        const text = renderChildren(node.children).trim();
        return text.length > 0
          ? `\n\n${text
              .split('\n')
              .map(line => (line.length > 0 ? `> ${line}` : '>'))
              .join('\n')}\n\n`
          : '';
      }
      case 'a': {
        const text = cleanSpaces(renderChildren(node.children));
        const href = attribute(node.attributes, 'href');
        if (href === undefined || href.length === 0 || href.startsWith('#')) {
          return text;
        }
        return `[${text.length > 0 ? text : href}](${resolve(href)})`;
      }
      case 'img': {
        const src = attribute(node.attributes, 'src');
        if (src === undefined || src.length === 0) {
          return '';
        }
        const alt = cleanSpaces(attribute(node.attributes, 'alt') ?? '');
        return `![${alt}](${resolve(src)})`;
      }
      case 'ul':
        return `\n\n${renderList(node, false, 0)}\n\n`;
      case 'ol':
        return `\n\n${renderList(node, true, 0)}\n\n`;
      case 'table': {
        const table = renderTable(node);
        return table.length > 0 ? `\n\n${table}\n\n` : '';
      }
      default:
        return renderChildren(node.children);
    }
  }

  /**
   * @brief Renders a `ul` or `ol` element to Markdown.
   *
   * @param list List element.
   * @param ordered Whether the list is ordered.
   * @param depth Nesting depth.
   * @return Markdown list lines.
   */
  function renderList(
    list: ElementNode,
    ordered: boolean,
    depth: number,
  ): string {
    const lines: string[] = [];
    let index = 1;
    for (const child of list.children) {
      if (child.type !== 'element' || child.name !== 'li') {
        continue;
      }
      const nested = child.children.filter(
        (grand): grand is ElementNode =>
          grand.type === 'element' &&
          (grand.name === 'ul' || grand.name === 'ol'),
      );
      const own = child.children.filter(
        grand =>
          !(
            grand.type === 'element' &&
            (grand.name === 'ul' || grand.name === 'ol')
          ),
      );
      const text = cleanSpaces(renderChildren(own));
      const marker = ordered ? `${index}.` : '-';
      lines.push(`${'  '.repeat(depth)}${marker} ${text}`.trimEnd());
      for (const sub of nested) {
        lines.push(renderList(sub, sub.name === 'ol', depth + 1).trimEnd());
      }
      index++;
    }
    return lines.join('\n');
  }

  /**
   * @brief Renders a `table` element to a Markdown table.
   *
   * @param table Table element.
   * @return Markdown table, or an empty string when there are no rows.
   */
  function renderTable(table: ElementNode): string {
    const rows: string[][] = [];
    collectRows(table, rows);
    const [header, ...body] = rows;
    if (header === undefined) {
      return '';
    }
    const columns = Math.max(header.length, ...body.map(row => row.length), 1);
    const pad = (row: readonly string[]): string[] =>
      Array.from({length: columns}, (_, index) => row[index] ?? '');
    const separator = Array.from({length: columns}, () => '---');
    return [pad(header), separator, ...body.map(pad)]
      .map(row => `| ${row.join(' | ')} |`)
      .join('\n');
  }

  /**
   * @brief Collects table rows from a subtree.
   *
   * @param node Subtree root.
   * @param rows Output row list.
   */
  function collectRows(node: ElementNode, rows: string[][]): void {
    for (const child of node.children) {
      if (child.type !== 'element') {
        continue;
      }
      if (child.name === 'tr') {
        rows.push(collectCells(child));
      } else if (child.name !== 'table') {
        collectRows(child, rows);
      }
    }
  }

  /**
   * @brief Renders the cells of one table row.
   *
   * @param row Row element.
   * @return Cell contents with escaped pipes.
   */
  function collectCells(row: ElementNode): string[] {
    const cells: string[] = [];
    for (const child of row.children) {
      if (
        child.type !== 'element' ||
        (child.name !== 'td' && child.name !== 'th')
      ) {
        continue;
      }
      cells.push(
        cleanSpaces(renderChildren(child.children)).replace(/\|/g, '\\|'),
      );
    }
    return cells;
  }

  return renderChildren(tree.children)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @brief Splits HTML into tags and text runs.
 *
 * @param html Raw HTML without comments.
 * @return Ordered token list.
 */
function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match.index > last) {
      tokens.push({kind: 'text', value: html.slice(last, match.index)});
    }
    const name = (match[1] ?? '').toLowerCase();
    const raw = match[0];
    if (raw.startsWith('</')) {
      tokens.push({kind: 'close', name});
    } else {
      tokens.push({
        kind: 'open',
        name,
        attributes: match[2] ?? '',
        selfClosing: raw.endsWith('/>') || VOID_TAGS.has(name),
      });
    }
    last = re.lastIndex;
  }
  if (last < html.length) {
    tokens.push({kind: 'text', value: html.slice(last)});
  }
  return tokens;
}

/**
 * @brief Builds a document tree from a token list.
 *
 * @param tokens Token list.
 * @return Synthetic root element holding the parsed children.
 */
function buildTree(tokens: readonly Token[]): ElementNode {
  const root: ElementNode = {
    type: 'element',
    name: '#root',
    attributes: '',
    children: [],
  };
  const stack: ElementNode[] = [root];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (token.kind === 'text') {
      const value = decodeEntities(token.value);
      if (value.length > 0) {
        current(stack).children.push({type: 'text', value});
      }
      continue;
    }
    if (token.kind === 'open' && SKIP_TAGS.has(token.name)) {
      index = skipSubtree(tokens, index, token.name);
      continue;
    }
    if (token.kind === 'open') {
      const node: ElementNode = {
        type: 'element',
        name: token.name,
        attributes: token.attributes,
        children: [],
      };
      current(stack).children.push(node);
      if (!token.selfClosing) {
        stack.push(node);
      }
      continue;
    }
    for (let depth = stack.length - 1; depth >= 1; depth--) {
      if (stack[depth]?.name === token.name) {
        stack.length = depth;
        break;
      }
    }
  }
  return root;
}

/**
 * @brief Returns the innermost open element.
 *
 * @param stack Element stack with the root at index zero.
 * @return The top element.
 */
function current(stack: readonly ElementNode[]): ElementNode {
  return stack[stack.length - 1] as ElementNode;
}

/**
 * @brief Finds the end of a dropped subtree.
 *
 * @param tokens Token list.
 * @param start Index of the opening tag.
 * @param name Name of the dropped tag.
 * @return Index of the matching closing tag.
 */
function skipSubtree(
  tokens: readonly Token[],
  start: number,
  name: string,
): number {
  let depth = 1;
  let index = start;
  while (depth > 0 && index + 1 < tokens.length) {
    index++;
    const token = tokens[index];
    if (token === undefined || token.kind === 'text' || token.name !== name) {
      continue;
    }
    if (token.kind === 'open') {
      if (!token.selfClosing) {
        depth++;
      }
    } else {
      depth--;
    }
  }
  return index;
}

/**
 * @brief Reads a raw attribute value from an attribute string.
 *
 * @param attributes Raw attribute string.
 * @param name Attribute name.
 * @return Raw value, or `undefined` when absent.
 */
export function readHtmlAttribute(
  attributes: string,
  name: string,
): string | undefined {
  const re = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>=]+))`,
    'i',
  );
  const match = re.exec(attributes);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : undefined;
}
