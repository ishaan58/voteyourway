"""
scoring.py - Compute party scores and generate recommendations
"""
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional

PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = ["Economy", "Education", "Healthcare", "Infrastructure", "Agriculture",
               "Women", "Youth", "Environment", "Defence", "Others"]

DEFAULT_WEIGHTS = {
    "completion_rate": 0.40,
    "predicted_completion_strength": 0.20,
    "category_coverage": 0.15,
    "promise_density": 0.10,
    "consistency_score": 0.15
}


def compute_completion_rate(promises: List[Dict]) -> float:
    """Fraction of promises marked as Completed."""
    if not promises:
        return 0.0
    completed = sum(1 for p in promises if p.get("completion_status") == "Completed")
    return completed / len(promises)


def compute_category_coverage(promises: List[Dict]) -> float:
    """Fraction of categories covered (0-1)."""
    if not promises:
        return 0.0
    categories_covered = set(p.get("category", "Others") for p in promises)
    return len(categories_covered) / len(CATEGORIES)


def compute_promise_density(promises: List[Dict], max_expected: int = 100) -> float:
    """Normalized promise count."""
    return min(len(promises) / max_expected, 1.0)


def compute_predicted_completion_strength(promises: List[Dict], category_weights: Dict[str, float] = None) -> float:
    """Average predicted completion probability, optionally weighted by category importance."""
    if not promises:
        return 0.5
    
    if category_weights:
        # Weight each promise's completion probability by its category importance
        weighted_sum = 0.0
        weight_total = 0.0
        for p in promises:
            prob = p.get("completion_probability")
            if prob is None:
                continue
            cat = p.get("category", "Others")
            # Get category weight, default to 1.0 if not specified
            cat_weight = category_weights.get(cat, 1.0)
            # Skip promises from OFF categories (weight 0)
            if cat_weight <= 0:
                continue
            # Higher category weight = higher importance, so multiply probability by weight
            weighted_sum += prob * cat_weight
            weight_total += cat_weight
        
        if weight_total > 0:
            return float(weighted_sum / weight_total)
        else:
            return 0.5
    
    probs = [p.get("completion_probability", 0.5) for p in promises if p.get("completion_probability") is not None]
    if not probs:
        return 0.5
    return float(np.mean(probs))


def compute_consistency_score(promises: List[Dict]) -> float:
    """
    Consistency score: How evenly distributed are promises across categories?
    High score = broad coverage, Low score = concentrated in few areas.
    Also penalize very high failure rates.
    """
    if not promises:
        return 0.0
    
    # Category distribution
    cat_counts = {cat: 0 for cat in CATEGORIES}
    for p in promises:
        cat = p.get("category", "Others")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    
    counts = list(cat_counts.values())
    total = sum(counts)
    
    if total == 0:
        return 0.0
    
    # Use entropy as consistency measure
    probs = [c / total for c in counts if c > 0]
    entropy = -sum(p * np.log(p + 1e-10) for p in probs)
    max_entropy = np.log(len(CATEGORIES))
    
    consistency = entropy / max_entropy if max_entropy > 0 else 0.0
    
    # Penalize high failure rate
    failed = sum(1 for p in promises if p.get("completion_status") == "Failed")
    failure_penalty = min(failed / max(len(promises), 1), 0.3)
    
    return max(0.0, consistency - failure_penalty)


def score_party(party_promises: List[Dict], weights: Dict[str, float] = None) -> Dict:
    """Compute comprehensive score for a party."""
    if weights is None:
        weights = DEFAULT_WEIGHTS
    
    # Extract and apply category weights
    category_weights = weights.get("_category_weights") if weights else None
    
    # Filter promises by category weights (exclude OFF categories)
    filtered_promises = party_promises
    if category_weights:
        # Keep only promises from categories with non-zero weight
        filtered_promises = [
            p for p in party_promises 
            if category_weights.get(p.get("category", "Others"), 1.0) > 0
        ]
        # If all promises are filtered out, keep originals to avoid empty results
        if not filtered_promises:
            filtered_promises = party_promises
    
    completion_rate = compute_completion_rate(filtered_promises)
    category_coverage = compute_category_coverage(filtered_promises)
    promise_density = compute_promise_density(filtered_promises)
    predicted_strength = compute_predicted_completion_strength(filtered_promises, category_weights)
    consistency_score = compute_consistency_score(filtered_promises)
    
    # Weighted final score
    final_score = (
        completion_rate * weights.get("completion_rate", 0.40) +
        predicted_strength * weights.get("predicted_completion_strength", 0.20) +
        category_coverage * weights.get("category_coverage", 0.15) +
        promise_density * weights.get("promise_density", 0.10) +
        consistency_score * weights.get("consistency_score", 0.15)
    )
    
    return {
        "completion_rate": round(completion_rate, 3),
        "category_coverage": round(category_coverage, 3),
        "promise_density": round(promise_density, 3),
        "predicted_completion_strength": round(predicted_strength, 3),
        "consistency_score": round(consistency_score, 3),
        "final_score": round(final_score, 3),
        "total_promises": len(filtered_promises),
        "completed_promises": sum(1 for p in filtered_promises if p.get("completion_status") == "Completed"),
        "in_progress_promises": sum(1 for p in filtered_promises if p.get("completion_status") == "In Progress"),
        "failed_promises": sum(1 for p in filtered_promises if p.get("completion_status") == "Failed"),
        "likely_completions": sum(1 for p in filtered_promises if p.get("probability_label") == "Likely"),
    }


