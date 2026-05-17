/**
 * CloudPress 미러링 Worker
 * 사이트 ID : e9fb2779-e78c-461d-956f-290f6f32e3da
 * GitHub    : choichoi3227-crypto/cp-e9fb2779-test100986
 *
 * 역할:
 *   - PHP_RUNNER Service Binding → php-wasm으로 WordPress 실행
 *   - KV 캐시 (비로그인 GET)
 *   - 정적 파일 → GitHub 레포 / WordPress CDN
 *   - _cache/ 정적 HTML 폴백 (GitHub Pages)
 */

const SITE_ID      = "e9fb2779-e78c-461d-956f-290f6f32e3da";
const GH_OWNER     = "choichoi3227-crypto";
const GH_REPO      = "cp-e9fb2779-test100986";
const GH_BRANCH    = "main";
const GH_PAGES_URL = "https://choichoi3227-crypto.github.io/cp-e9fb2779-test100986";

const STATIC_EXT  = /\.(css|js|jpg|jpeg|png|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf|map|txt|xml|json|pdf|zip|mp4|mp3|ogg|wav|webm|gz)$/i;
const SKIP_CACHE  = ["/wp-admin","/wp-login.php","/cart","/checkout","/my-account","/wp-cron.php","/xmlrpc.php"];
const BOT_RE      = /googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|slurp|duckduckbot|linkedinbot|whatsapp|telegram/i;
const SEC_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options":        "SAMEORIGIN",
  "Referrer-Policy":        "strict-origin-when-cross-origin",
};

function getSiteId(e)  { return e.SITE_ID   || SITE_ID;   }
function getOwner(e)   { return e.GH_OWNER  || GH_OWNER;  }
function getRepo(e)    { return e.GH_REPO   || GH_REPO;   }
function getToken(e)   { return e.GITHUB_TOKEN || "";      }
function getPages(e)   { return e.GH_PAGES_URL || GH_PAGES_URL || ""; }

async function kvGet(e,k)        { try{return await e.CACHE?.get(k);}        catch{return null;} }
async function kvGetBuf(e,k)     { try{return await e.CACHE?.get(k,"arrayBuffer");} catch{return null;} }
async function kvPut(e,k,v,ttl)  { try{await e.CACHE?.put(k,v,{expirationTtl:ttl||3600});}catch{} }

function mime(p) {
  const e = (p.split(".").pop()||"").toLowerCase();
  return ({css:"text/css",js:"application/javascript",mjs:"application/javascript",
    json:"application/json",html:"text/html;charset=utf-8",htm:"text/html;charset=utf-8",
    xml:"application/xml",svg:"image/svg+xml",png:"image/png",jpg:"image/jpeg",
    jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",avif:"image/avif",
    ico:"image/x-icon",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",
    eot:"application/vnd.ms-fontobject",otf:"font/otf",pdf:"application/pdf",
    zip:"application/zip",mp4:"video/mp4",mp3:"audio/mpeg",txt:"text/plain",
  })[e] || "application/octet-stream";
}

