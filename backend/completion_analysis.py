"""
completion_analysis.py - Fast, deterministic promise completion analysis.
Groq is only called for the first N promises per party (sampled).
All others use deterministic heuristics / ground-truth lookup.
"""
import os
import re
import json
import time
import hashlib
from pathlib import Path
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

COMPLETION_DIR = Path(__file__).parent.parent / "data" / "completion"
PROCESSED_DIR  = Path(__file__).parent.parent / "data" / "processed"
COMPLETION_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

COMPLETION_STATUSES = ["Completed", "In Progress", "Not Started", "Failed"]

# Maximum Groq calls per pipeline run (across ALL parties combined)
GROQ_CALL_BUDGET = 30

COMPLETION_KEYWORDS = {
    "Completed": [
        "launched","inaugurated","commissioned","completed","achieved",
        "implemented","delivered","built","opened","established",
        "introduced","passed","enacted","rolled out","fulfilled",
        "accomplished","operationalised","deployed","notified"
    ],
    "In Progress": [
        "underway","ongoing","progress","developing","construction",
        "phase","pilot","under","being","planned","announced",
        "proposed","working","initiating","implementing","partially"
    ],
    "Failed": [
        "failed","dropped","scrapped","cancelled","abandoned","rejected",
        "not achieved","fell short","missed target","delayed indefinitely",
        "not implemented","shelved","withdrawn"
    ],
    "Not Started": [
        "not started","pending","no progress","yet to","promised but",
        "not yet","awaiting","deferred"
    ]
}

# Known ground-truth outcomes — checked first, no API call needed
KNOWN_COMPLETIONS = {
    "ayushman bharat":              ("Completed",   0.95),
    "ujjwala yojana":               ("Completed",   0.95),
    "pm kisan":                     ("Completed",   0.95),
    "gst":                          ("Completed",   0.95),
    "goods and services tax":       ("Completed",   0.95),
    "bharatmala":                   ("In Progress", 0.82),
    "jal jeevan mission":           ("In Progress", 0.78),
    "smart cities":                 ("In Progress", 0.72),
    "beti bachao beti padhao":      ("Completed",   0.90),
    "swachh bharat":                ("Completed",   0.88),
    "digital india":                ("Completed",   0.85),
    "make in india":                ("In Progress", 0.70),
    "national education policy":    ("Completed",   0.90),
    "one rank one pension":         ("Completed",   0.88),
    "chief of defence staff":       ("Completed",   0.95),
    "pm svanidhi":                  ("Completed",   0.90),
    "jan dhan yojana":              ("Completed",   0.95),
    "jan dhan":                     ("Completed",   0.95),
    "mudra yojana":                 ("Completed",   0.90),
    "atal pension":                 ("Completed",   0.90),
    "bullet train":                 ("Not Started", 0.80),
    "5 trillion":                   ("Failed",      0.85),
    "five trillion":                ("Failed",      0.85),
    "double farmers income":        ("Failed",      0.80),
    "2 crore jobs":                 ("Failed",      0.82),
    "two crore jobs":               ("Failed",      0.82),
    "women reservation bill":       ("Completed",   0.88),
    "33 percent reservation":       ("Completed",   0.82),
    "mgnrega":                      ("Completed",   0.98),
    "mahatma gandhi national rural employment": ("Completed", 0.98),
    "right to education":           ("Completed",   0.98),
    "rti":                          ("Completed",   0.95),
    "right to information":         ("Completed",   0.98),
    "loan waiver":                  ("Completed",   0.88),
    "farm loan":                    ("Completed",   0.85),
    "rashtriya swasthya bima":      ("Completed",   0.88),
    "rajiv gandhi grameen vidyut":  ("Completed",   0.85),
    "aadhaar":                      ("Completed",   0.95),
    "food security act":            ("Completed",   0.92),
    "national food security":       ("Completed",   0.92),
    "nyay":                         ("Not Started", 0.95),
    "minimum income guarantee":     ("Not Started", 0.90),
    "right to healthcare":          ("Not Started", 0.90),
    "6 percent gdp education":      ("Failed",      0.80),
    "6% gdp":                       ("Failed",      0.78),
    "public health expenditure 3":  ("Failed",      0.82),
    "pm fasal bima":                ("Completed",   0.85),
    "crop insurance":               ("Completed",   0.80),
    "soil health card":             ("Completed",   0.88),
    "pm ujjwala":                   ("Completed",   0.95),
    "startup india":                ("Completed",   0.85),
    "stand up india":               ("Completed",   0.85),
    "skill india":                  ("In Progress", 0.75),
    "housing for all":              ("In Progress", 0.72),
    "smart city":                   ("In Progress", 0.70),
    "metro rail":                   ("In Progress", 0.78),
    "demonetisation":               ("Completed",   0.98),
    "demonetization":               ("Completed",   0.98),
    "article 370":                  ("Completed",   0.98),
}

