import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";
  const url = new URL(`/api/v1/${endpoint}${request.nextUrl.search}`, baseUrl);
  const cookieStore = await cookies();
  const token = cookieStore.get("lanternqueue_session")?.value;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (request.headers.get("content-type")) {
    headers.set("Content-Type", request.headers.get("content-type")!);
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
    });
    if (endpoint === "sessions" && request.method === "POST" && response.ok) {
      const result = (await response.json()) as {
        token: string;
        expires_in: number;
        user: unknown;
      };
      const output = NextResponse.json({ user: result.user }, { status: response.status });
      output.cookies.set("lanternqueue_session", result.token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: result.expires_in,
      });
      return output;
    }
    const outputHeaders = new Headers({
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    });
    const disposition = response.headers.get("content-disposition");
    if (disposition) outputHeaders.set("Content-Disposition", disposition);
    const output = new NextResponse(response.status === 204 ? null : await response.arrayBuffer(), {
      status: response.status,
      headers: outputHeaders,
    });
    if (endpoint === "sessions" && request.method === "DELETE") {
      output.cookies.delete("lanternqueue_session");
    }
    return output;
  } catch {
    return NextResponse.json({ detail: "API indisponível" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
