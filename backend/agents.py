from groq import Groq
from storage import task_store
from scraper import scrape_all
import datetime
import re

def update_agent(task_id: str, agent: str, status: str, message: str):
    if task_id in task_store:
        task_store[task_id]["agents"][agent] = {"status": status, "message": message}

def call_groq(client: Groq, system: str, user: str, max_tokens: int = 4000) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0.6,
    )
    return response.choices[0].message.content.strip()

def extract_sources(raw_data: dict) -> dict:
    """Extract all real URLs from scraped data and categorize them."""
    text_blob = ""
    website = raw_data.get("website", {})
    if isinstance(website, dict):
        for v in website.values():
            text_blob += (v or "") + " "
    for key in ["reviews", "news", "jobs", "pricing"]:
        val = raw_data.get(key, "")
        if isinstance(val, str):
            text_blob += val + " "

    found = re.findall(r'https?://[^\s\]\)\'"<>,]+', text_blob)

    seen = set()
    categories = {"Reddit": [], "Reviews": [], "News": [], "Jobs": [], "Other": []}

    skip = ["google.com/search", "w3.org", "schemas.org", "facebook.com",
            "twitter.com", "instagram.com", "tiktok.com", "apple.com/legal"]

    for url in found:
        url = url.rstrip(".,;:)")
        if any(s in url for s in skip): continue
        if len(url) < 16: continue
        if url in seen: continue
        seen.add(url)

        if "reddit.com" in url:
            categories["Reddit"].append(url)
        elif any(x in url for x in ["g2.com","trustpilot.com","capterra.com","producthunt.com","getapp.com","softwareadvice.com"]):
            categories["Reviews"].append(url)
        elif any(x in url for x in ["techcrunch","forbes","bloomberg","venturebeat","wired","theverge","zdnet","businessinsider","cnbc"]):
            categories["News"].append(url)
        elif any(x in url for x in ["greenhouse.io","lever.co","ashbyhq.com","jobs.","careers.","hiring"]):
            categories["Jobs"].append(url)
        else:
            categories["Other"].append(url)

    # Cap each category
    return {k: v[:8] for k, v in categories.items() if v}

def build_context(raw_data: dict, competitor: str) -> str:
    website = raw_data.get("website", {})
    if not isinstance(website, dict):
        website = {}
    return f"""
=== LIVE SCRAPED DATA: {competitor.upper()} ===
(Real data. Use directly. Cite every source.)

--- HOMEPAGE ---
{website.get('homepage','')[:1500]}

--- PRICING PAGE ---
{website.get('pricing','')[:1000]}

--- FEATURES ---
{website.get('features','')[:800]}

--- USER REVIEWS (Reddit, G2, Trustpilot, Capterra) ---
{str(raw_data.get('reviews',''))[:3500]}

--- PRICING INTELLIGENCE ---
{str(raw_data.get('pricing',''))[:1000]}

--- RECENT NEWS ---
{str(raw_data.get('news',''))[:2000]}

--- HIRING SIGNALS ---
{str(raw_data.get('jobs',''))[:1000]}
"""

