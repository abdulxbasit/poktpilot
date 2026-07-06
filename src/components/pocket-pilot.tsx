"use client";

import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Gauge,
  GraduationCap,
  Hexagon,
  History,
  Layers3,
  LoaderCircle,
  Menu,
  Network,
  PanelLeftClose,
  Play,
  Radio,
  Search,
  Server,
  Sparkles,
  Star,
  Globe,
  BookMarked,
  ChevronRight,
  TerminalSquare,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  CATEGORY_ORDER,
  CATEGORY_XP_BONUS,
  CHAINS,
  LEVELS,
  RECIPES,
  endpointFor,
  explainMethod,
  formatGwei,
  formatHexInteger,
  formatWei,
  getChain,
  getLevelInfo,
  getRecipe,
  isAddress,
  isTransactionHash,
  parseNaturalLanguage,
  type AllowedMethod,
  type RecipeCategory,
} from "@/lib/pocket";

type RpcPayload = {
  endpoint?: string;
  chain?: string;
  request?: {
    jsonrpc: string;
    method: AllowedMethod;
    params: unknown[];
    id: number;
  };
  response?: {
    jsonrpc?: string;
    result?: unknown;
    error?: { code?: number; message?: string };
    id?: number;
  };
  latencyMs?: number;
  timestamp?: string;
  error?: string;
};

type ViewMode = "playground" | "lessons";
type CodeLanguage = "curl" | "javascript" | "python" | "viem";

type XpToast = { id: number; amount: number; label?: string };

type AiExplanation = {
  whatThisDoes: string;
  howPoktPowersThis: string;
  suggestedRecipeNote: string;
  technicalDetails: string[];
};

type AiResponseData = {
  explanation: AiExplanation;
  recipeId: string;
  chainSlug: string;
  parameter?: string;
  source: "ai" | "local" | "local-fallback";
};

const STORAGE_KEY = "pocketpilot-progress-v1";
const XP_STORAGE_KEY = "pocketpilot-xp-v1";
const BONUS_STORAGE_KEY = "pocketpilot-bonuses-v1";

function readStoredProgress() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function readStoredXp() {
  try {
    const stored = window.localStorage.getItem(XP_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as number) : 0;
  } catch {
    return 0;
  }
}