async function ghFetch(env, filePath) {
  const owner = getOwner(env), repo = getRepo(env), token = getToken(env);
  if (!owner || !repo) return null;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${GH_BRANCH}/${filePath}`;
  try {
    const r = await fetch(url, {
      headers: { ...(token ? {"Authorization":`Bearer ${token}`}:{}), "User-Agent":"CloudPress/8.0" },
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
    return r.ok ? r : null;
  } catch { return null; }
}

async function wpCoreFetch(filePath) {
  for (const base of [
    "https://cdn.jsdelivr.net/gh/WordPress/WordPress@master/",
    "https://raw.githubusercontent.com/WordPress/WordPress/master/",
  ]) {
    try {
      const r = await fetch(base + filePath, { cf: { cacheEverything: true, cacheTtl: 86400 } });
      if (r.ok) return r;
    } catch {}
  }
  return null;
}

// PHP_RUNNER Service Binding으로 WordPress 실행
async function runViaPhpRunner(req, env, ctx) {
  if (!env.PHP_RUNNER) return null;
  const url    = new URL(req.url);
  const method = req.method.toUpperCase();
  const siteId = getSiteId(env);
  const skipCache = SKIP_CACHE.some(p => url.pathname.startsWith(p))
    || (req.headers.get("Cookie")||"").includes("wordpress_logged_in");

  let stdin = "";
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    stdin = await req.text().catch(() => "");
  }

  const payload = {
    phpFile: url.pathname === "/" ? "/index.php" : url.pathname,
    phpEnv: {
      REQUEST_METHOD:       method,
      REQUEST_URI:          url.pathname + url.search,
      QUERY_STRING:         url.search.slice(1),
      HTTP_HOST:            url.hostname,
      SERVER_NAME:          url.hostname,
      SERVER_PORT:          "443",
      HTTPS:                "on",
      DOCUMENT_ROOT:        "/var/www/wordpress",
      SCRIPT_FILENAME:      `/var/www/wordpress${url.pathname === "/" ? "/index.php" : url.pathname}`,
      SCRIPT_NAME:          url.pathname === "/" ? "/index.php" : url.pathname,
      PHP_SELF:             url.pathname === "/" ? "/index.php" : url.pathname,
      GATEWAY_INTERFACE:    "CGI/1.1",
      SERVER_PROTOCOL:      "HTTP/1.1",
      HTTP_USER_AGENT:      req.headers.get("User-Agent") || "",
      HTTP_ACCEPT:          req.headers.get("Accept") || "",
      HTTP_ACCEPT_LANGUAGE: req.headers.get("Accept-Language") || "",
      HTTP_COOKIE:          req.headers.get("Cookie") || "",
      HTTP_REFERER:         req.headers.get("Referer") || "",
      CONTENT_TYPE:         req.headers.get("Content-Type") || "",
      CONTENT_LENGTH:       req.headers.get("Content-Length") || "",
      HTTP_AUTHORIZATION:   req.headers.get("Authorization") || "",
      HTTP_X_FORWARDED_FOR: req.headers.get("CF-Connecting-IP") || "",
      WP_HOME:              `https://${url.hostname}`,
      WP_SITEURL:           `https://${url.hostname}`,
    },
    stdin,
    siteConfig: {
      siteId,
      githubOwner: getOwner(env),
      githubRepo:  getRepo(env),
      githubToken: getToken(env),
    },
    skipCache,
  };

  try {
    const phpRes = await env.PHP_RUNNER.fetch(
      new Request("https://php-runner/run-wordpress", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })
    );
    if (!phpRes.ok && phpRes.status >= 500) return null;

    // 성공 HTML → KV 캐시
    if (!skipCache && method === "GET" && phpRes.ok &&
        phpRes.headers.get("Content-Type")?.includes("text/html")) {
      const html = await phpRes.clone().text();
      ctx.waitUntil(kvPut(env, `php:${siteId}:${url.pathname}${url.search}`, html, 3600));
    }
    return phpRes;
  } catch { return null; }
}

