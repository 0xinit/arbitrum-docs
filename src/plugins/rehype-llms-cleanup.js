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

function isHashLink(node) {
  if (node.type !== 'element' || node.tagName !== 'a') return false;
  const cls = node.properties?.className;
  if (!cls) return false;
  return Array.isArray(cls)
    ? cls.includes('hash-link')
    : String(cls).split(/\s+/).includes('hash-link');
}

function isQuicklook(node) {
  return (
    node.type === 'element' &&
    node.tagName === 'a' &&
    node.properties &&
    'dataQuicklookFrom' in node.properties
  );
}

module.exports = function rehypeLlmsCleanup() {
  return (tree) => {
    walk(tree, null, 0, (node) => {
      if (isHashLink(node)) return 'remove';
      if (isQuicklook(node)) return node.children || [];
    });
  };
};
