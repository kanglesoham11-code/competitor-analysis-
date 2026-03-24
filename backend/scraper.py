import requests
from bs4 import BeautifulSoup
from ddgs import DDGS
import asyncio
import json
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

REDDIT_HEADERS = {
    "User-Agent": "CompetitorIntelBot/1.0 (research tool)",
    "Accept": "application/json",
}

BLOCKED = ["linkedin.com", "facebook.com", "twitter.com", "instagram.com", "tiktok.com"]

# ── CORE SEARCH ────────────────────────────────────────────────────────────
def ddg_search(query: str, max_results: int = 6) -> list:
    try:
        time.sleep(0.5)
        with DDGS() as d:
            results = list(d.text(query, max_results=max_results))
        return [r for r in results if not any(b in r.get("href","") for b in BLOCKED)]
    except Exception as e:
        return []

def ddg_news(query: str, max_results: int = 5) -> list:
    try:
        with DDGS() as d:
            return list(d.news(query, max_results=max_results))
    except:
        return []

def format_results(results: list, max_per: int = 500) -> str:
    lines = []
    for r in results:
        title = r.get("title", "")
        url   = r.get("href", r.get("url", ""))
        body  = r.get("body", "")[:max_per]
        if body and len(body) > 80:
            lines.append(f"[{title}]\nSource: {url}\n{body}")
    return "\n\n---\n\n".join(lines)

def safe_get(url: str, timeout: int = 8) -> str:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script","style","nav","footer","header","aside"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        return " ".join(text.split())[:3000]
    except:
        return ""

# ── REDDIT API (free, no key needed) ──────────────────────────────────────
def reddit_search(query: str, limit: int = 10) -> str:
    """Search Reddit directly via their JSON API — no auth needed."""
    collected = []

    try:
        # Search Reddit's own search endpoint
        url = f"https://www.reddit.com/search.json?q={requests.utils.quote(query)}&sort=relevance&limit={limit}&type=link"
        r = requests.get(url, headers=REDDIT_HEADERS, timeout=10)
        data = r.json()
        posts = data.get("data", {}).get("children", [])

        for post in posts:
            p = post.get("data", {})
            title    = p.get("title", "")
            selftext = p.get("selftext", "")[:600]
            score    = p.get("score", 0)
            subreddit = p.get("subreddit", "")
            permalink = "https://reddit.com" + p.get("permalink", "")
            num_comments = p.get("num_comments", 0)

            if title and score > 0:
                entry = f"[Reddit Post — r/{subreddit} | {score} upvotes | {num_comments} comments]\n"
                entry += f"Title: {title}\n"
                entry += f"URL: {permalink}\n"
                if selftext and selftext != "[removed]" and selftext != "[deleted]":
                    entry += f"Content: {selftext}\n"
                collected.append(entry)

    except Exception as e:
        collected.append(f"Reddit search failed: {e}")

    return "\n\n---\n\n".join(collected) if collected else ""

def reddit_comments(query: str, limit: int = 5) -> str:
    """Get Reddit comments mentioning the competitor."""
    collected = []

    try:
        url = f"https://www.reddit.com/search.json?q={requests.utils.quote(query)}&sort=top&limit={limit}&type=comment"
        r = requests.get(url, headers=REDDIT_HEADERS, timeout=10)
        data = r.json()
        comments = data.get("data", {}).get("children", [])

        for comment in comments:
            c = comment.get("data", {})
            body      = c.get("body", "")[:400]
            score     = c.get("score", 0)
            subreddit = c.get("subreddit", "")
            permalink = "https://reddit.com" + c.get("permalink", "")

            if body and body not in ["[removed]", "[deleted]"] and score > 2:
                entry = f"[Reddit Comment — r/{subreddit} | {score} upvotes]\n"
                entry += f"Comment: {body}\n"
                entry += f"URL: {permalink}"
                collected.append(entry)

    except Exception as e:
        pass

    return "\n\n---\n\n".join(collected) if collected else ""

def reddit_subreddit_posts(competitor: str) -> str:
    """Check if competitor has a subreddit and scrape top complaints."""
    collected = []
    slug = competitor.lower().replace(" ", "")

    subreddits_to_check = [slug, f"{slug}app", f"{slug}software"]

    for sub in subreddits_to_check:
        try:
            url = f"https://www.reddit.com/r/{sub}/search.json?q=problem+issue+complaint+hate+worst&sort=top&limit=8&restrict_sr=1"
            r = requests.get(url, headers=REDDIT_HEADERS, timeout=8)
            if r.status_code == 200:
                data = r.json()
                posts = data.get("data", {}).get("children", [])
                if posts:
                    collected.append(f"## FROM r/{sub} (official community complaints)")
                    for post in posts[:6]:
                        p = post.get("data", {})
                        title    = p.get("title", "")
                        selftext = p.get("selftext", "")[:400]
                        score    = p.get("score", 0)
                        permalink = "https://reddit.com" + p.get("permalink", "")
                        if title and score > 0:
                            entry = f"  • [{score} upvotes] {title}\n    URL: {permalink}"
                            if selftext and selftext not in ["[removed]","[deleted]"]:
                                entry += f"\n    Content: {selftext[:200]}"
                            collected.append(entry)
                    break
        except:
            continue

    return "\n\n".join(collected) if collected else ""

