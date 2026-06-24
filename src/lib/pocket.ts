export type Chain = {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  nativeSymbol: string;
  family: "EVM";
  testnet?: boolean;
};

export type Recipe = {
  id: string;
  method: AllowedMethod;
  title: string;
  description: string;
  skill: string;
  paramLabel?: string;
  paramPlaceholder?: string;
  defaultParams: unknown[];
  resultLabel: string;
};

export type AllowedMethod =
  | "eth_blockNumber"
  | "eth_chainId"
  | "eth_gasPrice"
  | "eth_getBalance"
  | "eth_getTransactionByHash";

export const CHAINS: Chain[] = [
  {
    slug: "eth",
    name: "Ethereum",
    shortName: "ETH",
    color: "#627eea",
    nativeSymbol: "ETH",
    family: "EVM",
  },
  {
    slug: "base",
    name: "Base",
    shortName: "BASE",
    color: "#0052ff",
    nativeSymbol: "ETH",
    family: "EVM",
  },
  {
    slug: "arb-one",
    name: "Arbitrum",
    shortName: "ARB",
    color: "#28a0f0",
    nativeSymbol: "ETH",
    family: "EVM",
  },
  {
    slug: "op",
    name: "Optimism",
    shortName: "OP",
    color: "#ff0420",
    nativeSymbol: "ETH",
    family: "EVM",
  },
  {
    slug: "poly",
    name: "Polygon",
    shortName: "POLY",
    color: "#8247e5",
    nativeSymbol: "POL",
    family: "EVM",
  },
  {
    slug: "eth-sepolia-testnet",
    name: "Sepolia",
    shortName: "SEP",
    color: "#8b5cf6",
    nativeSymbol: "ETH",
    family: "EVM",
    testnet: true,
  },
];

export const RECIPES: Recipe[] = [
  {
    id: "latest-block",
    method: "eth_blockNumber",
    title: "Latest block",
    description: "Read the newest block height reported by the network.",
    skill: "RPC basics",
    defaultParams: [],
    resultLabel: "Block height",
  },
  {
    id: "chain-id",
    method: "eth_chainId",
    title: "Identify a chain",
    description: "Ask the endpoint which EVM chain it is connected to.",
    skill: "Network safety",
    defaultParams: [],
    resultLabel: "Chain ID",
  },
  {
    id: "gas-price",
    method: "eth_gasPrice",
    title: "Current gas price",
    description: "Fetch the current gas price estimate from the network.",
    skill: "Fee data",
    defaultParams: [],
    resultLabel: "Gas price",
  },
  {
    id: "wallet-balance",
    method: "eth_getBalance",
    title: "Wallet balance",
    description: "Read the native token balance for any EVM address.",
    skill: "Addresses + wei",
    paramLabel: "Wallet address",
    paramPlaceholder: "0x0000000000000000000000000000000000000000",
    defaultParams: ["0x0000000000000000000000000000000000000000", "latest"],
    resultLabel: "Native balance",
  },
  {
    id: "transaction",
    method: "eth_getTransactionByHash",
    title: "Transaction lookup",
    description: "Inspect a transaction using its 32-byte hash.",
    skill: "Transaction data",
    paramLabel: "Transaction hash",
    paramPlaceholder: "0x… 64 hexadecimal characters",
    defaultParams: [""],
    resultLabel: "Transaction",
  },
];

export const ALLOWED_METHODS = new Set<AllowedMethod>(
  RECIPES.map((recipe) => recipe.method),
);

export function getChain(slug: string) {
  return CHAINS.find((chain) => chain.slug === slug);
}

export function getRecipe(id: string) {
  return RECIPES.find((recipe) => recipe.id === id);
}

export function endpointFor(slug: string) {
  return `https://${slug}.api.pocket.network`;
}

export function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isTransactionHash(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function formatHexInteger(value: string) {
  return Number.parseInt(value, 16).toLocaleString("en-US");
}

export function formatWei(value: string, symbol: string) {
  const wei = BigInt(value);
  const base = 10n ** 18n;
  const whole = wei / base;
  const fraction = (wei % base).toString().padStart(18, "0").slice(0, 6);
  const trimmed = fraction.replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${trimmed ? `.${trimmed}` : ""} ${symbol}`;
}

export function formatGwei(value: string) {
  const wei = BigInt(value);
  const base = 10n ** 9n;
  const whole = wei / base;
  const fraction = (wei % base).toString().padStart(9, "0").slice(0, 3);
  const trimmed = fraction.replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${trimmed ? `.${trimmed}` : ""} Gwei`;
}

export function explainMethod(method: AllowedMethod) {
  const explanations: Record<AllowedMethod, string> = {
    eth_blockNumber:
      "This method asks the selected network for its latest known block. The RPC result is hexadecimal, so PocketPilot converts it to a decimal block height.",
    eth_chainId:
      "This method verifies which EVM chain the endpoint serves. Checking the chain ID helps prevent sending reads or transactions to the wrong network.",
    eth_gasPrice:
      "This method returns the network's current gas price in wei. PocketPilot converts it to Gwei, the unit developers commonly use for fee estimates.",
    eth_getBalance:
      "This method reads an address's native token balance at a block tag. The result arrives in wei, the smallest native-token unit.",
    eth_getTransactionByHash:
      "This method asks the chain for a transaction object matching the supplied hash. A null result usually means the hash is unknown on this network.",
  };

  return explanations[method];
}

export function parseNaturalLanguage(input: string) {
  const normalized = input.toLowerCase();
  const chain =
    CHAINS.find(
      (item) =>
        normalized.includes(item.name.toLowerCase()) ||
        normalized.includes(item.shortName.toLowerCase()),
    ) ?? CHAINS[0];

  let recipe = RECIPES[0];
  if (normalized.includes("balance") || normalized.includes("wallet")) {
    recipe = RECIPES.find((item) => item.id === "wallet-balance") ?? recipe;
  } else if (
    normalized.includes("transaction") ||
    normalized.includes("tx ") ||
    normalized.includes("hash")
  ) {
    recipe = RECIPES.find((item) => item.id === "transaction") ?? recipe;
  } else if (normalized.includes("gas") || normalized.includes("fee")) {
    recipe = RECIPES.find((item) => item.id === "gas-price") ?? recipe;
  } else if (normalized.includes("chain id") || normalized.includes("network id")) {
    recipe = RECIPES.find((item) => item.id === "chain-id") ?? recipe;
  }

  const hexValues = input.match(/0x[a-fA-F0-9]+/g) ?? [];
  const parameter = hexValues.find((value) =>
    recipe.id === "wallet-balance"
      ? isAddress(value)
      : recipe.id === "transaction"
        ? isTransactionHash(value)
        : false,
  );

  return { chain, recipe, parameter };
}
