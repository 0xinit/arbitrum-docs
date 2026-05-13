const { buildMarkerValue } = require('./llms-markers');

// Splice + i-- re-visits the first replacement so nested cleanup (hash-links
// inside tab panels, etc.) still fires. Relies on no visitor rule producing
// output that re-matches its own check — otherwise the loop never advances.
function walk(node, parent, index, visitor) {
  if (!node || typeof node !== 'object') return;
  const result = visitor(node, parent, index);
  if (result === 'remove') return 'remove';
  if (Array.isArray(result)) return result;
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (let i = 0; i < children.length; i++) {
    const r = walk(children[i], node, i, visitor);
    if (r === 'remove') {
      children.splice(i, 1);
      i--;
    } else if (Array.isArray(r)) {
      children.splice(i, 1, ...r);
      i--;
    }
  }
}

function getClassList(node) {
  if (node.type !== 'element' || !node.properties) return [];
  const cls = node.properties.className;
  if (!cls) return [];
  return Array.isArray(cls) ? cls : String(cls).split(/\s+/);
}

function hasClass(node, name) {
  return getClassList(node).includes(name);
}

function hasClassPrefix(node, prefix) {
  return getClassList(node).some((c) => c.startsWith(prefix));
}

function findChild(node, predicate) {
  if (!node.children) return null;
  for (const child of node.children) {
    if (predicate(child)) return child;
  }
  return null;
}

function findDescendant(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node.children)) {
    for (const c of node.children) {
      if (predicate(c)) return c;
      const r = findDescendant(c, predicate);
      if (r) return r;
    }
  }
  return null;
}

function findAllDescendants(node, predicate, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node.children)) {
    for (const c of node.children) {
      if (predicate(c)) acc.push(c);
      else findAllDescendants(c, predicate, acc);
    }
  }
  return acc;
}

function getTextContent(nodes) {
  let s = '';
  for (const n of nodes) {
    if (n.type === 'text') s += n.value;
    else if (Array.isArray(n.children)) s += getTextContent(n.children);
  }
  return s;
}

function isHashLink(node) {
  return node.type === 'element' && node.tagName === 'a' && hasClass(node, 'hash-link');
}

function isQuicklook(node) {
  return (
    node.type === 'element' &&
    node.tagName === 'a' &&
    node.properties &&
    'dataQuicklookFrom' in node.properties
  );
}

function getAdmonitionType(node) {
  if (node.type !== 'element' || node.tagName !== 'div') return null;
  const classes = getClassList(node);
  if (!classes.includes('theme-admonition')) return null;
  for (const c of classes) {
    const m = /^theme-admonition-(.+)$/.exec(c);
    if (m) return m[1];
  }
  return null;
}

function admonitionToBlockquote(node, type) {
  const heading = findChild(
    node,
    (c) => c.type === 'element' && hasClassPrefix(c, 'admonitionHeading'),
  );
  const content = findChild(
    node,
    (c) => c.type === 'element' && hasClassPrefix(c, 'admonitionContent'),
  );
  const titleChildren = heading
    ? (heading.children || []).filter(
        (c) => !(c.type === 'element' && hasClassPrefix(c, 'admonitionIcon')),
      )
    : [];
  const typeLabel = type.toUpperCase();
  const titleText = getTextContent(titleChildren).trim();
  const isDefaultTitle = titleText.toLowerCase() === type.toLowerCase();
  const firstParaChildren = [
    {
      type: 'element',
      tagName: 'strong',
      properties: {},
      children: [{ type: 'text', value: typeLabel }],
    },
  ];
  if (!isDefaultTitle && titleChildren.length > 0) {
    firstParaChildren.push({ type: 'text', value: ' — ' });
    firstParaChildren.push(...titleChildren);
  }
  const children = [{ type: 'element', tagName: 'p', properties: {}, children: firstParaChildren }];
  if (content && Array.isArray(content.children)) {
    children.push(...content.children);
  }
  return { type: 'element', tagName: 'blockquote', properties: {}, children };
}

