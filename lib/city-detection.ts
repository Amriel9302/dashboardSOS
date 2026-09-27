export type CityDetection = {
  city: string | null;
  neighborhood: string | null;
  confidence: number;
  source: "texto_direto" | "bairro" | "fuzzy" | "desconhecido";
};

type CityDef = {
  city: string;
  aliases: string[];
};

const CITY_DEFS: CityDef[] = [
  { city: "Ribeirão Preto", aliases: ["ribeirao preto", "ribeirao", "rp"] },
  { city: "Sertãozinho", aliases: ["sertaozinho"] },
  { city: "Cravinhos", aliases: ["cravinhos"] },
  { city: "Serrana", aliases: ["serrana"] },
  { city: "Jardinópolis", aliases: ["jardinopolis"] },
  { city: "Brodowski", aliases: ["brodowski"] },
  { city: "Batatais", aliases: ["batatais"] },
  { city: "Dumont", aliases: ["dumont"] },
  { city: "Pradópolis", aliases: ["pradopolis"] },
  { city: "Guatapará", aliases: ["guatapara"] },
  { city: "Barrinha", aliases: ["barrinha"] },
  { city: "Pontal", aliases: ["pontal"] },
  { city: "Pitangueiras", aliases: ["pitangueiras"] },
  { city: "Jaboticabal", aliases: ["jaboticabal"] },
  { city: "Monte Alto", aliases: ["monte alto"] },
  { city: "Cajuru", aliases: ["cajuru"] },
  { city: "Santa Rosa de Viterbo", aliases: ["santa rosa de viterbo", "santa rosa"] },
  { city: "São Simão", aliases: ["sao simao"] },
  { city: "Luiz Antônio", aliases: ["luiz antonio"] },
];

const NEIGHBORHOODS: Record<string, string> = {
  "jardim paulista": "Ribeirão Preto",
  "jardim iraja": "Ribeirão Preto",
  "jardim botanico": "Ribeirão Preto",
  "campos eliseos": "Ribeirão Preto",
  "alto da boa vista": "Ribeirão Preto",
  "nova alianca": "Ribeirão Preto",
  "city ribeirao": "Ribeirão Preto",
  "sumarezinho": "Ribeirão Preto",
  "ipiranga": "Ribeirão Preto",
  "bonfim paulista": "Ribeirão Preto",
};

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function containsAlias(text: string, alias: string): boolean {
  if (alias.length <= 2) {
    return new RegExp("(^|\\s)" + escapeRegExp(alias) + "(\\s|$)").test(text);
  }
  return text.includes(alias);
}

function levenshtein(a: string, b: string): number {
  const rows = b.length + 1;
  const cols = a.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

function ngrams(words: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= words.length - size; i++) {
    out.push(words.slice(i, i + size).join(" "));
  }
  return out;
}

export function detectCityAndNeighborhood(rawText: string): CityDetection {
  const text = normalizeText(rawText);
  if (!text) {
    return { city: null, neighborhood: null, confidence: 0, source: "desconhecido" };
  }

  for (const def of CITY_DEFS) {
    for (const alias of def.aliases) {
      if (containsAlias(text, alias)) {
        const neighborhood = Object.keys(NEIGHBORHOODS).find((n) => text.includes(n)) ?? null;
        return {
          city: def.city,
          neighborhood: neighborhood
            ? neighborhood.replace(/\b\w/g, (c) => c.toUpperCase())
            : null,
          confidence: 1,
          source: "texto_direto",
        };
      }
    }
  }

  for (const [neighborhood, city] of Object.entries(NEIGHBORHOODS)) {
    if (text.includes(neighborhood)) {
      return {
        city,
        neighborhood: neighborhood.replace(/\b\w/g, (c) => c.toUpperCase()),
        confidence: 0.98,
        source: "bairro",
      };
    }
  }

  const words = text.split(" ").filter(Boolean);
  let best: { city: string; score: number } | undefined;

  for (const def of CITY_DEFS) {
    for (const alias of def.aliases.filter((a) => a.length >= 5)) {
      const aliasWords = alias.split(" ").length;
      for (const candidate of ngrams(words, aliasWords)) {
        const score = similarity(candidate, alias);
        if (score >= 0.82 && (!best || score > best.score)) {
          best = { city: def.city, score };
        }
      }
    }
  }

  if (best) {
    return {
      city: best.city,
      neighborhood: null,
      confidence: Number(best.score.toFixed(2)),
      source: "fuzzy",
    };
  }

  return { city: null, neighborhood: null, confidence: 0, source: "desconhecido" };
}
