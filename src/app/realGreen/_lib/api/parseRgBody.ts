/**
 * Parses a successful RealGreen response body. RealGreen answers some lookups for an unknown id
 * (e.g. GET /Employee/{id}) with a 2xx and no body at all, and res.json() throws on that, which
 * rgHttp would report as a connection failure. An empty body means "nothing found", so it
 * becomes null. A non-empty body that is not valid JSON still throws.
 *
 * Returns any, like res.json() did, so rgHttp's typing does not change.
 */
export function parseRgBody(text: string): any {
  return text.trim() === "" ? null : JSON.parse(text);
}