export default {
  async fetch(req, env, ctx) {
    const url    = new URL(req.url);
    const path   = url.pathname;
    const method = req.method.toUpperCase();
    const siteId = getSiteId(env);

    // CORS preflight
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-WP-Nonce",
    }});

    // 헬스체크
    if (path === "/_health") return new Response(
      JSON.stringify({ ok: true, site: siteId, engine: env.PHP_RUNNER ? "php-wasm" : "static" }),
      { headers: { "Content-Type": "application/json" } }
    );

    // 1. 정적 파일
    if (STATIC_EXT.test(path)) {
      const fp = path.startsWith("/") ? path.slice(1) : path;

      // wp-content → GitHub 레포
      if (path.startsWith("/wp-content/")) {
        const ck = `static:${siteId}:${fp}`;
        const cb = await kvGetBuf(env, ck);
        if (cb) return new Response(cb, { headers: { "Content-Type": mime(fp), "Cache-Control": "public,max-age=3600", "X-Cache": "HIT", ...SEC_HEADERS }});
        const r = await ghFetch(env, fp);
        if (r) {
          const b = await r.arrayBuffer();
          ctx.waitUntil(kvPut(env, ck, b, 3600));
          return new Response(b, { headers: { "Content-Type": mime(fp), "Cache-Control": "public,max-age=3600", ...SEC_HEADERS }});
        }
      }

      // wp-includes / wp-admin → GitHub 레포 → WordPress CDN
      if (path.startsWith("/wp-includes/") || path.startsWith("/wp-admin/")) {
        const gr = await ghFetch(env, fp);
        if (gr) { const b = await gr.arrayBuffer(); return new Response(b, { headers: { "Content-Type": mime(fp), "Cache-Control": "public,max-age=86400,immutable", ...SEC_HEADERS }}); }
        const cr = await wpCoreFetch(fp);
        if (cr) { const b = await cr.arrayBuffer(); return new Response(b, { headers: { "Content-Type": mime(fp), "Cache-Control": "public,max-age=86400,immutable", ...SEC_HEADERS }}); }
      }

      return new Response("Not Found", { status: 404 });
    }

    const isLoggedIn = (req.headers.get("Cookie") || "").includes("wordpress_logged_in");
    const cacheable  = method === "GET" && !SKIP_CACHE.some(p => path.startsWith(p)) && !isLoggedIn;

    // 2. 봇 프리렌더 캐시
    if (BOT_RE.test(req.headers.get("User-Agent") || "") && method === "GET") {
      const pr = await kvGet(env, `prerender:${siteId}:${path}${url.search}`);
      if (pr) return new Response(pr, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,max-age=300", "X-Cache": "PRERENDER", ...SEC_HEADERS }});
    }

    // 3. KV HTML 캐시 (비로그인 GET)
    if (cacheable) {
      const c = await kvGet(env, `php:${siteId}:${path}${url.search}`);
      if (c) return new Response(c, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,s-maxage=60,stale-while-revalidate=3600", "X-Cache": "HIT", ...SEC_HEADERS }});
    }

    // 4. PHP_RUNNER → WordPress 실행 (핵심)
    const phpRes = await runViaPhpRunner(req, env, ctx);
    if (phpRes) return phpRes;

    // 5. _cache/ 정적 HTML 폴백 (GitHub 레포)
    if (cacheable) {
      const cachePath = (path === "/" || path === "")
        ? "_cache/index.html"
        : `_cache${path.endsWith("/") ? path : path + "/"}index.html`;
      const cr = await ghFetch(env, cachePath);
      if (cr) {
        const html = await cr.text();
        ctx.waitUntil(kvPut(env, `html:${siteId}:${path}${url.search}`, html, 3600));
        return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,s-maxage=60,stale-while-revalidate=3600", "X-Cache": "GH-CACHE", ...SEC_HEADERS }});
      }
    }

    // 6. GitHub Pages 폴백
    const pagesBase = getPages(env);
    if (pagesBase && cacheable) {
      try {
        const r = await fetch(`${pagesBase}${path}`, { cf: { cacheEverything: true, cacheTtl: 300 }, headers: { "User-Agent": "CloudPress-Fallback/8.0" }});
        if (r.ok) return new Response(await r.text(), { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,max-age=60", "X-Fallback": "github-pages", ...SEC_HEADERS }});
      } catch {}
    }

    // 7. KV stale 캐시
    const stale = await kvGet(env, `php:${siteId}:${path}${url.search}`);
    if (stale) return new Response(stale, { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "public,max-age=30", "X-Fallback": "kv-stale", ...SEC_HEADERS }});

    // 8. 설치 완료 전 안내 (PHP_RUNNER 없음 + _cache 없음)
    const repoUrl    = (getOwner(env) && getRepo(env)) ? `https://github.com/${getOwner(env)}/${getRepo(env)}` : "";
    const actionsUrl = repoUrl ? `${repoUrl}/actions/workflows/install-wordpress.yml` : "";

    return new Response(
      "<!DOCTYPE html><html lang=\"ko\"><head><meta charset=\"UTF-8\">" +
      "<meta http-equiv=\"refresh\" content=\"30\">" +
      "<title>WordPress 준비 중</title>" +
      "<style>*{box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f0f0f1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}" +
      ".card{background:#fff;border:1px solid #c3c4c7;border-radius:4px;max-width:460px;width:100%;padding:40px;text-align:center}" +
      ".badge{background:#2271b1;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;display:inline-block;margin-bottom:16px}" +
      "h1{color:#1d2327;font-size:20px;margin:0 0 10px}p{color:#646970;font-size:14px;line-height:1.6}" +
      "a.btn{display:inline-block;background:#2271b1;color:#fff;text-decoration:none;padding:8px 18px;border-radius:3px;font-size:13px;margin:4px}" +
      ".note{font-size:12px;color:#a7aaad;margin-top:16px}</style></head>" +
      "<body><div class=\"card\">" +
      "<div class=\"badge\">WORDPRESS</div>" +
      "<h1>🔄 WordPress 설치 진행 중</h1>" +
      "<p>GitHub Actions가 WordPress를 설치하고 있습니다.<br>완료되면 자동으로 사이트가 열립니다.</p>" +
      (actionsUrl ? `<a class=\"btn\" href=\"${actionsUrl}\" target=\"_blank\">진행상황 보기</a>` : "") +
      (repoUrl    ? ` <a class=\"btn\" style=\"background:#6e7d88\" href=\"${repoUrl}\" target=\"_blank\">GitHub 레포</a>` : "") +
      "<p class=\"note\">30초마다 자동 새로고침</p>" +
      "</div></body></html>",
      { status: 503, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store", "Retry-After": "30" }}
    );
  }
};
