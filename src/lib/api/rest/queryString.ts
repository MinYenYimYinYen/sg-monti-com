/**
 * Serializes query parameters into a URL query string
 * Supports RingCX's bracket notation for arrays and nested objects
 *
 * Examples:
 * { foo: 'bar' } => '?foo=bar'
 * { ids: [1, 2] } => '?ids=1&ids=2'
 * { custom_fields: { key: 'value' } } => '?custom_fields[key]=value'
 */
export function serializeParams(
  params: Record<string, string | number | boolean | Array<string | number>>,
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    // Handle arrays: repeat the key for each value (RingCX style)
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
      continue;
    }

    // Handle objects: use bracket notation
    if (typeof value === "object") {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (nestedValue !== undefined && nestedValue !== null) {
          parts.push(
            `${encodeURIComponent(key)}[${encodeURIComponent(nestedKey)}]=${encodeURIComponent(String(nestedValue))}`,
          );
        }
      }
      continue;
    }

    // Handle primitives
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Builds a complete URL from base, path, and params
 */
export function buildUrl(
  url: string,
  baseURL?: string,
  params?: Record<string, string | number | boolean | Array<string | number>>,
): string {
  // Combine baseURL and url
  let fullUrl = baseURL ? `${baseURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}` : url;

  // Append query params
  if (params && Object.keys(params).length > 0) {
    const queryString = serializeParams(params);
    fullUrl += queryString;
  }

  return fullUrl;
}
