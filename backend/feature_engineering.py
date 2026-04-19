"""
feature_engineering.py - TF-IDF vectorization and feature engineering
"""
import re
import json
import numpy as np
import joblib
from pathlib import Path
from typing import List, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from preprocessing import preprocess_sentence

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Domain keyword indicators
KEYWORD_GROUPS = {
    "budget": ["budget", "crore", "lakh", "billion", "million", "fund", "allocat", "invest", "expenditure", "fiscal"],
    "policy": ["policy", "act", "law", "legislation", "reform", "regulation", "bill", "amendment", "scheme"],
    "infrastructure": ["road", "highway", "bridge", "railway", "airport", "port", "metro", "smart city", "construction"],
    "social": ["poor", "farmer", "women", "child", "youth", "elderly", "tribal", "minority", "dalit", "backward"],
    "digital": ["digital", "internet", "technology", "ai", "data", "online", "cyber", "software", "startup"],
    "employment": ["job", "employ", "skill", "training", "apprentice", "wage", "salary", "labour", "work"],
    "security": ["security", "defence", "army", "police", "border", "terrorism", "safety", "crime"],
    "environment": ["environment", "climate", "green", "renewable", "solar", "energy", "pollution", "forest", "water"],
}


def compute_keyword_features(text: str) -> Dict[str, int]:
    """Check presence of domain keywords in text."""
    text_lower = text.lower()
    features = {}
    for group, keywords in KEYWORD_GROUPS.items():
        features[f"has_{group}"] = int(any(kw in text_lower for kw in keywords))
    return features


def build_tfidf_vectorizer(texts: List[str], max_features: int = 500) -> Tuple:
    """Build and fit TF-IDF vectorizer."""
    preprocessed = [preprocess_sentence(t) for t in texts]
    
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.95,
        sublinear_tf=True
    )
    
    tfidf_matrix = vectorizer.fit_transform(preprocessed)
    
    # Save vectorizer
    joblib.dump(vectorizer, MODELS_DIR / "tfidf_vectorizer.pkl")
    
    return vectorizer, tfidf_matrix, preprocessed


def load_vectorizer():
    """Load saved TF-IDF vectorizer."""
    path = MODELS_DIR / "tfidf_vectorizer.pkl"
    if path.exists():
        return joblib.load(path)
    return None


def engineer_features(promises: List[Dict], vectorizer=None, fit=True) -> Tuple[np.ndarray, List[str]]:
    """
    Engineer features for ML models.
    Returns feature matrix and feature names.
    """
    if not promises:
        return np.array([]), []

    texts = [p["promise"] for p in promises]
    
    # TF-IDF features
    if fit or vectorizer is None:
        vectorizer, tfidf_matrix, _ = build_tfidf_vectorizer(texts)
    else:
        preprocessed = [preprocess_sentence(t) for t in texts]
        tfidf_matrix = vectorizer.transform(preprocessed)
    
    tfidf_dense = tfidf_matrix.toarray()
    
    # Handcrafted features
    handcrafted = []
    for p in promises:
        text = p["promise"]
        kw_features = compute_keyword_features(text)
        
        word_count = len(text.split())
        has_number = int(bool(re.search(r'\d+', text)))
        has_percent = int(bool(re.search(r'\d+\s*%', text)))
        has_year = int(bool(re.search(r'\b(20\d\d)\b', text)))
        specificity_score = 1 if p.get("specificity") == "high" else 0
        
        row = [
            word_count / 50.0,  # normalized length
            has_number,
            has_percent,
            has_year,
            specificity_score,
        ] + list(kw_features.values())
        
        handcrafted.append(row)
    
    handcrafted_arr = np.array(handcrafted)
    
    # Combine TF-IDF and handcrafted
    combined = np.hstack([tfidf_dense, handcrafted_arr])
    
    feature_names = (
        vectorizer.get_feature_names_out().tolist() +
        ["word_count", "has_number", "has_percent", "has_year", "specificity"] +
        [f"has_{g}" for g in KEYWORD_GROUPS.keys()]
    )
    
    return combined, feature_names, vectorizer


def get_tfidf_for_promises(promises: List[Dict], vectorizer=None) -> np.ndarray:
    """Get just the TF-IDF vectors for promises."""
    texts = [preprocess_sentence(p["promise"]) for p in promises]
    if vectorizer is None:
        vectorizer = load_vectorizer()
    if vectorizer is None:
        vec = TfidfVectorizer(max_features=200, ngram_range=(1, 2))
        matrix = vec.fit_transform(texts)
    else:
        matrix = vectorizer.transform(texts)
    return matrix.toarray()


if __name__ == "__main__":
    from promise_extraction import load_promises
    promises = load_promises()
    if promises:
        features, names, vec = engineer_features(promises)
        print(f"Feature matrix shape: {features.shape}")
        print(f"First 5 feature names: {names[:5]}")
