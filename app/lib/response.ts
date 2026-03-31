import { NextResponse } from "next/server";

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const jsonError = (message: string, status = 400) =>
  NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );

export const jsonServerError = (
  error: unknown,
  fallback: string,
  status = 500,
) => jsonError(errorMessage(error, fallback), status);

export const jsonOk = <T>(payload: T, status = 200) =>
  NextResponse.json(
    {
      ok: true,
      ...payload,
    },
    { status },
  );
