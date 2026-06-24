# PocketPilot

PocketPilot is an interactive RPC learning playground built around Pocket
Network. It helps developers move from a natural-language blockchain question
to a validated JSON-RPC request, a live Pocket response, a readable
explanation, and reusable integration code.

## Core experience

- Plan a query from plain language.
- Switch between Pocket-supported EVM networks.
- Run allowlisted, read-only JSON-RPC methods.
- Inspect the exact endpoint, request, response, latency, and decoded value.
- Generate cURL, JavaScript, Python, and viem examples.
- Complete a persistent five-step RPC learning path.

## Pocket Network integration

Pocket is the live data layer for every playground query.

- Endpoint pattern: `https://{chain-slug}.api.pocket.network`
- Endpoint and chain configuration: `src/lib/pocket.ts`
- Validated Pocket relay route: `src/app/api/rpc/route.ts`
- Learning UI, evidence view, and code generator:
  `src/components/pocket-pilot.tsx`

The judged demo does not silently fall back to another RPC provider. If Pocket
cannot be reached, the response panel displays a clear error and does not
invent chain data.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
pnpm lint
pnpm build
```

The live test flow has been verified against Pocket's Ethereum and Base public
endpoints using `eth_blockNumber` and `eth_gasPrice`.

## Team

- hombre98
- basti100

# poktpilot
