const { MARKER_RE } = require('./llms-markers');

const EMPTY_COMMENT = /^<!--\s*-->$/;

function rewriteMarkerValue(value) {
  const m = MARKER_RE.exec(value);
  if (!m) return null;
  const kind = m[1];
  const payload = decodeURIComponent(m[2]);
  if (kind === 'DETAILS_OPEN') return `<details>\n<summary>${escapeHtml(payload)}</summary>\n`;
  if (kind === 'DETAILS_CLOSE') return `\n</details>`;
  if (kind === 'MATH_INLINE') return `$${payload}$`;
  if (kind === 'MATH_BLOCK') return `\n$$\n${payload}\n$$\n`;
  return null;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rewrite(node) {
  if (node.type === 'inlineCode' || node.type === 'code') {
    const html = rewriteMarkerValue(node.value);
    if (html !== null) {
      node.type = 'html';
      node.value = html;
      delete node.lang;
      delete node.meta;
      return false;
    }
  }
  if (node.type === 'html' && typeof node.value === 'string' && EMPTY_COMMENT.test(node.value)) {
    return true;
  }
  return false;
}

function walk(node, parent, index) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      const removed = walk(node.children[i], node, i);
      if (removed) i--;
    }
  }
  const shouldRemove = rewrite(node);
  if (shouldRemove && parent && Array.isArray(parent.children)) {
    parent.children.splice(index, 1);
    return true;
  }
  return false;
}

module.exports = function remarkLlmsCleanup() {
  return (tree) => {
    walk(tree, null, 0);
  };
};
