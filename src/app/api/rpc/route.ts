import { NextResponse } from "next/server";
import {
  ALLOWED_METHODS,
  type AllowedMethod,
  endpointFor,
  getChain,
  isAddress,
  isTransactionHash,
} from "@/lib/pocket";

type RpcRequest = {
  chain?: string;
  method?: AllowedMethod;
  params?: unknown[];
};

function validateParams(method: AllowedMethod, params: unknown[]) {
  if (
    method === "eth_blockNumber" ||
    method === "eth_chainId" ||
    method === "eth_gasPrice"
  ) {
    return params.length === 0 ? null : "This method does not accept parameters.";
  }

  if (method === "eth_getBalance") {
    if (
      params.length !== 2 ||
      typeof params[0] !== "string" ||
      !isAddress(params[0]) ||
      params[1] !== "latest"
    ) {
      return "Balance lookup requires a valid EVM address and the latest block tag.";
    }
  }

  if (method === "eth_getTransactionByHash") {
    if (
      params.length !== 1 ||
      typeof params[0] !== "string" ||
      !isTransactionHash(params[0])
    ) {
      return "Transaction lookup requires a valid 32-byte transaction hash.";
    }
  }

  return null;
}

export async function POST(request: Request) {
  let body: RpcRequest;

  try {
    body = (await request.json()) as RpcRequest;
  } catch {
    return NextResponse.json(
      { error: "The request body must be valid JSON." },
      { status: 400 },
    );
  }

  const chain = body.chain ? getChain(body.chain) : undefined;
  const method = body.method;
  const params = Array.isArray(body.params) ? body.params : [];

  if (!chain) {
    return NextResponse.json(
      { error: "Choose a supported Pocket network." },
      { status: 400 },
    );
  }

  if (!method || !ALLOWED_METHODS.has(method)) {
    return NextResponse.json(
      { error: "This RPC method is not enabled in the learning playground." },
      { status: 400 },
    );
  }

  if (chain.family !== "EVM") {
    return NextResponse.json(
      {
        error: `${chain.name} is available through Pocket, but this lesson uses EVM JSON-RPC methods. Choose an EVM network for the current lesson.`,
        endpoint: endpointFor(chain.slug),
      },
      { status: 400 },
    );
  }

  const paramError = validateParams(method, params);
  if (paramError) {
    return NextResponse.json({ error: paramError }, { status: 400 });
  }

  const endpoint = endpointFor(chain.slug);
  const rpcBody = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };
  const startedAt = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rpcBody),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const data = (await response.json()) as unknown;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Pocket returned HTTP ${response.status}.`,
          endpoint,
          request: rpcBody,
          response: data,
          latencyMs,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      endpoint,
      chain: chain.name,
      request: rpcBody,
      response: data,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "The Pocket endpoint took too long to respond."
        : "Pocket could not be reached from the server.";

    return NextResponse.json(
      { error: message, endpoint, request: rpcBody, latencyMs },
      { status: 502 },
    );
  }
}