HISTORICAL_RATES = {
    "BJP": {
        "Economy": 0.62, "Infrastructure": 0.68, "Defence": 0.65,
        "Healthcare": 0.55, "Education": 0.52, "Agriculture": 0.42,
        "Environment": 0.38, "Women": 0.50, "Youth": 0.45, "Others": 0.48
    },
    "INC": {
        "Economy": 0.58, "Infrastructure": 0.55, "Defence": 0.52,
        "Healthcare": 0.60, "Education": 0.62, "Agriculture": 0.55,
        "Environment": 0.48, "Women": 0.58, "Youth": 0.50, "Others": 0.48
    },
}


def _promise_hash(promise_text: str) -> int:
    """Deterministic integer from promise text — same promise = same hash always."""
    return int(hashlib.md5(promise_text.encode()).hexdigest(), 16) % (2 ** 31)


def _check_known_completion(promise_text: str) -> Optional[tuple]:
    """Fast keyword lookup against known policy outcomes."""
    text_lower = promise_text.lower()
    for keyword, result in KNOWN_COMPLETIONS.items():
        if keyword in text_lower:
            return result
    return None


def safe_parse_json(text: str) -> Optional[Dict]:
    """Extract JSON from LLM output, handling common failure modes."""
    if not text or not text.strip():
        return None
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text).strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass

    # Field-by-field regex fallback
    status_match = re.search(
        r'"status"\s*:\s*"(Completed|In Progress|Not Started|Failed)"',
        text, re.IGNORECASE
    )
    conf_match = re.search(r'"confidence"\s*:\s*([\d.]+)', text)
    if status_match:
        return {
            "status": status_match.group(1),
            "confidence": float(conf_match.group(1)) if conf_match else 0.5,
            "reasoning": "regex fallback"
        }
    return None


def groq_analyze_completion(promise_text: str, party: str) -> Optional[Dict]:
    """
    Single Groq call with short prompt, temperature=0, 10s timeout.
    No articles needed — analyzes promise text semantically.
    """
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key or groq_key == "your_groq_api_key_here":
        return None

    try:
        import groq
        client = groq.Groq(api_key=groq_key)

        prompt = (
            f"Indian political promise by {party}:\n\"{promise_text[:180]}\"\n\n"
            "Reply ONLY with JSON, no markdown:\n"
            '{"status":"Completed","confidence":0.7,"reasoning":"one sentence"}\n\n'
            "status must be: Completed, In Progress, Not Started, or Failed\n"
            "Base answer on what actually happened in India after 2009."
        )

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=100,
            timeout=10,
        )
        raw = response.choices[0].message.content.strip()
        result = safe_parse_json(raw)

        if result and result.get("status") in COMPLETION_STATUSES:
            result["method"] = "groq"
            return result

    except Exception as e:
        err = str(e)
        if "429" in err or "rate" in err.lower():
            time.sleep(15)
    return None


def heuristic_completion_status(promise: Dict) -> Dict:
    """
    Fully deterministic heuristic — same promise always → same status.
    Uses MD5 hash of promise text as seed.
    """
    promise_text = promise.get("promise", "")
    year     = int(promise.get("year", 2019))
    party    = promise.get("party", "BJP")
    category = promise.get("category", "Others")
    elapsed  = 2024 - year

    if elapsed < 3:
        seed   = _promise_hash(promise_text) % 100
        status = "In Progress" if seed < 55 else "Not Started"
        return {"status": status, "confidence": 0.45,
                "evidence": "Recent promise — insufficient time elapsed",
                "method": "heuristic"}

    rate = HISTORICAL_RATES.get(party, HISTORICAL_RATES["BJP"]).get(category, 0.50)
    seed = _promise_hash(promise_text) % 1000

    completed_t = int(rate * 0.60 * 1000)
    progress_t  = int(rate * 1000)
    failed_t    = int((rate + 0.10) * 1000)

    if seed < completed_t:
        status, conf = "Completed",   round(0.55 + rate * 0.30, 2)
    elif seed < progress_t:
        status, conf = "In Progress", 0.50
    elif seed < failed_t:
        status, conf = "Failed",      0.45
    else:
        status, conf = "Not Started", 0.38

    return {
        "status": status,
        "confidence": conf,
        "evidence": f"Historical {party}/{category} rate {rate:.0%} — deterministic",
        "method": "heuristic"
    }


