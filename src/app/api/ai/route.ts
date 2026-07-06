import { NextResponse } from "next/server";
import {
  RECIPES,
  CHAINS,
  parseNaturalLanguage,
} from "@/lib/pocket";

type AiRequest = {
  query?: string;
};

type AiResponse = {
  explanation: {
    whatThisDoes: string;
    howPoktPowersThis: string;
    suggestedRecipeNote: string;
    technicalDetails: string[];
  };
  recipeId: string;
  chainSlug: string;
  parameter?: string;
};

const RECIPE_CATALOG = RECIPES.map((r) => ({
  id: r.id,
  method: r.method,
  title: r.title,
  description: r.description,
  skill: r.skill,
  category: r.category,
  xpReward: r.xpReward,
  difficulty: r.difficulty,
}));

const CHAIN_NAMES = CHAINS.map((c) => ({
  slug: c.slug,
  name: c.name,
  family: c.family,
}));

function getLocalTechnicalDetails(method: string): string[] {
  switch (method) {
    case "eth_blockNumber":
      return [
        "Returns the integer block height formatted as a hexadecimal string.",
        "Crucial for calculating synchronization lag between nodes.",
        "Used as a baseline reference for block range queries in events/logs."
      ];
    case "eth_chainId":
      return [
        "Returns the chain ID as defined in EIP-155 (e.g. 0x1 for Ethereum mainnet).",
        "Required to prevent replay attacks when signing transactions.",
        "Helps frontend applications verify they are connected to the correct network."
      ];
    case "eth_gasPrice":
      return [
        "Returns the current estimated gas price in wei.",
        "Useful for legacy transactions; modern networks typically use base/priority fees instead.",
        "Fluctuates rapidly based on overall network traffic and block congestion."
      ];
    case "eth_getBalance":
      return [
        "Expects two parameters: the EVM address and a block tag/number.",
        "Value returned is in wei (1 ETH = 10^18 wei).",
        "A wallet address is a 20-byte hash represented by a 42-character hexadecimal string."
      ];
    case "eth_getTransactionByHash":
      return [
        "Expects a 32-byte transaction hash as a 66-character hexadecimal string.",
        "Returns null if the transaction is pending or doesn't exist on the selected chain.",
        "Provides key receipt information including gas used, status, and block inclusion."
      ];
    case "eth_getTransactionCount":
      return [
        "Returns the number of transactions sent from the address (its current nonce).",
        "Essential for tracking pending/mempool state of a wallet.",
        "Nonces must be sequential and cannot be skipped during execution."
      ];
    case "eth_getBlockByNumber":
      return [
        "Requires a block tag or height and a boolean indicating whether to pull full tx objects.",
        "Contains header attributes like gasLimit, gasUsed, and stateRoot.",
        "Useful for calculating average block times and validator/miner stats."
      ];
    case "eth_getCode":
      return [
        "Returns bytecode stored at the target address.",
        "Returns '0x' for Externally Owned Accounts (EOAs), confirming they are user wallets.",
        "Essential safety check before sending funds to a contract address."
      ];
    case "eth_getLogs":
      return [
        "Expects a filter object specifying address, block ranges, and topic hashes.",
        "Heavily throttled on standard public nodes, but fully supported by POKT Network's infrastructure.",
        "Logs allow dApps to index events without executing costly full block scans."
      ];
    case "eth_feeHistory":
      return [
        "Provides gas fee history for a range of blocks.",
        "Returns baseFeePerGas, gasUsedRatio, and requested priority fee percentiles.",
        "Crucial for writing accurate gas pricing algorithms under EIP-1559."
      ];
    default:
      return [
        "Queries live blockchain data via JSON-RPC 2.0 protocol.",
        "Returns standard JSON structure containing either a result or error object.",
        "Requires no state modification on-chain, meaning this is a free read-only query."
      ];
  }
}

