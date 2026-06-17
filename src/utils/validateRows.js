// Patterns that indicate a raw unresolved ID leaked into narration output
const MONGO_ID_RE  = /\b[a-f0-9]{24}\b/i;   // 24-char hex  (MongoDB ObjectId)
const NUMERIC_ID_RE = /\b\d{15,}\b/;          // 15+ digits   (Snowflake / BigInt id)

// Columns where free-text narration should never contain raw IDs
const NARRATION_COLUMNS = ["Branching", "Filters", "Validations", "Automation Details"];

/**
 * Scans every row in the extracted dataset for raw IDs that were not resolved
 * to human-readable names during processing.
 *
 * Returns an array of issue objects:
 *   { rowIndex, column, stageName, activityName, instructionTitle, rawId }
 */
export const findUnresolvedIds = (rows) => {
  const issues = [];

  rows.forEach((row, idx) => {
    NARRATION_COLUMNS.forEach((col) => {
      const val = row[col];
      if (typeof val !== "string" || val === "N/A" || val === "") return;

      // Collect every unresolved ID found in the cell value
      const mongoMatches   = val.match(new RegExp(MONGO_ID_RE.source, "gi"))  || [];
      const numericMatches = val.match(new RegExp(NUMERIC_ID_RE.source, "g")) || [];
      const allMatches = [...new Set([...mongoMatches, ...numericMatches])];

      allMatches.forEach((rawId) => {
        issues.push({
          rowIndex:        idx + 1,
          column:          col,
          stageName:       row["Stage Name"]       || "—",
          activityName:    row["Activity Name"]     || "—",
          instructionTitle: row["Instruction Title"] || "—",
          rawId,
        });
      });
    });
  });

  return issues;
};

/**
 * Returns a short human-readable summary string for a list of issues.
 */
export const summariseIssues = (issues) => {
  if (!issues.length) return null;

  const byCols = issues.reduce((acc, i) => {
    acc[i.column] = (acc[i.column] || 0) + 1;
    return acc;
  }, {});

  const colParts = Object.entries(byCols)
    .map(([col, count]) => `${col} (${count})`)
    .join(", ");

  return `${issues.length} unresolved ID${issues.length > 1 ? "s" : ""} found in: ${colParts}`;
};
