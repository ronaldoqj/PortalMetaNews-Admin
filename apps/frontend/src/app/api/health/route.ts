/**
 * Liveness for the hosting platform and uptime monitors: the server answers. It lives outside the proxy (`/api`),
 * so it answers on any host, the container's own address included, and it reads nothing about the request. It
 * does not ask the API: an API outage must not get the frontend restarted.
 */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
