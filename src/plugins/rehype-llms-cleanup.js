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
      i += r.length - 1;
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

function getTextContent(nodes) {
  let s = '';
  for (const n of nodes) {
    if (n.type === 'text') s += n.value;
    else if (Array.isArray(n.children)) s += getTextContent(n.children);
  }
  return s;
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

module.exports = function rehypeLlmsCleanup() {
  return (tree) => {
    walk(tree, null, 0, (node) => {
      if (isHashLink(node)) return 'remove';
      if (isQuicklook(node)) return node.children || [];
      const adm = getAdmonitionType(node);
      if (adm) return [admonitionToBlockquote(node, adm)];
      propagateCodeLanguage(node);
    });
  };
};