def score_all_parties(promises: List[Dict], 
                       category_weights: Dict[str, float] = None,
                       score_weights: Dict[str, float] = None) -> List[Dict]:
    """
    Score all parties and rank them.
    
    Args:
        promises: All promises with completion status and predictions
        category_weights: User-provided category importance weights
        score_weights: User-provided component weights
    """
    # Group by party
    party_promises = {}
    for p in promises:
        party = p.get("party", "Unknown")
        if party not in party_promises:
            party_promises[party] = []
        party_promises[party].append(p)
    
    results = []
    for party, p_list in party_promises.items():
        # If user has category preferences, filter/weight promises accordingly
        filtered_promises = p_list

        # Pass category weights into score_party via a special key
        effective_score_weights = dict(score_weights) if score_weights else dict(DEFAULT_WEIGHTS)
        if category_weights:
            effective_score_weights["_category_weights"] = category_weights

        score_data = score_party(filtered_promises, effective_score_weights)
        
        # Category distribution
        cat_dist = {cat: 0 for cat in CATEGORIES}
        for p in p_list:
            cat = p.get("category", "Others")
            cat_dist[cat] = cat_dist.get(cat, 0) + 1
        
        # Category completion rates
        cat_completion = {}
        for cat in CATEGORIES:
            cat_promises = [p for p in p_list if p.get("category") == cat]
            if cat_promises:
                completed = sum(1 for p in cat_promises if p.get("completion_status") == "Completed")
                cat_completion[cat] = round(completed / len(cat_promises), 3)
            else:
                cat_completion[cat] = 0.0
        
        results.append({
            "party": party,
            "scores": score_data,
            "category_distribution": cat_dist,
            "category_completion_rates": cat_completion,
            "rank": 0  # will be set after sorting
        })
    
    # Sort by final score
    results.sort(key=lambda x: x["scores"]["final_score"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1
    
    # Save
    output_path = PROCESSED_DIR / "party_scores.json"
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    return results


def generate_recommendation(scores: List[Dict], 
                              user_category_priority: str = None) -> Dict:
    """Generate a recommendation based on scores."""
    if not scores:
        return {"recommendation": "No data available", "best_party": None}
    
    best = scores[0]  # Highest scoring party
    
    # If user has a priority category, check who does best in that
    if user_category_priority and user_category_priority in CATEGORIES:
        cat_scores = [
            (s["party"], s["category_completion_rates"].get(user_category_priority, 0))
            for s in scores
        ]
        cat_scores.sort(key=lambda x: x[1], reverse=True)
        best_for_category = cat_scores[0][0] if cat_scores else best["party"]
    else:
        best_for_category = None
    
    recommendation = {
        "best_overall": best["party"],
        "best_overall_score": best["scores"]["final_score"],
        "overall_rank": [s["party"] for s in scores],
        "best_for_category": best_for_category,
        "priority_category": user_category_priority,
        "rationale": {
            "completion_leader": max(scores, key=lambda x: x["scores"]["completion_rate"])["party"],
            "coverage_leader": max(scores, key=lambda x: x["scores"]["category_coverage"])["party"],
            "prediction_leader": max(scores, key=lambda x: x["scores"]["predicted_completion_strength"])["party"],
        }
    }
    
    return recommendation


def load_party_scores() -> List[Dict]:
    """Load saved party scores."""
    path = PROCESSED_DIR / "party_scores.json"
    if path.exists():
        with open(path, 'r') as f:
            return json.load(f)
    return []


if __name__ == "__main__":
    from promise_extraction import load_promises
    from classification import classify_promises
    from completion_analysis import analyze_all_completions
    from prediction import predict_completion_probabilities
    
    promises = load_promises()
    if promises:
        classified = classify_promises(promises)
        analyzed = analyze_all_completions(classified, use_scraper=False)
        predicted = predict_completion_probabilities(analyzed)
        scores = score_all_parties(predicted)
        
        print("\nParty Rankings:")
        for s in scores:
            print(f"  #{s['rank']} {s['party']}: {s['scores']['final_score']:.3f}")
        
        rec = generate_recommendation(scores)
        print(f"\nRecommendation: {rec['best_overall']}")