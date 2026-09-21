/** Duration follows the approved timeline, never the style example. */
export function approvedVideoDuration(segments: Array<{ time?: unknown }>): number | null {
  const ends = segments.map(({time}) => {
    const text = String(time || "");
    const clocks = [...text.matchAll(/(\d+):(\d{2})/g)];
    if (clocks.length >= 2 && clocks.every(match => Number(match[2]) < 60)) {
      const end = clocks[clocks.length - 1];
      return Number(end[1]) * 60 + Number(end[2]);
    }
    const seconds = text.match(/^\s*\d+(?:\.\d+)?\s*(?:秒|s)?\s*[-–—~至]\s*(\d+(?:\.\d+)?)\s*(?:秒|s)?\s*$/i);
    return seconds ? Number(seconds[1]) : NaN;
  });
  return ends.length && ends.every(Number.isFinite) && Math.max(...ends) > 0 ? Math.max(...ends) : null;
}