# ── WEBSITE ────────────────────────────────────────────────────────────────
def scrape_website(competitor: str, url: str) -> dict:
    if url:
        base = url if url.startswith("http") else f"https://{url}"
    else:
        base = f"https://www.{competitor.lower().replace(' ','')}.com"

    return {
        "homepage": safe_get(base),
        "pricing":  safe_get(base.rstrip("/") + "/pricing"),
        "about":    safe_get(base.rstrip("/") + "/about"),
        "features": safe_get(base.rstrip("/") + "/features"),
    }

# ── REVIEWS ────────────────────────────────────────────────────────────────
def scrape_reviews(competitor: str) -> str:
    sections = []

    # 1. Reddit API — complaints and problems
    reddit_complaints = reddit_search(f"{competitor} problems complaints hate worst", limit=8)
    if reddit_complaints:
        sections.append("## REDDIT — COMPLAINTS & PROBLEMS\n" + reddit_complaints)

    # 2. Reddit API — honest reviews
    reddit_reviews = reddit_search(f"{competitor} review honest worth it pros cons", limit=6)
    if reddit_reviews:
        sections.append("## REDDIT — HONEST REVIEWS\n" + reddit_reviews)

    # 3. Reddit comments specifically
    reddit_cmts = reddit_comments(f"{competitor} bad problem issue annoying", limit=6)
    if reddit_cmts:
        sections.append("## REDDIT — USER COMMENTS\n" + reddit_cmts)

    # 4. Competitor's own subreddit complaints
    sub_posts = reddit_subreddit_posts(competitor)
    if sub_posts:
        sections.append(sub_posts)

    # 5. Reddit — switching away
    reddit_switch = reddit_search(f"switched from {competitor} moved to alternative why", limit=5)
    if reddit_switch:
        sections.append("## REDDIT — WHY USERS SWITCH AWAY\n" + reddit_switch)

    # 6. G2 via DuckDuckGo
    g2 = ddg_search(f"{competitor} reviews g2 rating pros cons", max_results=4)
    g2_only = [r for r in g2 if "g2.com" in r.get("href","")]
    if g2_only:
        sections.append("## G2 REVIEWS\n" + format_results(g2_only[:3], max_per=500))
    elif g2:
        sections.append("## USER REVIEWS\n" + format_results(g2[:3], max_per=500))

    # 7. General pros/cons via DuckDuckGo
    procon = ddg_search(f"{competitor} pros cons drawbacks limitations users 2024 2025", max_results=5)
    if procon:
        sections.append("## PROS & CONS FROM REVIEW SITES\n" + format_results(procon[:4], max_per=400))

    # 8. Pricing complaints
    pricing_complaints = ddg_search(f"{competitor} too expensive price increase not worth it", max_results=4)
    if pricing_complaints:
        sections.append("## PRICING COMPLAINTS\n" + format_results(pricing_complaints[:3], max_per=400))

    return "\n\n" + "="*60 + "\n\n".join(sections) if sections else f"Limited review data for {competitor}"

# ── NEWS ───────────────────────────────────────────────────────────────────
def scrape_news(competitor: str) -> str:
    sections = []

    news = ddg_news(f"{competitor} 2025", max_results=6)
    if news:
        lines = []
        for n in news:
            t  = n.get("title","")
            u  = n.get("url","")
            b  = n.get("body","")[:300]
            dt = n.get("date","")
            if b:
                lines.append(f"[{t}]\nDate: {dt} | Source: {u}\n{b}")
        sections.append("## RECENT NEWS\n" + "\n\n---\n\n".join(lines))

    launches = ddg_search(f"{competitor} new feature product update release 2025", max_results=4)
    if launches:
        sections.append("## PRODUCT UPDATES\n" + format_results(launches[:3], max_per=400))

    controversy = ddg_search(f"{competitor} controversy backlash problem 2024 2025", max_results=4)
    if controversy:
        sections.append("## CONTROVERSIES\n" + format_results(controversy[:3], max_per=400))

    return "\n\n".join(sections) if sections else f"No recent news found for {competitor}"

# ── JOBS ───────────────────────────────────────────────────────────────────
def scrape_jobs(competitor: str) -> str:
    jobs = ddg_search(f"{competitor} hiring engineering product design jobs 2025", max_results=5)
    if jobs:
        return "## HIRING SIGNALS\n" + format_results(jobs[:4], max_per=300)
    return f"No job data found for {competitor}"

# ── PRICING INTEL ──────────────────────────────────────────────────────────
def scrape_pricing(competitor: str) -> str:
    sections = []
    p1 = ddg_search(f"{competitor} pricing plans cost per month 2025", max_results=5)
    if p1:
        sections.append("## PRICING INTEL\n" + format_results(p1[:4], max_per=400))
    p2 = ddg_search(f"{competitor} price increase expensive hidden costs", max_results=4)
    if p2:
        sections.append("## PRICING COMPLAINTS\n" + format_results(p2[:3], max_per=400))
    return "\n\n".join(sections)

# ── MASTER ─────────────────────────────────────────────────────────────────
async def scrape_all(competitor: str, url: str) -> dict:
    loop = asyncio.get_running_loop()

    async def run(fn, *args, timeout=60):
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(None, fn, *args),
                timeout=timeout
            )
        except Exception as e:
            return f"Failed: {e}"

    website = await run(scrape_website, competitor, url,  timeout=20)
    reviews = await run(scrape_reviews, competitor,       timeout=120)
    news    = await run(scrape_news,    competitor,       timeout=50)
    jobs    = await run(scrape_jobs,    competitor,       timeout=40)
    pricing = await run(scrape_pricing, competitor,       timeout=40)

    return {
        "website": website,
        "reviews": reviews,
        "news":    news,
        "jobs":    jobs,
        "pricing": pricing,
    }