function readStoredBonuses() {
  try {
    const stored = window.localStorage.getItem(BONUS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function getDecodedResult(
  method: AllowedMethod,
  result: unknown,
  nativeSymbol: string,
) {
  if (typeof result !== "string") {
    if (result === null) return "No matching transaction was found.";
    return result ? JSON.stringify(result, null, 2) : "No result";
  }

  if (method === "eth_blockNumber" || method === "eth_chainId") {
    return formatHexInteger(result);
  }
  if (method === "eth_getBalance") return formatWei(result, nativeSymbol);
  if (method === "eth_gasPrice") return formatGwei(result);
  if (method === "eth_getTransactionCount") return formatHexInteger(result);
  if (method === "eth_getCode") {
    if (result === "0x") return "0x — This is an EOA (wallet), not a contract.";
    return `${result.length} bytes of bytecode — This is a smart contract.`;
  }
  return result;
}

function createCodeSnippet(
  language: CodeLanguage,
  endpoint: string,
  method: AllowedMethod,
  params: unknown[],
) {
  const rpcBody = JSON.stringify(
    { jsonrpc: "2.0", method, params, id: 1 },
    null,
    2,
  );
  const inlineBody = JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 });

  if (language === "curl") {
    return `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '${inlineBody}'`;
  }
  if (language === "python") {
    return `import requests\n\nendpoint = "${endpoint}"\npayload = ${rpcBody.replaceAll("null", "None")}\n\nresponse = requests.post(endpoint, json=payload, timeout=12)\nprint(response.json())`;
  }
  if (language === "viem") {
    return `import { createPublicClient, http } from "viem";\n\nconst client = createPublicClient({\n  transport: http("${endpoint}"),\n});\n\nconst result = await client.request({\n  method: "${method}",\n  params: ${JSON.stringify(params)},\n});\n\nconsole.log(result);`;
  }
  return `const response = await fetch("${endpoint}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(${rpcBody}),\n});\n\nconst data = await response.json();\nconsole.log(data);`;
}

function getCategoryRecipes(category: RecipeCategory) {
  return RECIPES.filter((r) => r.category === category);
}

function isCategoryComplete(category: RecipeCategory, progress: string[]) {
  return getCategoryRecipes(category).every((r) => progress.includes(r.id));
}

export function PocketPilot() {
  const [view, setView] = useState<ViewMode>("playground");
  const [chainSlug, setChainSlug] = useState("eth");
  const [recipeId, setRecipeId] = useState("latest-block");
  const [parameter, setParameter] = useState("");
  const [prompt, setPrompt] = useState(
    "Show me the latest block on Ethereum",
  );
  const [payload, setPayload] = useState<RpcPayload | null>(null);
  const [history, setHistory] = useState<RpcPayload[]>([]);
  const [language, setLanguage] = useState<CodeLanguage>("curl");
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [xp, setXp] = useState(0);
  const [bonuses, setBonuses] = useState<string[]>([]);
  const [progressReady, setProgressReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [xpToasts, setXpToasts] = useState<XpToast[]>([]);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const toastIdRef = useRef(0);

  // AI response state
  const [aiResponse, setAiResponse] = useState<AiResponseData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Quiz state
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizBonusGranted, setQuizBonusGranted] = useState(false);
  const [prevRecipeId, setPrevRecipeId] = useState("latest-block");

  if (recipeId !== prevRecipeId) {
    setPrevRecipeId(recipeId);
    setQuizAnswer(null);
    setQuizBonusGranted(false);
  }

  const chain = getChain(chainSlug) ?? CHAINS[0];
  const recipe = getRecipe(recipeId) ?? RECIPES[0];

  const params = useMemo(() => {
    if (recipe.id === "wallet-balance" || recipe.id === "nonce-lookup" || recipe.id === "contract-code") {
      return recipe.id === "wallet-balance"
        ? [parameter || recipe.defaultParams[0], "latest"]
        : recipe.id === "nonce-lookup"
          ? [parameter || recipe.defaultParams[0], "latest"]
          : [parameter || recipe.defaultParams[0], "latest"];
    }
    if (recipe.id === "pending-nonce") return [parameter || recipe.defaultParams[0], "pending"];
    if (recipe.id === "transaction") return [parameter];
    return recipe.defaultParams;
  }, [parameter, recipe]);

  const validationError = useMemo(() => {
    if (
      (recipe.id === "wallet-balance" || recipe.id === "nonce-lookup" || recipe.id === "contract-code" || recipe.id === "pending-nonce") &&
      !isAddress(parameter) &&
      !isAddress(recipe.defaultParams[0] as string)
    ) {
      return parameter
        ? "Enter a 42-character EVM address."
        : null;
    }
    if (recipe.id === "transaction" && !isTransactionHash(parameter)) {
      return parameter
        ? "Enter a 66-character transaction hash."
        : "A transaction hash is required.";
    }
    return null;
  }, [parameter, recipe]);

  const compatibilityError =
    chain.family === "EVM"
      ? null
      : `${chain.name} is available through Pocket's ${chain.family} endpoint. The current lessons teach EVM JSON-RPC, so choose an EVM network to run this recipe.`;
  const queryError = compatibilityError ?? validationError;

  const code = compatibilityError
    ? `// ${chain.name} is available through Pocket.\n// ${chain.family}-specific learning recipes are coming next.\n\nconst endpoint = "${endpointFor(chain.slug)}";`
    : createCodeSnippet(
      language,
      endpointFor(chain.slug),
      recipe.method,
      params,
    );

  const levelInfo = getLevelInfo(xp);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setProgress(readStoredProgress());
      setXp(readStoredXp());
      setBonuses(readStoredBonuses());
      setProgressReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (progressReady) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [progress, progressReady]);

  useEffect(() => {
    if (progressReady) {
      window.localStorage.setItem(XP_STORAGE_KEY, JSON.stringify(xp));
    }
  }, [xp, progressReady]);

  useEffect(() => {
    if (progressReady) {
      window.localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(bonuses));
    }
  }, [bonuses, progressReady]);


  function addXpToast(amount: number, label?: string) {
    const id = ++toastIdRef.current;
    setXpToasts((prev) => [...prev, { id, amount, label }]);
    window.setTimeout(() => {
      setXpToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }

  function awardXp(amount: number, label?: string) {
    setXp((prev) => {
      const oldLevel = getLevelInfo(prev);
      const newXp = prev + amount;
      const newLevel = getLevelInfo(newXp);
      if (newLevel.level > oldLevel.level) {
        setLevelUpMsg(`Level up! You're now a ${newLevel.title}!`);
        window.setTimeout(() => setLevelUpMsg(null), 3500);
      }
      return newXp;
    });
    addXpToast(amount, label);
  }

  function chooseRecipe(id: string) {
    const nextRecipe = getRecipe(id);
    if (!nextRecipe) return;
    setRecipeId(id);
    setParameter(
      typeof nextRecipe.defaultParams[0] === "string" &&
        nextRecipe.defaultParams[0].startsWith("0x") &&
        nextRecipe.defaultParams[0].length === 42
        ? nextRecipe.defaultParams[0]
        : "",
    );
    setPayload(null);
    if (window.innerWidth < 900) setSidebarOpen(false);
  }

  async function planFromPrompt() {
    if (!prompt.trim()) return;
    setAiResponse(null);
    setAiError(null);
    setAiLoading(true);
    setView("playground");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt }),
      });

      if (!response.ok) {
        throw new Error(`AI returned ${response.status}`);
      }

      const data = (await response.json()) as AiResponseData;
      setAiResponse(data);

      // Auto-select the recipe and chain suggested by AI
      setChainSlug(data.chainSlug);
      chooseRecipe(data.recipeId);
      if (data.parameter) setParameter(data.parameter);
    } catch (err) {
      console.error("AI query failed, falling back:", err);
      // Fallback to local parsing
      const planned = parseNaturalLanguage(prompt);
      setChainSlug(planned.chain.slug);
      chooseRecipe(planned.recipe.id);
      if (planned.parameter) setParameter(planned.parameter);
      setAiError("AI couldn't respond — using smart keyword matching instead.");
    } finally {
      setAiLoading(false);
    }
  }

  async function runQuery() {
    if (queryError) return;
    setPayload(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: chain.slug,
            method: recipe.method,
            params,
          }),
        });
        const nextPayload = (await response.json()) as RpcPayload;
        setPayload(nextPayload);
        setHistory((current) => [nextPayload, ...current].slice(0, 5));
        if (!nextPayload.error && !nextPayload.response?.error) {
          const isNew = !progress.includes(recipe.id);
          if (isNew) {
            setProgress((current) =>
              current.includes(recipe.id) ? current : [...current, recipe.id],
            );
            awardXp(recipe.xpReward, recipe.title);
            // Check for category completion bonus
            const catRecipes = getCategoryRecipes(recipe.category);
            const willComplete = catRecipes
              .filter((r) => r.id !== recipe.id)
              .every((r) => progress.includes(r.id));
            const bonusKey = `cat-${recipe.category}`;
            if (willComplete && !bonuses.includes(bonusKey)) {
              window.setTimeout(() => {
                const bonus = CATEGORY_XP_BONUS[recipe.category];
                awardXp(bonus, `${recipe.category} Complete!`);
                setBonuses((prev) => [...prev, bonusKey]);
              }, 800);
            }
          }
        }
      } catch {
        setPayload({
          error: "The local API could not complete the request.",
          endpoint: endpointFor(chain.slug),
        });
      }
    });
  }

  function handleQuizAnswer(index: number) {
    if (quizAnswer !== null) return;
    setQuizAnswer(index);
    if (index === recipe.quizAnswerIndex && !quizBonusGranted) {
      setQuizBonusGranted(true);
      window.setTimeout(() => awardXp(20, "Quiz Bonus!"), 400);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const responseError = payload?.error ?? payload?.response?.error?.message;
  const result = payload?.response?.result;
  const decoded =
    result !== undefined
      ? getDecodedResult(recipe.method, result, chain.nativeSymbol)
      : null;

  const showQuiz =
    payload &&
    !isPending &&
    !responseError &&
    recipe.quizQuestion &&
    recipe.quizOptions;

  return (
    <main className="app-shell">
      {/* Level-up notification */}
      {levelUpMsg && (
        <div className="level-up-banner" aria-live="polite">
          <Trophy size={18} />
          {levelUpMsg}
        </div>
      )}

      {/* XP Toasts */}
      <div className="xp-toast-container" aria-live="polite" aria-atomic="false">
        {xpToasts.map((toast) => (
          <div key={toast.id} className="xp-toast">
            <Zap size={14} />
            <span>+{toast.amount} XP</span>
            {toast.label && <small>{toast.label}</small>}
          </div>
        ))}
      </div>

      <header className="mobile-header">
        <button
          className="icon-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          title="Open navigation"
        >
          <Menu size={19} />
        </button>
        <Brand compact />
        <div className="mobile-xp-hud">
          <XpHud xp={xp} levelInfo={levelInfo} compact />
        </div>
      </header>

      {sidebarOpen ? (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            title="Close navigation"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary">
          <button
            className={view === "playground" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("playground");
              setSidebarOpen(false);
            }}
          >
            <TerminalSquare size={17} />
            Playground
          </button>
          <button
            className={view === "lessons" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("lessons");
              setSidebarOpen(false);
            }}
          >
            <GraduationCap size={17} />
            Learning paths
            <span className="nav-count">
              {progress.length}/{RECIPES.length}
            </span>
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>RPC recipes</span>
            <span>{RECIPES.length}</span>
          </div>
          <div className="recipe-nav">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="recipe-nav-group">
                <div className="recipe-nav-category">{cat}</div>
                {RECIPES.filter((r) => r.category === cat).map((item) => {
                  const globalIndex = RECIPES.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      className={
                        recipe.id === item.id ? "recipe-link active" : "recipe-link"
                      }
                      onClick={() => {
                        chooseRecipe(item.id);
                        setView("playground");
                      }}
                    >
                      <span className="recipe-number">
                        {progress.includes(item.id) ? <Check size={12} /> : globalIndex + 1}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.skill}</small>
                      </span>
                      <span className="recipe-xp-pill">+{item.xpReward}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="pocket-route">
            <Radio size={16} />
            <div>
              <strong>Powered by POKT</strong>
              <span>Public RPC relay layer</span>
            </div>
          </div>
          <div className="sidebar-footer-links">
            <a
              href="https://docs.pocket.network/developers/api-reference/"
              target="_blank"
              rel="noreferrer"
            >
              API reference <ExternalLink size={13} />
            </a>
            <a
              href="https://discord.com/invite/pocket-network"
              target="_blank"
              rel="noreferrer"
              className="discord-link"
            >
              <DiscordIcon width="13" height="13" /> Discord community
            </a>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">
              {view === "playground" ? "RPC workspace" : "Guided curriculum"}
            </p>
            <h1>
              {view === "playground"
                ? "Learn the request. Trust the response."
                : "Build RPC intuition one query at a time."}
            </h1>
          </div>
          <div className="desktop-status">
            <XpHud xp={xp} levelInfo={levelInfo} />
          </div>
        </div>

        {view === "playground" ? (
          <>
            <section className="assistant-strip">
              <div className="assistant-mark">
                <Sparkles size={18} />
              </div>
              <label htmlFor="natural-query">
                <span>Describe the chain data you want</span>
                <div className="prompt-row">
                  <input
                    id="natural-query"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") planFromPrompt();
                    }}
                    placeholder="Try: Check this wallet balance on Base"
                  />
                  <button
                    className="secondary-button"
                    onClick={planFromPrompt}
                  >
                    Plan query <ArrowRight size={16} />
                  </button>
                </div>
              </label>
            </section>

            {/* ─── AI Response Panel ─────────────────────────────────── */}
            {aiLoading && (
              <section className="ai-response-panel ai-loading-state">
                <div className="ai-panel-header">
                  <div className="ai-panel-icon">
                    <Sparkles size={18} className="ai-spin" />
                  </div>
                  <div>
                    <strong>PocketPilot AI is thinking…</strong>
                    <p>Analyzing your query and finding the best recipe</p>
                  </div>
                </div>
                <div className="ai-skeleton">
                  <div className="ai-skeleton-line wide" />
                  <div className="ai-skeleton-line" />
                  <div className="ai-skeleton-line narrow" />
                </div>
              </section>
            )}

            {aiError && !aiResponse && (
              <section className="ai-response-panel ai-error-state">
                <div className="ai-panel-header">
                  <div className="ai-panel-icon fallback">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <strong>Smart match applied</strong>
                    <p>{aiError}</p>
                  </div>
                </div>
              </section>
            )}

            {aiResponse && !aiLoading && (
              <section className="ai-response-panel ai-visible">
                <button
                  className="ai-panel-close"
                  onClick={() => setAiResponse(null)}
                  aria-label="Close AI response"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>

                <div className="ai-layout-grid">
                  {/* Left Column: Core Concept & Specifications */}
                  <div className="ai-layout-left">
                    <div className="ai-header-inline">
                      <Sparkles size={14} className="ai-accent-icon" />
                      <span>Tutor insights</span>
                      <span className="ai-source-badge">
                        {aiResponse.source === "ai" ? "Gemini" : "Smart Match"}
                      </span>
                    </div>

                    <h2 className="ai-concept-title">Core concept</h2>
                    <p className="ai-text-desc">
                      {aiResponse.explanation.whatThisDoes}
                    </p>

                    <h3 className="ai-subtitle-specs">Technical specifications</h3>
                    <ul className="ai-specs-list">
                      {aiResponse.explanation.technicalDetails.map((detail, index) => (
                        <li key={index}>
                          <span className="ai-bullet" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column: Infrastructure & Practice pathway */}
                  <div className="ai-layout-right">
                    <div className="ai-card-right">
                      <div className="ai-header-inline">
                        <Globe size={13} className="ai-accent-icon-green" />
                        <span>POKT Infrastructure</span>
                      </div>
                      <p className="ai-text-desc-small">
                        {aiResponse.explanation.howPoktPowersThis}
                      </p>
                    </div>

                    <div className="ai-card-right highlight">
                      <div className="ai-header-inline">
                        <BookMarked size={13} className="ai-accent-icon-amber" />
                        <span>Practice pathway</span>
                      </div>
                      <p className="ai-text-desc-small">
                        {aiResponse.explanation.suggestedRecipeNote}
                      </p>
                      <button
                        className="ai-action-btn"
                        onClick={() => {
                          setAiResponse(null);
                          const target = document.querySelector(".composer-panel");
                          target?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        Start lesson
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Recipe info banner with XP reward */}
            <div className="recipe-meta-banner">
              <div className="recipe-meta-left">
                <span className={`category-badge cat-${recipe.category.toLowerCase().replace(/\s/g, "-")}`}>
                  {recipe.category}
                </span>
                <DifficultyStars difficulty={recipe.difficulty} />
              </div>
              <div className="recipe-xp-reward">
                <Zap size={14} />
                <span>+{recipe.xpReward} XP on completion</span>
                {progress.includes(recipe.id) && (
                  <span className="already-earned">
                    <Check size={12} /> Earned
                  </span>
                )}
              </div>
            </div>

            <div className="work-grid">
              <section
                className="composer-panel"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey) &&
                    !isPending &&
                    !queryError
                  ) {
                    event.preventDefault();
                    runQuery();
                  }
                }}
              >
                <div className="panel-heading">
                  <div>
                    <span className="panel-kicker">01 / Compose</span>
                    <h2>{recipe.title}</h2>
                    <p>{recipe.description}</p>
                  </div>
                  <div className="method-chip">{recipe.method}</div>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <span>Network</span>
                    <ChainSelector
                      value={chainSlug}
                      onChange={(slug) => {
                        setChainSlug(slug);
                        setPayload(null);
                      }}
                    />
                  </div>

                  <label className="field">
                    <span>Recipe</span>
                    <div className="select-wrap">
                      <BookOpen size={15} />
                      <select
                        value={recipeId}
                        onChange={(event) => chooseRecipe(event.target.value)}
                      >
                        {CATEGORY_ORDER.map((cat) => (
                          <optgroup key={cat} label={cat}>
                            {RECIPES.filter((r) => r.category === cat).map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title} (+{item.xpReward} XP)
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </label>
                </div>

                {recipe.paramLabel ? (
                  <label className="field parameter-field">
                    <span>{recipe.paramLabel}</span>
                    <div
                      className={`input-wrap ${validationError && parameter ? "invalid" : ""
                        }`}
                    >
                      <Search size={15} />
                      <input
                        value={parameter}
                        onChange={(event) => {
                          setParameter(event.target.value.trim());
                          setPayload(null);
                        }}
                        placeholder={recipe.paramPlaceholder}
                        spellCheck={false}
                      />
                      {parameter ? (
                        <button
                          className="clear-input"
                          onClick={() => setParameter("")}
                          aria-label="Clear parameter"
                          title="Clear parameter"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>
                    {validationError ? (
                      <small className="field-hint">{validationError}</small>
                    ) : null}
                  </label>
                ) : null}

                {compatibilityError ? (
                  <div className="compatibility-note">
                    <CircleHelp size={17} />
                    <div>
                      <strong>{chain.family} endpoint selected</strong>
                      <p>{compatibilityError}</p>
                    </div>
                  </div>
                ) : null}

                <div className="endpoint-row">
                  <div>
                    <Server size={15} />
                    <span>{endpointFor(chain.slug)}</span>
                  </div>
                  <span className="read-only">read only</span>
                </div>

                {compatibilityError ? (
                  <div className="protocol-preview">
                    <Network size={24} />
                    <div>
                      <span>Pocket endpoint available</span>
                      <strong>{endpointFor(chain.slug)}</strong>
                      <p>
                        Select an EVM network to compose and run the current
                        JSON-RPC lesson.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="request-preview">
                    <div className="code-header">
                      <span>JSON-RPC 2.0 request</span>
                      <span>POST</span>
                    </div>
                    <pre>
                      {JSON.stringify(
                        {
                          jsonrpc: "2.0",
                          method: recipe.method,
                          params,
                          id: 1,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}

                <button
                  className="run-button"
                  onClick={runQuery}
                  disabled={isPending || Boolean(queryError)}
                >
                  {isPending ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                  {isPending ? "Relaying through Pocket…" : "Run RPC request"}
                  <span className="run-xp-hint">
                    {progress.includes(recipe.id) ? "Already earned" : `+${recipe.xpReward} XP`}
                  </span>
                  <span>Ctrl/⌘ Enter</span>
                </button>
              </section>

              <section className="result-panel" aria-live="polite">
                <div className="panel-heading result-heading">
                  <div>
                    <span className="panel-kicker">02 / Understand</span>
                    <h2>Response evidence</h2>
                  </div>
                  {payload?.latencyMs ? (
                    <div className="latency">
                      <Zap size={14} />
                      {payload.latencyMs} ms
                    </div>
                  ) : null}
                </div>

                {!payload && !isPending ? (
                  <div className="empty-result">
                    <div className="empty-visual" aria-hidden="true">
                      <span className="relay-node node-a" />
                      <span className="relay-node node-b" />
                      <span className="relay-node node-c" />
                      <span className="relay-line line-a" />
                      <span className="relay-line line-b" />
                      <Network size={34} />
                    </div>
                    <h3>Ready to relay</h3>
                    <p>
                      Run the request to see Pocket&apos;s raw response,
                      decoded value, and a grounded explanation.
                    </p>
                    <div className="empty-facts">
                      <span>
                        <Check size={13} /> Standard JSON-RPC
                      </span>
                      <span>
                        <Check size={13} /> No API key
                      </span>
                      <span>
                        <Check size={13} /> Raw evidence
                      </span>
                    </div>
                  </div>
                ) : null}

                {isPending ? (
                  <div className="loading-result">
                    <div className="pulse-bar wide" />
                    <div className="pulse-bar" />
                    <div className="pulse-box" />
                    <div className="relay-progress">
                      <span />
                    </div>
                    <p>Routing the request through Pocket&apos;s relay layer…</p>
                  </div>
                ) : null}

                {payload && !isPending ? (
                  <div className="response-content">
                    {responseError ? (
                      <div className="error-banner">
                        <CircleHelp size={18} />
                        <div>
                          <strong>Request needs attention</strong>
                          <p>{responseError}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="decoded-result">
                        <span>{recipe.resultLabel}</span>
                        <strong>{decoded}</strong>
                        <small>
                          Returned by {payload.chain} through Pocket
                        </small>
                      </div>
                    )}

                    <div className="tutor-note">
                      <div className="tutor-icon">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <span>PocketPilot tutor</span>
                        <p>{explainMethod(recipe.method)}</p>
                      </div>
                    </div>

                    {/* Quiz panel */}
                    {showQuiz && (
                      <div className="quiz-panel">
                        <div className="quiz-header">
                          <Trophy size={16} />
                          <span>Quick quiz — earn +20 bonus XP</span>
                        </div>
                        <p className="quiz-question">{recipe.quizQuestion}</p>
                        <div className="quiz-options">
                          {recipe.quizOptions!.map((opt, i) => {
                            let cls = "quiz-option";
                            if (quizAnswer !== null) {
                              if (i === recipe.quizAnswerIndex) cls += " correct";
                              else if (i === quizAnswer) cls += " wrong";
                              else cls += " dimmed";
                            }
                            return (
                              <button
                                key={i}
                                className={cls}
                                onClick={() => handleQuizAnswer(i)}
                                disabled={quizAnswer !== null}
                              >
                                <span className="quiz-option-letter">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                {opt}
                                {quizAnswer !== null && i === recipe.quizAnswerIndex && (
                                  <Check size={14} className="quiz-check" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {quizAnswer !== null && (
                          <div className={`quiz-result ${quizAnswer === recipe.quizAnswerIndex ? "success" : "try-again"}`}>
                            {quizAnswer === recipe.quizAnswerIndex
                              ? "🎉 Correct! +20 XP bonus awarded."
                              : `Not quite — the correct answer is "${recipe.quizOptions![recipe.quizAnswerIndex!]}".`}
                          </div>
                        )}
                      </div>
                    )}

                    <details className="raw-response" open>
                      <summary>
                        <span>
                          <Code2 size={15} /> Raw JSON response
                        </span>
                        <ChevronDown size={15} />
                      </summary>
                      <pre>
                        {JSON.stringify(
                          payload.response ?? { error: payload.error },
                          null,
                          2,
                        )}
                      </pre>
                    </details>

                    <div className="evidence-row">
                      <span>
                        <Radio size={13} /> Pocket relay
                      </span>
                      <span>
                        <Gauge size={13} /> {payload.latencyMs ?? "—"} ms
                      </span>
                      <span>
                        <Activity size={13} />{" "}
                        {payload.timestamp
                          ? new Date(payload.timestamp).toLocaleTimeString()
                          : "Just now"}
                      </span>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <section className="code-panel">
              <div className="code-panel-top">
                <div>
                  <span className="panel-kicker">03 / Integrate</span>
                  <h2>Use this query in your app</h2>
                </div>
                <div className="code-actions">
                  <div className="language-tabs" role="tablist">
                    {(["curl", "javascript", "python", "viem"] as const).map(
                      (item) => (
                        <button
                          key={item}
                          className={language === item ? "active" : ""}
                          onClick={() => setLanguage(item)}
                          role="tab"
                          aria-selected={language === item}
                        >
                          {item === "javascript" ? "JS" : item}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className="icon-button copy-button"
                    onClick={copyCode}
                    aria-label="Copy code"
                    title="Copy code"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <pre className="integration-code">{code}</pre>
            </section>

            {history.length ? (
              <section className="history-strip">
                <div className="history-title">
                  <History size={15} />
                  Recent runs
                </div>
                <div className="history-items">
                  {history.map((item, index) => (
                    <button
                      key={`${item.timestamp ?? item.latencyMs}-${index}`}
                      onClick={() => setPayload(item)}
                    >
                      <span
                        className={
                          item.error || item.response?.error
                            ? "history-status error"
                            : "history-status"
                        }
                      />
                      <strong>{item.request?.method ?? "RPC request"}</strong>
                      <small>{item.latencyMs ?? "—"} ms</small>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <LearningPath
            progress={progress}
            xp={xp}
            bonuses={bonuses}
            levelInfo={levelInfo}
            onOpen={(id) => {
              chooseRecipe(id);
              setView("playground");
            }}
            onShare={(text) => {
              navigator.clipboard.writeText(text);
              addXpToast(0, "Rank copied to clipboard!");
            }}
          />
        )}
      </section>
    </main>
  );
}

// ─── XP HUD Component ─────────────────────────────────────────────────────────

function XpHud({
  xp,
  levelInfo,
  compact = false,
}: {
  xp: number;
  levelInfo: ReturnType<typeof getLevelInfo>;
  compact?: boolean;
}) {
  const nextLevel = LEVELS.find((l) => l.level === levelInfo.level + 1);

  return (
    <div className={`xp-hud ${compact ? "xp-hud-compact" : ""}`}>
      <div
        className="xp-level-badge"
        style={{ "--level-color": levelInfo.color } as CSSProperties}
        title={levelInfo.title}
      >
        <span>{levelInfo.level}</span>
      </div>
      <div className="xp-hud-info">
        {!compact && <span className="xp-level-title">{levelInfo.title}</span>}
        <div className="xp-bar-wrap">
          <div
            className="xp-bar-fill"
            style={{
              "--xp-progress": `${levelInfo.progress}%`,
              "--level-color": levelInfo.color,
            } as CSSProperties}
          />
        </div>
        <span className="xp-count">
          <Zap size={11} />
          {xp.toLocaleString()} XP
          {nextLevel && !compact && (
            <small> / {nextLevel.minXp.toLocaleString()}</small>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── Difficulty Stars ─────────────────────────────────────────────────────────

function DifficultyStars({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="difficulty-stars" title={`Difficulty: ${difficulty}/3`}>
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= difficulty ? "star-filled" : "star-empty"}
          fill={i <= difficulty ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

// ─── Chain Selector ────────────────────────────────────────────────────────────

function ChainSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = getChain(value) ?? getChain("eth")!;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredChains = CHAINS.filter((item) => {
    if (!normalizedSearch) return true;
    return (
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.slug.includes(normalizedSearch) ||
      item.family.toLowerCase().includes(normalizedSearch)
    );
  });
  const mainnets = filteredChains.filter((item) => !item.testnet);
  const testnets = filteredChains.filter((item) => item.testnet);

  function choose(slug: string) {
    onChange(slug);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="chain-selector">
      <button
        type="button"
        className="chain-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Image
          src={`/chains/${selected.logo}.png`}
          alt=""
          width={22}
          height={22}
          className="chain-logo"
        />
        <span className="chain-trigger-copy">
          <strong>{selected.name}</strong>
          <small>
            {selected.family}
            {selected.testnet ? " · Testnet" : ""}
          </small>
        </span>
        <ChevronDown size={16} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="chain-menu-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close network selector"
          />
          <div className="chain-menu">
            <div className="chain-search">
              <Search size={15} />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${CHAINS.length} Pocket networks`}
                aria-label="Search Pocket networks"
              />
              <span>{filteredChains.length}</span>
            </div>
            <div className="chain-options" role="listbox" aria-label="Pocket networks">
              {mainnets.length ? (
                <ChainGroup
                  label="Mainnets"
                  chains={mainnets}
                  selectedSlug={selected.slug}
                  onSelect={choose}
                />
              ) : null}
              {testnets.length ? (
                <ChainGroup
                  label="Testnets"
                  chains={testnets}
                  selectedSlug={selected.slug}
                  onSelect={choose}
                />
              ) : null}
              {!filteredChains.length ? (
                <div className="chain-empty">No Pocket network matches that search.</div>
              ) : null}
            </div>
            <a
              className="chain-menu-footer"
              href="https://api.pocket.network/"
              target="_blank"
              rel="noreferrer"
            >
              View Pocket API portal <ExternalLink size={13} />
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ChainGroup({
  label,
  chains,
  selectedSlug,
  onSelect,
}: {
  label: string;
  chains: typeof CHAINS;
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="chain-group">
      <div className="chain-group-label">
        <span>{label}</span>
        <span>{chains.length}</span>
      </div>
      {chains.map((item) => (
        <button
          type="button"
          key={item.slug}
          className={item.slug === selectedSlug ? "chain-option selected" : "chain-option"}
          onClick={() => onSelect(item.slug)}
          role="option"
          aria-selected={item.slug === selectedSlug}
        >
          <Image
            src={`/chains/${item.logo}.png`}
            alt=""
            width={26}
            height={26}
            className="chain-logo"
          />
          <span className="chain-option-copy">
            <strong>{item.name}</strong>
            <small>{item.slug}.api.pocket.network</small>
          </span>
          <span className={`protocol-badge protocol-${item.family.toLowerCase()}`}>
            {item.family}
          </span>
          {item.slug === selectedSlug ? <Check size={15} /> : null}
        </button>
      ))}
    </div>
  );
}

// ─── Brand ────────────────────────────────────────────────────────────────────

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark">
        <Hexagon size={22} strokeWidth={2.4} />
        <span />
      </div>
      <div>
        <strong>POKTPilot</strong>
        {!compact ? <small>RPC learning lab</small> : null}
      </div>
    </div>
  );
}


// ─── Learning Path ────────────────────────────────────────────────────────────

function LearningPath({
  progress,
  xp,
  bonuses,
  levelInfo,
  onOpen,
  onShare,
}: {
  progress: string[];
  xp: number;
  bonuses: string[];
  levelInfo: ReturnType<typeof getLevelInfo>;
  onOpen: (id: string) => void;
  onShare: (text: string) => void;
}) {
  const completePercent = Math.round((progress.length / RECIPES.length) * 100);
  const nextLevel = LEVELS.find((l) => l.level === levelInfo.level + 1);

  return (
    <div className="learning-layout">
      {/* XP Progress Summary */}
      <section className="xp-progress-summary">
        <div className="xp-summary-left">
          <div
            className="xp-level-badge-large"
            style={{ "--level-color": levelInfo.color } as CSSProperties}
          >
            <span>{levelInfo.level}</span>
          </div>
          <div>
            <span className="panel-kicker">Your rank</span>
            <strong className="xp-summary-title">{levelInfo.title}</strong>
            <p className="xp-summary-sub">
              {xp.toLocaleString()} XP total
              {nextLevel && ` · ${(nextLevel.minXp - xp).toLocaleString()} to next level`}
            </p>
          </div>
        </div>
        <div className="xp-summary-right">
          <div className="xp-summary-bar-wrap">
            <div
              className="xp-summary-bar"
              style={{
                "--xp-progress": `${levelInfo.progress}%`,
                "--level-color": levelInfo.color,
              } as CSSProperties}
            />
          </div>
          <div className="xp-level-labels">
            {LEVELS.map((l) => (
              <span
                key={l.level}
                className={l.level <= levelInfo.level ? "reached" : ""}
                style={{ "--level-color": l.color } as CSSProperties}
                title={l.title}
              >
                {l.level}
              </span>
            ))}
          </div>
        </div>
        <div className="xp-summary-share">
          <button
            type="button"
            className="discord-share-button"
            onClick={() => {
              const text = `I am a Level ${levelInfo.level} ${levelInfo.title} in POKTPilot with ${xp} XP! 🚀 Join the learning lab and power your apps with POKT: https://discord.com/invite/pocket-network`;
              onShare(text);
              window.open("https://discord.com/invite/pocket-network", "_blank", "noopener,noreferrer");
            }}
          >
            <DiscordIcon width="14" height="14" />
            <span>Share Rank</span>
          </button>
          <button
            type="button"
            className="download-card-button"
            onClick={() => downloadRankCard(xp, levelInfo)}
          >
            <Download size={14} />
            <span>Download Card</span>
          </button>
        </div>
      </section>

      {/* Progress band */}
      <section className="progress-band">
        <div>
          <span className="panel-kicker">Overall progress</span>
          <strong>{completePercent}%</strong>
          <p>
            {progress.length} of {RECIPES.length} live RPC skills completed
          </p>
        </div>
        <div
          className="progress-ring"
          style={{ "--progress": completePercent } as CSSProperties}
        >
          <span>{progress.length}/{RECIPES.length}</span>
        </div>
      </section>

      {/* Lessons grouped by category */}
      {CATEGORY_ORDER.map((cat) => {
        const catRecipes = getCategoryRecipes(cat);
        const catComplete = isCategoryComplete(cat, progress);
        const bonusKey = `cat-${cat}`;
        const bonusEarned = bonuses.includes(bonusKey);
        const catDone = catRecipes.filter((r) => progress.includes(r.id)).length;

        return (
          <section key={cat} className="lesson-category-section">
            <div className="lesson-category-header">
              <div className="lesson-category-info">
                <span className={`category-badge cat-${cat.toLowerCase().replace(/\s/g, "-")}`}>
                  {cat}
                </span>
                <span className="category-progress-text">
                  {catDone}/{catRecipes.length} complete
                </span>
                {catComplete && (
                  <span className="category-complete-badge">
                    <Trophy size={13} /> Complete
                  </span>
                )}
              </div>
              <div className="category-bonus-pill">
                <Zap size={12} />
                {bonusEarned ? (
                  <span className="bonus-earned">+{CATEGORY_XP_BONUS[cat]} XP bonus earned!</span>
                ) : (
                  <span>+{CATEGORY_XP_BONUS[cat]} XP bonus for finishing</span>
                )}
              </div>
            </div>

            <div className="lesson-list">
              {catRecipes.map((recipe) => {
                const complete = progress.includes(recipe.id);
                const globalIndex = RECIPES.indexOf(recipe);
                return (
                  <article className="lesson-row" key={recipe.id}>
                    <div className={`lesson-step ${complete ? "complete" : ""}`}>
                      {complete ? <Check size={16} /> : globalIndex + 1}
                    </div>
                    <div className="lesson-copy">
                      <div>
                        <span>{recipe.skill}</span>
                        <h2>{recipe.title}</h2>
                      </div>
                      <p>{recipe.description}</p>
                      <div className="lesson-meta">
                        <DifficultyStars difficulty={recipe.difficulty} />
                        {recipe.quizQuestion && (
                          <span className="has-quiz-badge">
                            <Trophy size={11} /> Has quiz
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="lesson-right">
                      <div className="lesson-method">{recipe.method}</div>
                      <div className={`lesson-xp-pill ${complete ? "earned" : ""}`}>
                        <Zap size={11} />
                        {complete ? "Earned" : `+${recipe.xpReward} XP`}
                      </div>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => onOpen(recipe.id)}
                    >
                      {complete ? "Practice again" : "Start lesson"}
                      <ArrowRight size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="concept-grid">
        <div>
          <Layers3 size={20} />
          <h3>One endpoint pattern</h3>
          <p>
            Switch networks by changing the chain slug while keeping the JSON-RPC
            workflow familiar.
          </p>
        </div>
        <div>
          <Clipboard size={20} />
          <h3>Evidence first</h3>
          <p>
            Keep the request and raw response beside every explanation so the
            result remains auditable.
          </p>
        </div>
        <div>
          <Code2 size={20} />
          <h3>Learn, then ship</h3>
          <p>
            Move from a guided query to reusable application code without
            rebuilding the request by hand.
          </p>
        </div>
      </section>
    </div>
  );
}

// ─── Rank Card Canvas Exporter ───────────────────────────────────────────────

function downloadRankCard(xp: number, levelInfo: ReturnType<typeof getLevelInfo>) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 450;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 450);
  grad.addColorStop(0, "#17181b");
  grad.addColorStop(1, "#0a0c10");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 450);

  // Subtle grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  const gridSize = 25;
  for (let x = 0; x < 800; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 450);
    ctx.stroke();
  }
  for (let y = 0; y < 450; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(800, y);
    ctx.stroke();
  }

  // Draw Hexagon Brand Mark
  ctx.strokeStyle = "#b8f24a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  const hexX = 80;
  const hexY = 70;
  const size = 20;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = hexX + size * Math.cos(angle);
    const y = hexY + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // POKTPilot Brand Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Segoe UI, Arial, sans-serif";
  ctx.fillText("POKTPilot", 115, 68);

  ctx.fillStyle = "#686b73";
  ctx.font = "11px Consolas, monospace";
  ctx.fillText("RPC LEARNING LAB", 115, 83);

  // Decorative border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 760, 410);

  // Certificate text
  ctx.fillStyle = "#969aa4";
  ctx.font = "bold 12px Consolas, monospace";
  ctx.fillText("POKTPilot SPECIALIST CERTIFICATE", 80, 160);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Segoe UI, Arial, sans-serif";
  ctx.fillText(levelInfo.title, 80, 210);

  // Draw Level Badge (Glow + Circle)
  const badgeX = 640;
  const badgeY = 225;
  const badgeRadius = 60;

  // Glow
  const glowGrad = ctx.createRadialGradient(badgeX, badgeY, 10, badgeX, badgeY, badgeRadius + 20);
  glowGrad.addColorStop(0, `${levelInfo.color}33`);
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius + 20, 0, Math.PI * 2);
  ctx.fill();

  // Solid Badge
  ctx.fillStyle = levelInfo.color;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Level Number
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(levelInfo.level), badgeX, badgeY - 5);

  ctx.font = "bold 10px Segoe UI, Arial, sans-serif";
  ctx.fillText("LEVEL", badgeX, badgeY + 22);

  // Reset text alignment
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // XP Progress Bar
  const barX = 80;
  const barY = 270;
  const barWidth = 440;
  const barHeight = 8;

  ctx.fillStyle = "#2a2d34";
  ctx.beginPath();
  // Using simple rectangle with rounded rect fallback
  ctx.rect(barX, barY, barWidth, barHeight);
  ctx.fill();

  // Fill
  ctx.fillStyle = levelInfo.color;
  ctx.beginPath();
  const fillWidth = (barWidth * levelInfo.progress) / 100;
  ctx.rect(barX, barY, fillWidth, barHeight);
  ctx.fill();

  // XP Counters
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Consolas, monospace";
  ctx.fillText(`${xp.toLocaleString()} XP`, 80, 312);

  ctx.fillStyle = "#686b73";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(`Progress: ${levelInfo.progress}% towards next rank`, 200, 310);

  // Footer text
  ctx.fillStyle = "#969aa4";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText("Learn the request. Trust the response.", 80, 385);

  ctx.fillStyle = "#b8f24a";
  ctx.font = "bold 11px Consolas, monospace";
  ctx.fillText("POWERED BY POKT NETWORK", 80, 403);

  // Trigger download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `poktpilot-rank-${levelInfo.title.toLowerCase().replace(/\s/g, "-")}.png`;
  link.href = dataUrl;
  link.click();
}

// ─── Discord Icon Component ──────────────────────────────────────────────────

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 127.14 96.36" fill="currentColor" {...props}>
      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,50.75,124.23,27.87,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
    </svg>
  );
}