function buildSystemPrompt() {
  return `You are PocketPilot AI — an expert assistant for teaching blockchain RPC concepts through POKT Network.

Your job is to interpret a user's plain-English question about blockchain data and respond with a structured JSON object. Your response must be educational, concise, and highlight how POKT Network makes decentralized RPC access possible.

## Available Recipes (pick the best match):
${JSON.stringify(RECIPE_CATALOG, null, 2)}

## Available Chains (pick the best match):
${JSON.stringify(CHAIN_NAMES, null, 2)}

## Response Format (strict JSON — no markdown, no code fences):
{
  "explanation": {
    "whatThisDoes": "2-4 sentences explaining what the RPC method does in plain English. Mention the method name (e.g. eth_getBalance). Explain what data comes back and why it is useful. Use a friendly, educational tone.",
    "howPoktPowersThis": "2-3 sentences explaining how POKT Network makes this possible. Mention: decentralized relay layer, no API keys needed, the endpoint pattern (e.g. eth.api.pocket.network), and that thousands of independent node operators serve the request. Keep it specific to the query.",
    "suggestedRecipeNote": "1-2 sentences telling the user which recipe to try and what they will learn. Mention the XP reward.",
    "technicalDetails": [
      "Detail 1: Explain a specific parameter or input requirement for this RPC method.",
      "Detail 2: Describe the return format (e.g., hexadecimal integer, base unit like wei, block structure).",
      "Detail 3: Provide a developer best practice or tip when implementing this query in a real application."
    ]
  },
  "recipeId": "the id field from the recipe catalog above",
  "chainSlug": "the slug field from the chain list above",
  "parameter": "optional — if the user provided a 0x address or tx hash, include it here"
}

## Rules:
- ALWAYS respond with valid JSON only. No markdown wrapping, no explanation outside the JSON.
- The 'technicalDetails' array must have exactly 3-4 elements. Ensure they are detailed, accurate, and helpful.
- If the user query does not clearly map to a recipe, default to "latest-block" on "eth".
- If the user mentions a specific chain name or symbol, match it. Otherwise default to "eth" (Ethereum).
- If the user provides an address (0x + 40 hex chars) or tx hash (0x + 64 hex chars), extract it into the "parameter" field.
- Keep the tone friendly, educational, and concise. You are a tutor, not a textbook.`;
}

export async function POST(request: Request) {
  let body: AiRequest;

  try {
    body = (await request.json()) as AiRequest;
  } catch {
    return NextResponse.json(
      { error: "The request body must be valid JSON." },
      { status: 400 },
    );
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "A query is required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    // Fallback to local parsing when no API key
    const local = parseNaturalLanguage(query);
    return NextResponse.json({
      explanation: {
        whatThisDoes: `The \`${local.recipe.method}\` method ${local.recipe.description.charAt(0).toLowerCase()}${local.recipe.description.slice(1)}`,
        howPoktPowersThis: `POKT Network routes your request through its decentralized relay layer to ${local.chain.name} — no API keys needed. Your query goes to ${local.chain.slug}.api.pocket.network, where thousands of independent node operators compete to serve your request with low latency and high uptime.`,
        suggestedRecipeNote: `Try the "${local.recipe.title}" recipe to practice this hands-on and earn +${local.recipe.xpReward} XP!`,
        technicalDetails: getLocalTechnicalDetails(local.recipe.method),
      },
      recipeId: local.recipe.id,
      chainSlug: local.chain.slug,
      parameter: local.parameter,
      source: "local",
    });
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: query }],
          },
        ],
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }],
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);
      throw new Error(`Gemini returned HTTP ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse the JSON from Gemini's response
    let parsed: AiResponse;
    try {
      parsed = JSON.parse(rawText) as AiResponse;
    } catch {
      console.error("Failed to parse Gemini JSON:", rawText);
      throw new Error("Gemini returned invalid JSON");
    }

    // Validate the recipe ID exists
    const validRecipe = RECIPES.find((r) => r.id === parsed.recipeId);
    if (!validRecipe) {
      parsed.recipeId = "latest-block";
    }

    // Validate the chain slug exists
    const validChain = CHAINS.find((c) => c.slug === parsed.chainSlug);
    if (!validChain) {
      parsed.chainSlug = "eth";
    }

    // Ensure technicalDetails exists
    if (!parsed.explanation.technicalDetails || !Array.isArray(parsed.explanation.technicalDetails)) {
      parsed.explanation.technicalDetails = getLocalTechnicalDetails(validRecipe ? validRecipe.method : "eth_blockNumber");
    }

    return NextResponse.json({
      ...parsed,
      source: "ai",
    });
  } catch (error) {
    console.error("AI route error, falling back to local:", error);

    // Fallback to local keyword parsing
    const local = parseNaturalLanguage(query);
    return NextResponse.json({
      explanation: {
        whatThisDoes: `The \`${local.recipe.method}\` method ${local.recipe.description.charAt(0).toLowerCase()}${local.recipe.description.slice(1)}`,
        howPoktPowersThis: `POKT Network routes your request through its decentralized relay layer to ${local.chain.name} — no API keys needed. Your query goes to ${local.chain.slug}.api.pocket.network, where thousands of independent node operators compete to serve your request with low latency and high uptime.`,
        suggestedRecipeNote: `Try the "${local.recipe.title}" recipe to practice this hands-on and earn +${local.recipe.xpReward} XP!`,
        technicalDetails: getLocalTechnicalDetails(local.recipe.method),
      },
      recipeId: local.recipe.id,
      chainSlug: local.chain.slug,
      parameter: local.parameter,
      source: "local-fallback",
    });
  }
}
