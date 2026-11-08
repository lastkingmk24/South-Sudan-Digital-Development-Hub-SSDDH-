/**
 * A small, dependency-free retrieval engine (BM25) over the approved knowledge
 * base in content.js.
 *
 * Design rules that match the project's promise:
 *   - answers are assembled only from approved document sections;
 *   - every answer carries citations (document + section);
 *   - when retrieval confidence is too low the assistant refuses instead of
 *     guessing;
 *   - everything runs in the browser, nothing is uploaded.
 */

const STOPWORDS = new Set(
  `a an and are as at be been being but by can could did do does doing for from had has have having
   he her here hers him his how i if in into is it its just me more most my no not of on or our out
   over own same she should so some such than that the their them then there these they this those
   through to too under until up very was we were what when where which while who whom why will with
   would you your yours about after before between during i'm it's dont don't doesnt doesn't
   i need get know tell want please help much many long take make use used using`
    .split(/\s+/)
    .filter(Boolean),
);

const ARABIC_STOPWORDS = new Set(
  'من في على إلى عن مع هذا هذه ذلك تلك هو هي هم أن إن كان كانت يكون التي الذي الذين ما لا لم لن هل ثم أو و لكن كما كل بعض أي كيف متى اين أين ماذا لماذا يمكن يجب عند لدي لدي هل'.split(
    /\s+/,
  ),
);

/** Arabic → English expansion so an Arabic question can retrieve English documents. */
const CROSS_LINGUAL = {
  صحه: 'health',
  صحيه: 'health',
  رعايه: 'care',
  مستشفى: 'hospital',
  علاج: 'treatment',
  دواء: 'medicine',
  تطعيم: 'immunisation',
  مياه: 'water',
  بئر: 'borehole',
  مضخه: 'pump',
  مدرسه: 'school',
  مدارس: 'school',
  تعليم: 'education',
  طالب: 'child',
  اطفال: 'child',
  طفل: 'child',
  طفلي: 'child',
  اولاد: 'child',
  اسجل: 'register',
  يسجل: 'register',
  نسجل: 'register',
  تسجيل: 'registration',
  سجل: 'register',
  عمل: 'business',
  اعمال: 'business',
  تجاري: 'business',
  ترخيص: 'licence',
  رخصه: 'licence',
  مواليد: 'birth children',
  مولود: 'birth',
  مستند: 'documents',
  وثيقه: 'documents',
  تصريح: 'licence permit',
  شركه: 'business',
  شركات: 'business',
  هويه: 'identity',
  وطني: 'national',
  وطنيه: 'national',
  شهاده: 'certificate',
  ميلاد: 'birth',
  بلاغ: 'report',
  بلاغات: 'report',
  شكوى: 'complaint',
  شكاوي: 'complaint',
  ارض: 'land',
  عقار: 'property',
  نزاع: 'dispute',
  زراعه: 'agriculture',
  مزارع: 'farmer',
  بذور: 'seed',
  قانوني: 'legal',
  قانونيه: 'legal',
  محكمه: 'court',
  خصوصيه: 'privacy',
  بيانات: 'data',
  توثيق: 'verification',
  موثق: 'verified',
  مجاني: 'free',
  رسوم: 'fee',
  اوراق: 'documents',
  مستندات: 'documents certifications documents',
  وثائق: 'documents',
  اجراء: 'process',
  اجراءات: 'process',
  خطوات: 'steps',
  كم: 'how',
  متى: 'when',
};

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627') // alef variants → alef
    .replace(/\u0649/g, '\u064A') // alef maksura → ya
    .replace(/\u0629/g, '\u0647') // ta marbuta → ha
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(token) {
  if (token.length <= 3) return token;
  if (/^[\u0600-\u06FF]+$/.test(token)) {
    return token.replace(/^ال/, '').replace(/(ات|ون|ين|ها|هم|يه)$/, '') || token;
  }
  return token
    .replace(/(ations|ation|ings|ing|ies|ied|ers|er|ed|es|s)$/, (m) => (m === 'ies' ? 'y' : ''))
    .replace(/(.)\1$/, '$1');
}

export function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !ARABIC_STOPWORDS.has(w))
    .map(stem);
}

/**
 * Arabic attaches conjunctions and prepositions to the front of words
 * (و، ب، ل، ف، ك، ال…), so "لتسجيل" and "المستندات" must resolve to the same
 * concepts as "تسجيل" and "مستندات".
 */
const ARABIC_PREFIXES = ['وال', 'بال', 'كال', 'فال', 'ال', 'و', 'ب', 'ل', 'ف', 'ك'];

function stripArabicPrefix(token) {
  for (const prefix of ARABIC_PREFIXES) {
    if (token.startsWith(prefix) && token.length - prefix.length >= 3) return token.slice(prefix.length);
  }
  return token;
}

/** Adds English equivalents for Arabic query tokens. */
export function expandQuery(text) {
  const base = tokenize(text);
  const extra = [];
  for (const raw of normalize(text).split(' ')) {
    const candidates = [raw, stripArabicPrefix(raw)];
    const bare = raw.replace(/^ال/, '');
    if (bare !== raw) candidates.push(bare);
    for (const candidate of candidates) {
      const mapped = CROSS_LINGUAL[candidate];
      if (mapped) {
        extra.push(...tokenize(mapped));
        break;
      }
    }
  }
  return [...new Set([...base, ...extra])];
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);
}

