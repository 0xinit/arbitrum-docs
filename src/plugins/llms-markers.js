const PREFIX = 'LLMS_';
const KINDS = ['DETAILS_OPEN', 'DETAILS_CLOSE', 'MATH_INLINE', 'MATH_BLOCK'];

exports.PREFIX = PREFIX;
exports.MARKER_RE = new RegExp(`^${PREFIX}(${KINDS.join('|')}):([^]*)$`);
