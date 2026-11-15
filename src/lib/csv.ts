const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function sanitizeCell(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

/**
 * Neutralize spreadsheet formulas before CSV generation. Event names, page
 * titles, UTM values, and referrers are attacker-controlled through the public
 * tracker, and a leading =, +, -, @, tab, or carriage return executes when an
 * exported file is opened in Excel or LibreOffice.
 */
export function sanitizeCsvData<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(row => {
      if (Array.isArray(row)) {
        return row.map(sanitizeCell);
      }

      if (row && typeof row === 'object') {
        return Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, sanitizeCell(value)]),
        );
      }

      return sanitizeCell(row);
    }) as T;
  }

  return data;
}
