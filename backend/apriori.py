"""
apriori.py - Association rule mining on promise categories using mlxtend
"""
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Dict
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = ["Economy", "Education", "Healthcare", "Infrastructure", "Agriculture",
               "Women", "Youth", "Environment", "Defence", "Others"]


def build_transaction_dataset(promises: List[Dict]) -> List[List[str]]:
    """
    Build transaction dataset where each transaction = one party's set of categories.
    For more granularity, use per-year party as a transaction.
    """
    # Group by label (party_year)
    label_categories = {}
    for p in promises:
        label = p.get("label", p.get("party", "Unknown"))
        category = p.get("category", "Others")
        if label not in label_categories:
            label_categories[label] = set()
        label_categories[label].add(category)
    
    transactions = [list(cats) for cats in label_categories.values()]
    return transactions


def run_apriori(promises: List[Dict], min_support: float = 0.3, min_confidence: float = 0.5) -> Dict:
    """Run Apriori algorithm on promise categories."""
    transactions = build_transaction_dataset(promises)
    
    if len(transactions) < 2:
        return {"frequent_itemsets": [], "rules": [], "error": "Not enough data for Apriori"}
    
    try:
        # Encode transactions
        te = TransactionEncoder()
        te_array = te.fit_transform(transactions)
        df = pd.DataFrame(te_array, columns=te.columns_)
        
        # Lower min_support if needed based on data size
        adjusted_support = min(min_support, 1.0 / len(transactions) * 2)
        adjusted_support = max(adjusted_support, 0.1)
        
        # Find frequent itemsets
        frequent_itemsets = apriori(df, min_support=adjusted_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            return {"frequent_itemsets": [], "rules": [], "transactions": transactions}
        
        frequent_itemsets["length"] = frequent_itemsets["itemsets"].apply(len)
        
        # Generate association rules
        if len(frequent_itemsets) >= 2:
            rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        else:
            rules = pd.DataFrame()
        
        # Format results
        itemsets_list = []
        for _, row in frequent_itemsets.iterrows():
            itemsets_list.append({
                "itemset": list(row["itemsets"]),
                "support": round(float(row["support"]), 3),
                "length": int(row["length"])
            })
        
        rules_list = []
        if not rules.empty:
            for _, row in rules.iterrows():
                rules_list.append({
                    "antecedents": list(row["antecedents"]),
                    "consequents": list(row["consequents"]),
                    "support": round(float(row["support"]), 3),
                    "confidence": round(float(row["confidence"]), 3),
                    "lift": round(float(row["lift"]), 3)
                })
        
        result = {
            "frequent_itemsets": sorted(itemsets_list, key=lambda x: x["support"], reverse=True)[:20],
            "rules": sorted(rules_list, key=lambda x: x["confidence"], reverse=True)[:15],
            "transactions": transactions,
            "min_support_used": adjusted_support,
            "summary": {
                "total_transactions": len(transactions),
                "total_frequent_itemsets": len(itemsets_list),
                "total_rules": len(rules_list)
            }
        }
        
        # Save results
        output_path = PROCESSED_DIR / "apriori_results.json"
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        return result
        
    except Exception as e:
        print(f"Apriori error: {e}")
        return {"frequent_itemsets": [], "rules": [], "error": str(e), "transactions": transactions}


def get_category_cooccurrence(promises: List[Dict]) -> List[Dict]:
    """Get co-occurrence counts between categories across parties."""
    label_categories = {}
    for p in promises:
        label = p.get("label", p.get("party", "Unknown"))
        category = p.get("category", "Others")
        if label not in label_categories:
            label_categories[label] = set()
        label_categories[label].add(category)
    
    cooccurrence = {}
    for cats in label_categories.values():
        cat_list = list(cats)
        for i in range(len(cat_list)):
            for j in range(i + 1, len(cat_list)):
                pair = tuple(sorted([cat_list[i], cat_list[j]]))
                cooccurrence[pair] = cooccurrence.get(pair, 0) + 1
    
    return [
        {"cat1": k[0], "cat2": k[1], "count": v}
        for k, v in sorted(cooccurrence.items(), key=lambda x: x[1], reverse=True)
    ]


if __name__ == "__main__":
    from promise_extraction import load_promises
    from classification import classify_promises
    
    promises = load_promises()
    if promises:
        classified = classify_promises(promises)
        result = run_apriori(classified)
        print(f"Frequent itemsets: {len(result['frequent_itemsets'])}")
        print(f"Association rules: {len(result['rules'])}")
        for rule in result['rules'][:3]:
            print(f"  {rule['antecedents']} => {rule['consequents']} (conf: {rule['confidence']})")
