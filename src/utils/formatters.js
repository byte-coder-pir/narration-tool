/* -------------------- GENERIC FORMATTERS -------------------- */

export const formatKey = (key) => {
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

export const formatConstraint = (constraint) => {
  if (!constraint) return "";
  const map = {
    EQ: "equals",
    NEQ: "not equals",
    NE: "not equals",
    LT: "is less than",
    LTE: "is less than or equal to",
    LE: "is less than or equal to",
    GT: "is greater than",
    GTE: "is greater than or equal to",
    GE: "is greater than or equal to",
    CONTAINS: "contains",
    NOT_CONTAINS: "does not contain",
    STARTS_WITH: "starts with",
    ENDS_WITH: "ends with",
    IN: "is in",
    NOT_IN: "is not in",
    BETWEEN: "is between",
    IS_NULL: "is empty",
    IS_NOT_NULL: "is not empty",
  };
  return map[constraint.toUpperCase()] || formatKey(constraint);
};

export const formatExceptionType = (exceptionType) => {
  if (!exceptionType) return "Default";
  const map = {
    DEFAULT_FLOW: "Halt Parameter Exception",
    HALT_PARAMETER_EXCEPTION: "Halt Parameter Exception",
    SKIP_EXCEPTION: "Skip Exception",
    WARNING_ONLY: "Warning Only",
    WARNING: "Warning Only",
    APPROVAL_REQUIRED: "Approval Required",
    SOFT_EXCEPTION: "Soft Exception",
    HARD_EXCEPTION: "Hard Exception",
  };
  return map[exceptionType.toUpperCase()] || formatKey(exceptionType);
};

export const formatSelector = (selector) => {
  if (!selector) return "";
  const map = {
    CONSTANT: "Constant",
    PARAMETER: "Parameter",
    PROPERTY: "Property",
    VARIABLE: "Variable",
    EXPRESSION: "Expression",
    NONE: "None",
  };
  return map[selector.toUpperCase()] || formatKey(selector);
};

export const formatUnit = (unit) => {
  if (!unit) return "";
  const map = {
    DAYS: "Days from today",
    DAY: "Days from today",
    HOURS: "Hours from now",
    HOUR: "Hours from now",
    MINUTES: "Minutes from now",
    MINUTE: "Minutes from now",
    WEEKS: "Weeks from today",
    WEEK: "Weeks from today",
    MONTHS: "Months from today",
    MONTH: "Months from today",
    YEARS: "Years from today",
    YEAR: "Years from today",
  };
  return map[unit.toUpperCase()] || formatKey(unit);
};