export class KnowledgeIndex {
  constructor(documents) {
    this.documents = documents;
    this.passages = [];
    for (const doc of documents) {
      for (const section of doc.sections) {
        // The heading and title are repeated so a section that is *about* the
        // topic outranks sections that merely mention it.
        const body = `${doc.title} ${doc.title} ${section.heading} ${section.heading} ${section.text}`;
        const tokens = tokenize(body);
        const tf = new Map();
        for (const tk of tokens) tf.set(tk, (tf.get(tk) || 0) + 1);
        this.passages.push({
          docId: doc.id,
          docTitle: doc.title,
          authority: doc.authority,
          approvedOn: doc.approvedOn,
          sectionId: section.id,
          heading: section.heading,
          text: section.text,
          tokens,
          tf,
          length: tokens.length,
          vector: tf,
        });
      }
    }
    this.avgLength =
      this.passages.reduce((sum, p) => sum + p.length, 0) / Math.max(this.passages.length, 1);
    this.df = new Map();
    for (const p of this.passages) {
      for (const term of new Set(p.tokens)) this.df.set(term, (this.df.get(term) || 0) + 1);
    }
  }

  idf(term) {
    const n = this.passages.length;
    const df = this.df.get(term) || 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  /** BM25 scoring for a single passage. */
  score(passage, terms, k1 = 1.5, b = 0.75) {
    let total = 0;
    const matched = [];
    for (const term of terms) {
      const freq = passage.tf.get(term) || 0;
      if (!freq) continue;
      matched.push(term);
      const norm = 1 - b + b * (passage.length / this.avgLength);
      total += this.idf(term) * ((freq * (k1 + 1)) / (freq + k1 * norm));
    }
    return { score: total, matched };
  }

  search(query, { limit = 4 } = {}) {
    const terms = expandQuery(query);
    if (!terms.length) return { terms, results: [], coverage: 0 };
    const scored = this.passages
      .map((p) => {
        const { score, matched } = this.score(p, terms);
        return { passage: p, score, matched };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = scored.length ? scored[0].score : 0;
    const termCoverage = best
      ? new Set(scored[0].matched).size / new Set(terms).size
      : 0;
    const results = scored.slice(0, limit).map((r) => ({
      ...r,
      confidence: best ? r.score / best : 0,
    }));
    return { terms, results, coverage: termCoverage, topScore: best };
  }

  /**
   * Extractive answer with citations; refuses when confidence is too low.
   * @returns {{refused: boolean, answer?: string, citations?: Array, confidence?: number}}
   */
  answer(query) {
    const { terms, results, coverage } = this.search(query, { limit: 5 });
    const strong = results.filter((r) => r.confidence >= 0.45).slice(0, 3);
    const confident =
      strong.length > 0 && (coverage >= 0.45 || strong[0].matched.length >= 2) && strong[0].score > 2.2;

    if (!confident) {
      return { refused: true, reason: 'no_confident_passage', terms };
    }

    const bestPassage = strong[0].passage;
    const sentences = splitSentences(bestPassage.text)
      .map((sentence) => {
        const tokens = new Set(tokenize(sentence));
        const hits = terms.filter((term) => tokens.has(term)).length;
        return { sentence, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    const picked = (sentences.length ? sentences : [{ sentence: bestPassage.text }])
      .slice(0, 2)
      .map((s) => s.sentence);
    if (picked.length) picked[0] = picked[0].charAt(0).toUpperCase() + picked[0].slice(1);

    const citations = [];
    const seenSections = new Set();
    for (const result of strong) {
      if (citations.length >= 3) break;
      const key = `${result.passage.docId}:${result.passage.sectionId}`;
      if (seenSections.has(key)) continue;
      seenSections.add(key);
      citations.push({
        n: citations.length + 1,
        docId: result.passage.docId,
        docTitle: result.passage.docTitle,
        authority: result.passage.authority,
        approvedOn: result.passage.approvedOn,
        sectionId: result.passage.sectionId,
        heading: result.passage.heading,
        snippet: excerpt(result.passage.text, terms),
        confidence: result.confidence,
      });
    }

    return {
      refused: false,
      answer: picked.join(' '),
      citations,
      confidence: strong[0].confidence,
      matchedSections: results.length,
      terms,
    };
  }
}

/** Returns a citation snippet centred on the first query hit. */
function excerpt(text, terms, maxLength = 240) {
  if (text.length <= maxLength) return text;
  const lower = normalize(text);
  let hitAt = -1;
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at !== -1 && (hitAt === -1 || at < hitAt)) hitAt = at;
  }
  if (hitAt === -1) return `${text.slice(0, maxLength).trim()}…`;
  const start = Math.max(0, hitAt - 60);
  const slice = text.slice(start, start + maxLength).trim();
  return `${start > 0 ? '…' : ''}${slice}${start + maxLength < text.length ? '…' : ''}`;
}

export function buildIndex(documents) {
  return new KnowledgeIndex(documents);
}
