import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/config/api-url";

type CancelJoinRouteContext = {
  params: Promise<{
    meetingCode: string;
  }>;
};

export async function POST(request: NextRequest, context: CancelJoinRouteContext) {
  const { meetingCode } = await context.params;
  const backendBaseUrl = getBackendBaseUrl();
  const backendUrl = `${backendBaseUrl}/meetings/${encodeURIComponent(meetingCode)}/cancel-join`;
  const requestBody = await request.text();
  const forwardedHeaders = new Headers();
  const authorizationHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  const contentTypeHeader = request.headers.get("content-type");

  if (authorizationHeader) {
    forwardedHeaders.set("authorization", authorizationHeader);
  }

  if (cookieHeader) {
    forwardedHeaders.set("cookie", cookieHeader);
  }

  if (contentTypeHeader && requestBody) {
    forwardedHeaders.set("content-type", contentTypeHeader);
  }

  const backendResponse = await fetch(backendUrl, {
    method: "POST",
    headers: forwardedHeaders,
    body: requestBody || undefined,
    cache: "no-store",
  });
  const responseText = await backendResponse.text();
  const responseHeaders = new Headers();
  const responseContentType = backendResponse.headers.get("content-type");

  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  return new NextResponse(responseText || null, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
