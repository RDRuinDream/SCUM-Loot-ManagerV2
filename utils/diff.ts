
export type DiffPart = {
  type: 'same' | 'added' | 'removed';
  value: string;
};

export const computeLineDiff = (text1: string, text2: string): DiffPart[] => {
  // Normalize line endings
  const t1 = text1.replace(/\r\n/g, '\n');
  const t2 = text2.replace(/\r\n/g, '\n');
  
  const lines1 = t1.split('\n');
  const lines2 = t2.split('\n');
  const n = lines1.length;
  const m = lines2.length;
  
  // DP Table for Longest Common Subsequence
  // Note: For very large files this might be memory intensive, 
  // but adequate for typical config JSONs.
  const dp = new Int32Array((n + 1) * (m + 1));
  const getDp = (r: number, c: number) => dp[r * (m + 1) + c];
  const setDp = (r: number, c: number, val: number) => { dp[r * (m + 1) + c] = val; };

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        setDp(i, j, getDp(i - 1, j - 1) + 1);
      } else {
        setDp(i, j, Math.max(getDp(i - 1, j), getDp(i, j - 1)));
      }
    }
  }

  // Backtrack to find changes
  const result: DiffPart[] = [];
  let i = n, j = m;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      result.unshift({ type: 'same', value: lines1[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || getDp(i, j - 1) >= getDp(i - 1, j))) {
      result.unshift({ type: 'added', value: lines2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || getDp(i, j - 1) < getDp(i - 1, j))) {
      result.unshift({ type: 'removed', value: lines1[i - 1] });
      i--;
    }
  }
  
  return result;
};