async def run_intelligence_pipeline(
    task_id: str,
    your_company: str,
    competitor: str,
    competitor_url: str,
    api_key: str
):
    import asyncio
    today = datetime.date.today().strftime("%B %d, %Y")

    try:
        client = Groq(api_key=api_key)

        # ── AGENT 1: SCRAPER ──────────────────────────────────────────────
        update_agent(task_id, "scraper", "running", f"Scraping {competitor} — website, Reddit, G2, Trustpilot, news, jobs...")

        raw_data = await scrape_all(competitor, competitor_url)
        context  = build_context(raw_data, competitor)
        sources  = extract_sources(raw_data)
        total_sources = sum(len(v) for v in sources.values())

        update_agent(task_id, "scraper", "completed", f"Data collected from {total_sources} real sources ✓")

        # ── AGENT 2: ANALYST ──────────────────────────────────────────────
        update_agent(task_id, "analyst", "running", "Extracting intelligence from real data...")

        analysis = await asyncio.to_thread(call_groq, client,
            f"""You are a Senior Competitive Intelligence Analyst at McKinsey & Company.
You have REAL scraped data about {competitor}. Your analysis will be read by a CEO.

STRICT RULES:
- Only use facts from the scraped data provided below
- Every complaint or review quote MUST end with (Source: Reddit), (Source: G2), (Source: Trustpilot) etc.
- If data is missing say "Insufficient data found" — never invent
- Use exact quotes where available
- Be specific with numbers, dates, prices

## Company Profile
Real positioning, target market, size signals from homepage data.

## Real Pricing
Exact tiers and costs from scraped data. Quote the page directly.

## What Customers Actually Say

### Top Praised Features
- "[direct quote or close paraphrase]" (Source: [site])
List minimum 3. If not found, say so.

### Top Complaints & Frustrations
- "[direct quote or close paraphrase]" (Source: [site])
List minimum 5. These are {your_company}'s BIGGEST opportunities.
Look hard — complaints are in reviews, Reddit posts, and comparison articles.

## Product & Feature Intelligence
Real features from their website. Be specific.

## Hiring Signals & Roadmap
What job postings reveal about their next moves.

## Recent News & Moves
Real announcements, funding, launches found in scraped data.

## Top 5 Exploitable Weaknesses for {your_company}
Based ONLY on real complaints found above. Number each one.""",
            f"Scraped data:\n{context}",
            max_tokens=4000
        )

        update_agent(task_id, "analyst", "completed", "Intelligence analysis complete ✓")

        # ── AGENT 3: STRATEGIST ───────────────────────────────────────────
        update_agent(task_id, "strategist", "running", "Building competitive strategy...")

        strategy = await asyncio.to_thread(call_groq, client,
            f"""You are a Chief Strategy Officer advising {your_company} on beating {competitor}.
Use the real intelligence analysis below. Be specific and actionable.

## Head-to-Head Comparison
| Dimension | {your_company} | {competitor} | Advantage |
|-----------|--------------|-------------|-----------|
| Pricing | Assess | From data | |
| Ease of use | Assess | From reviews | |
| Customer support | Assess | From reviews | |
| Core features | Assess | From website | |
| Reliability | Assess | From complaints | |

## Their 5 Biggest Vulnerabilities (evidence-backed)
For each:
**Vulnerability:** [specific weakness from real data]
**Evidence:** "[real quote]" (Source: [site])
**How {your_company} exploits it:** [specific, actionable step]

## Positioning Strategy
- **Headline:** One-line positioning statement against {competitor}
- **Message 1:** Based on competitor weakness 1
- **Message 2:** Based on competitor weakness 2
- **Message 3:** Based on competitor weakness 3

## Threat Assessment
What {competitor} is actively doing that threatens {your_company} with timeline.

## 90-Day Battle Plan
| Week | Action | Expected Outcome |
|------|--------|-----------------|
[10 specific actions. Be concrete.]""",
            f"Your company: {your_company}\nCompetitor: {competitor}\n\nAnalysis:\n{analysis}",
            max_tokens=4000
        )

        update_agent(task_id, "strategist", "completed", "Strategic brief complete ✓")

        # ── AGENT 4: BATTLECARD ───────────────────────────────────────────
        update_agent(task_id, "battlecard", "running", "Writing sales battlecard from real complaints...")

        battlecard = await asyncio.to_thread(call_groq, client,
            f"""You are a Sales Enablement Director. Write a battlecard sales reps use TODAY in live calls.
Every weakness and objection handler must be based on REAL complaints from the intelligence data.

# ⚔️ Sales Battlecard: {your_company} vs {competitor}
*Generated: {today} | Based on live scraped data*

---

## When a prospect mentions {competitor}

**Say this word-for-word:**
"[2-3 sentence confident response. Reference a specific real weakness. Not defensive.]"

---

## 4 Real Weaknesses (from actual user reviews)
| Weakness | Real User Quote | Source | Your Counter |
|----------|----------------|--------|--------------|
[4 rows. Use actual quotes from the intelligence. Include source site name.]

---

## Trap Questions (make them discover the problems themselves)
1. "[Question exposing their top complaint]"
2. "[Question about pricing complexity or hidden costs]"
3. "[Question about support quality or response time]"
4. "[Question about a known missing feature]"
5. "[Question about scalability or reliability]"

---

## Objection Handlers
| Prospect Says | You Say |
|--------------|---------|
| "{competitor} is cheaper" | "[ROI-based counter with specific numbers if available]" |
| "We already use {competitor}" | "[Switching pain + specific benefit counter]" |
| "{competitor} has more features" | "[Quality vs quantity counter]" |
| "Everyone uses {competitor}" | "[Contrarian counter referencing a real complaint]" |

---

## Your Killer Close
"[One sentence. Creates urgency. References a real competitor weakness.]"

---
*Update monthly. Scraped: {today}*""",
            f"Company: {your_company}\nCompetitor: {competitor}\n\nIntelligence:\n{analysis[:3000]}\n\nStrategy:\n{strategy[:2000]}",
            max_tokens=4000
        )

        update_agent(task_id, "battlecard", "completed", "Sales battlecard ready ✓")

        full_report = f"""# Competitor Intelligence Report
## {competitor} — Full Analysis for {your_company}
*Generated: {today} | Data scraped live from the web*

---

{analysis}

---

{strategy}

---

{battlecard}

---
*Sources: Company website, Reddit, G2, Trustpilot, Product Hunt, Capterra, Hacker News, News sites*
"""
        task_store[task_id]["status"]  = "completed"
        task_store[task_id]["report"]  = full_report
        task_store[task_id]["sources"] = sources

    except Exception as e:
        task_store[task_id]["status"] = "error"
        task_store[task_id]["error"]  = str(e)
        for agent in ["scraper", "analyst", "strategist", "battlecard"]:
            if task_store[task_id]["agents"][agent]["status"] == "running":
                update_agent(task_id, agent, "error", f"Failed: {str(e)}")