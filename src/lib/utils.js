export function today() {
  return new Date().toISOString().split("T")[0];
}

export function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function chunkText(text, chunkWords = 5000, overlapWords = 500) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = [];
  let currentCount = 0;
  for (const para of paragraphs) {
    const wc = wordCount(para);
    if (currentCount + wc > chunkWords && current.length > 0) {
      chunks.push(current.join("\n\n"));
      const overlapParas = [];
      let overlapCount = 0;
      for (let i = current.length - 1; i >= 0 && overlapCount < overlapWords; i--) {
        overlapParas.unshift(current[i]);
        overlapCount += wordCount(current[i]);
      }
      current = overlapParas;
      currentCount = overlapCount;
    }
    current.push(para);
    currentCount += wc;
  }
  if (current.length > 0) chunks.push(current.join("\n\n"));
  return chunks;
}

export function extractJsonBlocks(text) {
  const regex = /```json\s*([\s\S]*?)\s*```/g;
  const blocks = [];
  const parseErrors = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (e) {
      parseErrors.push(e.message);
    }
  }
  // Return a plain object — previously this mutated the array with a _parseErrors
  // property, which is invisible to linters and bypasses normal type checking.
  return { blocks, parseErrors };
}

export function extractPreCommitText(text) {
  const idx = text.indexOf("```json");
  return idx > -1 ? text.slice(0, idx).trim() : text.trim();
}

export function staleWarning(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (Date.now() - d.getTime()) > 7 * 24 * 60 * 60 * 1000;
}

export function confClass(conf, val) {
  if (conf !== val) return "";
  if (val === "high") return "active-high";
  if (val === "medium") return "active-medium";
  if (val === "low") return "active-low";
  return "";
}

export function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
