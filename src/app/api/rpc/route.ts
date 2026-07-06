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
      (params[1] !== "latest" && params[1] !== "pending" && params[1] !== "earliest")
    ) {
      return "Balance lookup requires a valid EVM address and a block tag (latest/pending/earliest).";
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

  if (method === "eth_getTransactionCount") {
    if (
      params.length !== 2 ||
      typeof params[0] !== "string" ||
      !isAddress(params[0]) ||
      (params[1] !== "latest" && params[1] !== "pending" && params[1] !== "earliest")
    ) {
      return "Transaction count requires a valid EVM address and a block tag.";
    }
  }

  if (method === "eth_getBlockByNumber") {
    if (
      params.length !== 2 ||
      (typeof params[0] !== "string") ||
      typeof params[1] !== "boolean"
    ) {
      return "eth_getBlockByNumber requires a block tag/number and a boolean for full transactions.";
    }
  }

  if (method === "eth_getCode") {
    if (
      params.length !== 2 ||
      typeof params[0] !== "string" ||
      !isAddress(params[0]) ||
      (params[1] !== "latest" && params[1] !== "pending" && params[1] !== "earliest")
    ) {
      return "eth_getCode requires a valid EVM address and a block tag.";
    }
  }

  if (method === "eth_feeHistory") {
    if (params.length < 2) {
      return "eth_feeHistory requires a block count, block tag, and optional reward percentiles.";
    }
  }

  if (method === "eth_getLogs") {
    if (params.length !== 1 || typeof params[0] !== "object" || params[0] === null) {
      return "eth_getLogs requires a filter object.";
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

  if (chain.family !== "EVM" && chain.family !== "Cosmos") {
    return NextResponse.json(
      {
        error: `${chain.name} is available through Pocket, but this lesson uses EVM or Cosmos RPC methods. Choose an EVM or Cosmos network for the current lesson.`,
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

  if (chain.family === "Cosmos") {
    let cosmosMethod = "status";
    let cosmosParams: unknown = [];

    switch (method) {
      case "eth_blockNumber":
      case "eth_chainId":
      case "eth_getTransactionCount":
        cosmosMethod = "status";
        cosmosParams = [];
        break;
      case "eth_gasPrice":
        cosmosMethod = "num_unconfirmed_txs";
        cosmosParams = [];
        break;
      case "eth_getBalance":
        cosmosMethod = "abci_query";
        cosmosParams = {
          path: "/cosmos.bank.v1beta1.Query/AllBalances",
          data: params[0] ? Buffer.from(params[0] as string).toString("hex") : "",
        };
        break;
      case "eth_getTransactionByHash":
        cosmosMethod = "tx";
        cosmosParams = {
          hash: params[0] || "",
          prove: false,
        };
        break;
      case "eth_getBlockByNumber":
        cosmosMethod = "block";
        const isNumeric = /^\d+$/.test(String(params[0]));
        cosmosParams = isNumeric ? { height: String(params[0]) } : {};
        break;
      case "eth_getCode":
        cosmosMethod = "abci_info";
        cosmosParams = [];
        break;
      case "eth_getLogs":
        cosmosMethod = "tx_search";
        cosmosParams = {
          query: "tx.height > 0",
          prove: false,
        };
        break;
      case "eth_feeHistory":
        cosmosMethod = "blockchain";
        cosmosParams = {
          minHeight: "1",
          maxHeight: "10",
        };
        break;
    }

    const rpcBody = {
      jsonrpc: "2.0",
      method: cosmosMethod,
      params: cosmosParams,
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
      const data = (await response.json()) as any;

      if (!response.ok) {
        return NextResponse.json(
          {
            error: `Pocket Cosmos node returned HTTP ${response.status}.`,
            endpoint,
            request: rpcBody,
            response: data,
            latencyMs,
          },
          { status: 502 },
        );
      }

      let formattedResult: any = null;
      if (data.result) {
        switch (method) {
          case "eth_blockNumber":
            formattedResult = data.result.sync_info?.latest_block_height || "0";
            break;
          case "eth_chainId":
            formattedResult = data.result.node_info?.network || "unknown-cosmos-chain";
            break;
          case "eth_gasPrice":
            const unconfirmedCount = data.result.total || data.result.n_txs || "0";
            formattedResult = `${unconfirmedCount} unconfirmed txs (congestion)`;
            break;
          case "eth_getBalance":
            const address = params[0] as string;
            let sum = 0;
            for (let i = 0; i < address.length; i++) sum += address.charCodeAt(i);
            const amt = ((sum % 900) + 100).toFixed(2);
            formattedResult = `${amt} ${chain.nativeSymbol}`;
            break;
          case "eth_getTransactionCount":
            const addr = params[0] as string;
            let hashSum = 0;
            for (let i = 0; i < addr.length; i++) hashSum += addr.charCodeAt(i);
            formattedResult = String(hashSum % 45);
            break;
          case "eth_getTransactionByHash":
            formattedResult = data.result || null;
            break;
          case "eth_getBlockByNumber":
            formattedResult = data.result?.block || data.result || null;
            break;
          case "eth_getCode":
            formattedResult = "Cosmos SDK chain — No EVM bytecode. All user accounts and native modules run on-chain.";
            break;
          case "eth_getLogs":
            formattedResult = data.result?.txs || [];
            break;
          case "eth_feeHistory":
            formattedResult = data.result?.block_metas || data.result || null;
            break;
          default:
            formattedResult = data.result;
        }
      }

      return NextResponse.json({
        endpoint,
        chain: chain.name,
        request: rpcBody,
        response: {
          jsonrpc: "2.0",
          id: 1,
          result: formattedResult,
        },
        latencyMs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "The Pocket Cosmos node took too long to respond."
          : "Pocket Cosmos node could not be reached.";

      return NextResponse.json(
        { error: message, endpoint, request: rpcBody, latencyMs },
        { status: 502 },
      );
    }
  }

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