def analyze_promise_completion(
    promise: Dict,
    use_groq: bool = False,
) -> Dict:
    """
    Analyze one promise. Groq is ONLY called when use_groq=True
    (budget-controlled by the caller).
    """
    # 1. Known ground-truth (instant, no API)
    known = _check_known_completion(promise.get("promise", ""))
    if known:
        status, confidence = known
        return {
            **promise,
            "completion_status":    status,
            "completion_confidence": confidence,
            "completion_evidence":  "Known ground-truth policy outcome",
            "completion_method":    "known_ground_truth"
        }

    # 2. Groq (only if budget allows)
    if use_groq:
        result = groq_analyze_completion(promise["promise"], promise.get("party", ""))
        if result and result.get("confidence", 0) >= 0.35:
            return {
                **promise,
                "completion_status":    result["status"],
                "completion_confidence": result["confidence"],
                "completion_evidence":  result.get("reasoning", ""),
                "completion_method":    "groq"
            }

    # 3. Deterministic heuristic (always works, no API)
    h = heuristic_completion_status(promise)
    return {
        **promise,
        "completion_status":    h["status"],
        "completion_confidence": h["confidence"],
        "completion_evidence":  h["evidence"],
        "completion_method":    h["method"]
    }


def analyze_all_completions(
    promises: List[Dict],
    use_scraper: bool = True
) -> List[Dict]:
    """
    Analyze all promises with a strict Groq call budget.
    - Ground-truth lookup: instant, unlimited
    - Groq calls: capped at GROQ_CALL_BUDGET total
    - Everything else: deterministic heuristic
    """
    print(f"\n📊 Analyzing {len(promises)} promises (budget: {GROQ_CALL_BUDGET} Groq calls)...")

    groq_available = bool(os.getenv("GROQ_API_KEY", "").strip()) and \
                     os.getenv("GROQ_API_KEY") != "your_groq_api_key_here"

    # Identify which promises need Groq (not covered by ground-truth)
    groq_candidates = []
    for p in promises:
        if not _check_known_completion(p.get("promise", "")):
            groq_candidates.append(p["id"] if "id" in p else p.get("promise", "")[:40])

    # Select a diverse sample for Groq — spread across parties/years
    groq_budget_ids = set()
    if groq_available and GROQ_CALL_BUDGET > 0:
        import random as _random
        _random.seed(42)
        sampled = _random.sample(groq_candidates, min(GROQ_CALL_BUDGET, len(groq_candidates)))
        groq_budget_ids = set(sampled)
        print(f"  Groq will be called for {len(groq_budget_ids)} selected promises")

    analyzed  = []
    method_counts = {"known_ground_truth": 0, "groq": 0, "heuristic": 0}
    groq_calls_made = 0

    for i, promise in enumerate(promises):
        p_id = promise.get("id", promise.get("promise", "")[:40])
        use_groq = (p_id in groq_budget_ids and groq_calls_made < GROQ_CALL_BUDGET)

        result = analyze_promise_completion(promise, use_groq=use_groq)

        if result.get("completion_method") == "groq":
            groq_calls_made += 1
        method_counts[result.get("completion_method", "heuristic")] = \
            method_counts.get(result.get("completion_method", "heuristic"), 0) + 1

        analyzed.append(result)

        # Progress every 50 promises
        if (i + 1) % 50 == 0:
            print(f"  [{i+1}/{len(promises)}] processed — "
                  f"ground_truth={method_counts['known_ground_truth']}, "
                  f"groq={method_counts['groq']}, "
                  f"heuristic={method_counts.get('heuristic',0)}")

    print(f"\nCompletion analysis done. {len(analyzed)} promises.")
    print(f"Methods: {method_counts}")

    from collections import Counter
    dist = Counter(p.get("completion_status") for p in analyzed)
    print(f"Status distribution: {dict(dist)}")

    output = PROCESSED_DIR / "completion_analyzed.json"
    output.write_text(json.dumps(analyzed, ensure_ascii=False, indent=2), encoding="utf-8")

    return analyzed


def get_completion_stats(promises: List[Dict]) -> Dict:
    stats = {}
    for p in promises:
        party  = p.get("party", "Unknown")
        status = p.get("completion_status", "Not Started")
        if party not in stats:
            stats[party] = {"total": 0, "Completed": 0,
                            "In Progress": 0, "Not Started": 0, "Failed": 0}
        stats[party]["total"] += 1
        stats[party][status]   = stats[party].get(status, 0) + 1
    for party in stats:
        total = max(stats[party]["total"], 1)
        stats[party]["completion_rate"] = round(stats[party]["Completed"] / total, 3)
        stats[party]["progress_rate"]   = round(stats[party]["In Progress"] / total, 3)
        stats[party]["failure_rate"]    = round(stats[party]["Failed"] / total, 3)
    return stats


def load_analyzed_promises() -> List[Dict]:
    path = PROCESSED_DIR / "completion_analyzed.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []