
export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 60%)`;
};

export const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  
  // Fast path for substring
  if (t.includes(q)) return true;

  // Fuzzy sequence match
  let qIdx = 0;
  let tIdx = 0;
  while (qIdx < q.length && tIdx < t.length) {
    if (q[qIdx] === t[tIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  return qIdx === q.length;
};
