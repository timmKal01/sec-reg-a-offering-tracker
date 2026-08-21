import { log } from 'apify';

const UA = 'SecRegAOfferingTracker/0.1 (+contact: sec-rega-tracker-admin@example.com)';
const FTS_BASE = 'https://efts.sec.gov/LATEST/search-index';
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchWithRetry(url) {
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const res = await fetchWithTimeout(url);
            if (res.ok) return res;
            const retryable = res.status === 429 || res.status >= 500;
            lastErr = new Error(`SEC EDGAR request failed: ${res.status} ${res.statusText}`);
            if (!retryable) throw lastErr;
        } catch (err) {
            lastErr = err.name === 'AbortError'
                ? new Error(`SEC EDGAR request timed out (attempt ${attempt}/${MAX_ATTEMPTS})`)
                : err;
        }
        if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
            log.warning(`Retrying EDGAR request in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS}): ${lastErr.message}`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

/** Parses an EDGAR display name like "DESTINY GSG INC.  (CIK 0002140930)". */
function parseFiler(displayName) {
    const cikMatch = displayName?.match(/^(.*?)\s*\(CIK (\d+)\)\s*$/);
    if (!cikMatch) return { name: displayName ?? null, tickers: null, cik: null };
    const cik = cikMatch[2];
    const tickerMatch = cikMatch[1].match(/^(.*?)\s*\(([A-Z0-9,.\- ]+)\)\s*$/);
    if (tickerMatch) return { name: tickerMatch[1].trim(), tickers: tickerMatch[2], cik };
    return { name: cikMatch[1].trim(), tickers: null, cik };
}

export async function fetchFilings({ keyword, includeAmendments, startDate, endDate, limit }) {
    const params = new URLSearchParams({
        forms: '1-A',
        startdt: startDate.toISOString().slice(0, 10),
        enddt: endDate.toISOString().slice(0, 10),
        size: '100',
    });
    if (keyword) params.set('q', keyword);

    const res = await fetchWithRetry(`${FTS_BASE}?${params}`);
    const data = await res.json();
    const hits = data.hits?.hits ?? [];

    const byAccession = new Map();
    for (const hit of hits) {
        try {
            const s = hit?._source;
            if (!s || typeof s !== 'object' || !s.adsh) continue;
            if (!includeAmendments && s.form !== '1-A') continue;
            if (byAccession.has(s.adsh)) continue;
            byAccession.set(s.adsh, s);
        } catch (err) {
            log.warning(`Skipping malformed EDGAR hit: ${err.message}`);
        }
    }

    return [...byAccession.values()]
        .sort((a, b) => (b.file_date ?? '').localeCompare(a.file_date ?? ''))
        .slice(0, limit)
        .map((s) => {
            try {
                const filer = parseFiler(s.display_names?.[0]);
                const cikNum = s.ciks?.[0]?.replace(/^0+/, '') || s.ciks?.[0] || null;
                const accessionNoDashes = s.adsh.replace(/-/g, '');
                return {
                    accessionNumber: s.adsh,
                    form: s.form ?? null,
                    isAmendment: s.form !== '1-A',
                    issuerName: filer.name,
                    issuerCik: filer.cik,
                    issuerTickers: filer.tickers,
                    filingDate: s.file_date ?? null,
                    businessLocation: s.biz_locations?.[0] ?? null,
                    incorporatedIn: s.inc_states?.[0] ?? null,
                    sicCode: s.sics?.[0] ?? null,
                    offeringFileNumber: s.file_num?.[0] ?? null,
                    filingUrl: cikNum
                        ? `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNoDashes}-index.htm`
                        : null,
                };
            } catch (err) {
                log.warning(`Skipping malformed EDGAR record while mapping output: ${err.message}`);
                return null;
            }
        })
        .filter(Boolean);
}