function propagateCodeLanguage(node) {
  if (node.type !== 'element' || node.tagName !== 'pre') return;
  const langClass = getClassList(node).find((c) => /^language-/.test(c));
  if (!langClass) return;
  const code = findChild(node, (c) => c.type === 'element' && c.tagName === 'code');
  if (!code) return;
  const codeClasses = getClassList(code);
  if (codeClasses.includes(langClass)) return;
  code.properties = code.properties || {};
  code.properties.className = [...codeClasses, langClass];
}

function isTabContainer(node) {
  if (node.type !== 'element') return false;
  const classes = getClassList(node);
  return classes.includes('tabs-container') || classes.includes('theme-tabs-container');
}

// Carry markers across the hast→mdast boundary as <code> (inline) or
// <pre><code> (block) elements rather than hast comments. Comments are
// treated as skippable by rehype-minify-whitespace and would swallow
// adjacent text whitespace (e.g. "Where $U$ is" becomes "Where $U$is").
function mkInlineMarker(kind, payload) {
  return {
    type: 'element',
    tagName: 'code',
    properties: { className: ['llms-marker'] },
    children: [{ type: 'text', value: buildMarkerValue(kind, payload) }],
  };
}

function mkBlockMarker(kind, payload) {
  return {
    type: 'element',
    tagName: 'pre',
    properties: { className: ['llms-marker'] },
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: {},
        children: [{ type: 'text', value: buildMarkerValue(kind, payload) }],
      },
    ],
  };
}

function tabsToMarkers(node) {
  const tablist = findDescendant(
    node,
    (c) => c.type === 'element' && c.properties?.role === 'tablist',
  );
  if (!tablist) return null;
  const labels = (tablist.children || []).filter(
    (c) => c.type === 'element' && c.properties?.role === 'tab',
  );
  const panels = findAllDescendants(
    node,
    (c) => c.type === 'element' && c.properties?.role === 'tabpanel',
  );
  if (labels.length === 0 || panels.length === 0) return null;
  const out = [];
  const count = Math.min(labels.length, panels.length);
  for (let i = 0; i < count; i++) {
    const labelText = getTextContent(labels[i].children || []).trim();
    out.push(mkBlockMarker('DETAILS_OPEN', labelText));
    if (Array.isArray(panels[i].children)) out.push(...panels[i].children);
    out.push(mkBlockMarker('DETAILS_CLOSE', ''));
  }
  return out;
}

function isKatex(node) {
  return node.type === 'element' && node.tagName === 'span' && getClassList(node).includes('katex');
}

function isKatexDisplay(node) {
  return (
    node.type === 'element' &&
    node.tagName === 'span' &&
    getClassList(node).includes('katex-display')
  );
}

function getAnnotationLatex(node) {
  const annotation = findDescendant(
    node,
    (c) =>
      c.type === 'element' &&
      c.tagName === 'annotation' &&
      c.properties?.encoding === 'application/x-tex',
  );
  if (!annotation) return null;
  return getTextContent(annotation.children || []);
}

module.exports = function rehypeLlmsCleanup() {
  return (tree) => {
    walk(tree, null, 0, (node) => {
      if (isHashLink(node)) return 'remove';
      if (isQuicklook(node)) return node.children || [];
      const adm = getAdmonitionType(node);
      if (adm) return [admonitionToBlockquote(node, adm)];
      if (isTabContainer(node)) {
        const replacement = tabsToMarkers(node);
        if (replacement) return replacement;
      }
      if (isKatexDisplay(node)) {
        const latex = getAnnotationLatex(node);
        if (latex != null) return [mkBlockMarker('MATH_BLOCK', latex)];
      } else if (isKatex(node)) {
        const latex = getAnnotationLatex(node);
        if (latex != null) return [mkInlineMarker('MATH_INLINE', latex)];
      }
      propagateCodeLanguage(node);
    });
  };
};
