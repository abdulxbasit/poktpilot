export type Chain = {
  slug: string;
  name: string;
  shortName: string;
  logo: string;
  nativeSymbol: string;
  family: "EVM" | "Cosmos" | "Solana" | "Near" | "Sui" | "Tron";
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
    slug: "akash", name: "Akash", shortName: "AKT", logo: "akash", nativeSymbol: "AKT", family: "Cosmos",
  },
  {
    slug: "arb-one", name: "Arbitrum One", shortName: "ARB", logo: "arbitrum", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "arb-sepolia-testnet", name: "Arbitrum One Sepolia", shortName: "ARB SEP", logo: "arbitrum", nativeSymbol: "ETH", family: "EVM", testnet: true,
  },
  {
    slug: "atomone", name: "AtomOne", shortName: "ATONE", logo: "atomone", nativeSymbol: "ATONE", family: "Cosmos",
  },
  {
    slug: "avax", name: "Avalanche C-Chain", shortName: "AVAX", logo: "avax", nativeSymbol: "AVAX", family: "EVM",
  },
  {
    slug: "base", name: "Base", shortName: "BASE", logo: "base", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "base-sepolia-testnet", name: "Base Sepolia", shortName: "BASE SEP", logo: "base", nativeSymbol: "ETH", family: "EVM", testnet: true,
  },
  {
    slug: "bera", name: "Berachain", shortName: "BERA", logo: "berachain", nativeSymbol: "BERA", family: "EVM",
  },
  {
    slug: "blast", name: "Blast", shortName: "BLAST", logo: "blast", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "boba", name: "Boba", shortName: "BOBA", logo: "boba", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "bsc", name: "BNB", shortName: "BNB", logo: "bnb", nativeSymbol: "BNB", family: "EVM",
  },
  {
    slug: "celo", name: "Celo", shortName: "CELO", logo: "celo", nativeSymbol: "CELO", family: "EVM",
  },
  {
    slug: "cheqd", name: "Cheqd", shortName: "CHEQ", logo: "cheqd", nativeSymbol: "CHEQ", family: "Cosmos",
  },
  {
    slug: "chihuahua", name: "Chihuahua", shortName: "HUAHUA", logo: "chihuahua", nativeSymbol: "HUAHUA", family: "Cosmos",
  },
  {
    slug: "eth", name: "Ethereum", shortName: "ETH", logo: "ethereum", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "eth-sepolia-testnet", name: "Ethereum Sepolia", shortName: "SEP", logo: "ethereum", nativeSymbol: "ETH", family: "EVM", testnet: true,
  },
  {
    slug: "fantom", name: "Fantom", shortName: "FTM", logo: "fantom", nativeSymbol: "FTM", family: "EVM",
  },
  {
    slug: "fetch", name: "Fetch", shortName: "ASI", logo: "asi", nativeSymbol: "ASI", family: "Cosmos",
  },
  {
    slug: "fraxtal", name: "Fraxtal", shortName: "FRAX", logo: "fraxtal", nativeSymbol: "frxETH", family: "EVM",
  },
  {
    slug: "fuse", name: "Fuse", shortName: "FUSE", logo: "fuse", nativeSymbol: "FUSE", family: "EVM",
  },
  {
    slug: "gnosis", name: "Gnosis", shortName: "GNO", logo: "gnosis", nativeSymbol: "xDAI", family: "EVM",
  },
  {
    slug: "giwa-sepolia-testnet", name: "GIWA Sepolia", shortName: "GIWA SEP", logo: "giwa", nativeSymbol: "ETH", family: "EVM", testnet: true,
  },
  {
    slug: "harmony", name: "Harmony", shortName: "ONE", logo: "harmony", nativeSymbol: "ONE", family: "EVM",
  },
  {
    slug: "hyperliquid", name: "Hyperliquid", shortName: "HYPE", logo: "hyperliquid", nativeSymbol: "HYPE", family: "EVM",
  },
  {
    slug: "ink", name: "Ink", shortName: "INK", logo: "ink", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "iotex", name: "IoTeX", shortName: "IOTX", logo: "iotex", nativeSymbol: "IOTX", family: "EVM",
  },
  {
    slug: "juno", name: "Juno", shortName: "JUNO", logo: "juno", nativeSymbol: "JUNO", family: "Cosmos",
  },
  {
    slug: "kaia", name: "Kaia", shortName: "KAIA", logo: "kaia", nativeSymbol: "KAIA", family: "EVM",
  },
  {
    slug: "kava", name: "Kava", shortName: "KAVA", logo: "kava", nativeSymbol: "KAVA", family: "EVM",
  },
  {
    slug: "linea", name: "Linea", shortName: "LINEA", logo: "linea", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "metis", name: "Metis", shortName: "METIS", logo: "metis", nativeSymbol: "METIS", family: "EVM",
  },
  {
    slug: "moonbeam", name: "Moonbeam", shortName: "GLMR", logo: "moonbeam", nativeSymbol: "GLMR", family: "EVM",
  },
  {
    slug: "moonriver", name: "Moonriver", shortName: "MOVR", logo: "moonriver", nativeSymbol: "MOVR", family: "EVM",
  },
  {
    slug: "near", name: "Near", shortName: "NEAR", logo: "near", nativeSymbol: "NEAR", family: "Near",
  },
  {
    slug: "oasys", name: "Oasys", shortName: "OAS", logo: "oasys", nativeSymbol: "OAS", family: "EVM",
  },
  {
    slug: "op", name: "Optimism", shortName: "OP", logo: "op", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "op-sepolia-testnet", name: "Optimism Sepolia", shortName: "OP SEP", logo: "op", nativeSymbol: "ETH", family: "EVM", testnet: true,
  },
  {
    slug: "opbnb", name: "opBNB", shortName: "opBNB", logo: "bnb", nativeSymbol: "BNB", family: "EVM",
  },
  {
    slug: "osmosis", name: "Osmosis", shortName: "OSMO", logo: "osmosis", nativeSymbol: "OSMO", family: "Cosmos",
  },
  {
    slug: "persistence", name: "Persistence", shortName: "XPRT", logo: "persistence", nativeSymbol: "XPRT", family: "Cosmos",
  },
  {
    slug: "pocket", name: "Pocket", shortName: "POKT", logo: "pokt", nativeSymbol: "POKT", family: "Cosmos",
  },
  {
    slug: "poly", name: "Polygon", shortName: "POL", logo: "pol", nativeSymbol: "POL", family: "EVM",
  },
  {
    slug: "poly-amoy-testnet", name: "Polygon Amoy", shortName: "AMOY", logo: "pol", nativeSymbol: "POL", family: "EVM", testnet: true,
  },
  {
    slug: "poly-zkevm", name: "Polygon zkEVM", shortName: "zkEVM", logo: "pol", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "scroll", name: "Scroll", shortName: "SCR", logo: "scroll", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "seda", name: "SEDA", shortName: "SEDA", logo: "seda", nativeSymbol: "SEDA", family: "Cosmos",
  },
  {
    slug: "sei", name: "Sei", shortName: "SEI", logo: "sei", nativeSymbol: "SEI", family: "EVM",
  },
  {
    slug: "shentu", name: "Shentu", shortName: "CTK", logo: "shentu", nativeSymbol: "CTK", family: "Cosmos",
  },
  {
    slug: "solana", name: "Solana", shortName: "SOL", logo: "sol", nativeSymbol: "SOL", family: "Solana",
  },
  {
    slug: "sonic", name: "Sonic", shortName: "S", logo: "sonic", nativeSymbol: "S", family: "EVM",
  },
  {
    slug: "sui", name: "Sui", shortName: "SUI", logo: "sui", nativeSymbol: "SUI", family: "Sui",
  },
  {
    slug: "taiko", name: "Taiko", shortName: "TAIKO", logo: "taiko", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "tron", name: "Tron", shortName: "TRX", logo: "tron", nativeSymbol: "TRX", family: "Tron",
  },
  {
    slug: "unichain", name: "Unichain", shortName: "UNI", logo: "unichain", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "xrplevm", name: "XRPL EVM", shortName: "XRPL", logo: "xrp", nativeSymbol: "XRP", family: "EVM",
  },
  {
    slug: "xrplevm-testnet", name: "XRPL EVM TestNet", shortName: "XRPL TEST", logo: "xrp", nativeSymbol: "XRP", family: "EVM", testnet: true,
  },
  {
    slug: "zklink-nova", name: "zkLink", shortName: "ZKL", logo: "zklink", nativeSymbol: "ETH", family: "EVM",
  },
  {
    slug: "zksync-era", name: "zkSync Era", shortName: "ZK", logo: "zksync", nativeSymbol: "ETH", family: "EVM",
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
        (item.shortName.length >= 3 &&
          normalized.includes(item.shortName.toLowerCase())),
    ) ?? getChain("eth")!;

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
