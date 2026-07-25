// Safe text rendering helpers. Every place in the UI that displays
// player-entered text (chat messages, highlighted phrases) MUST go
// through these instead of innerHTML, so raw HTML/script in player
// input is always shown as literal text, never parsed as markup.

export function renderTextSafely(el, text) {
  el.textContent = text;
  return el;
}

/**
 * Renders text with certain substrings visually highlighted, without
 * ever passing raw input through innerHTML. Builds the highlighted
 * spans as real DOM nodes with textContent, so highlighted phrases
 * pulled from player input can never inject markup.
 */
export function renderHighlighted(el, text, ranges, doc) {
  const document_ = doc || (typeof document !== 'undefined' ? document : null);
  if (!document_) throw new Error('renderHighlighted requires a document');
  el.textContent = '';
  if (!ranges || ranges.length === 0) {
    el.textContent = text;
    return el;
  }
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const range of sorted) {
    if (range.start > cursor) {
      el.appendChild(document_.createTextNode(text.slice(cursor, range.start)));
    }
    const mark = document_.createElement('mark');
    mark.className = 'technique-highlight';
    mark.textContent = text.slice(range.start, range.end);
    el.appendChild(mark);
    cursor = range.end;
  }
  if (cursor < text.length) {
    el.appendChild(document_.createTextNode(text.slice(cursor)));
  }
  return el;
}
