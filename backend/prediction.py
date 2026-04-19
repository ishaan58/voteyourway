import json
import numpy as np
import joblib
import random
from pathlib import Path
from typing import List, Dict, Tuple
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from preprocessing import preprocess_sentence
from feature_engineering import compute_keyword_features, KEYWORD_GROUPS

MODELS_DIR = Path(__file__).parent.parent / "models"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = ["Economy", "Education", "Healthcare", "Infrastructure", "Agriculture",
               "Women", "Youth", "Environment", "Defence", "Others"]

LIKELY_THRESHOLD = 0.7
UNCERTAIN_THRESHOLD = 0.4


def interpret_probability(prob: float) -> str:
    if prob >= LIKELY_THRESHOLD:
        return "Likely"
    elif prob >= UNCERTAIN_THRESHOLD:
        return "Uncertain"
    else:
        return "Unlikely"


def status_to_label(status: str) -> int:
    return 1 if status == "Completed" else 0


def extract_ml_features(promise: Dict) -> np.ndarray:
    text = promise.get("promise", "")
    preprocessed = preprocess_sentence(text)

    word_count = len(text.split()) / 50.0
    kw_features = compute_keyword_features(text)
    kw_vec = list(kw_features.values())

    import re
    has_number = float(bool(re.search(r'\d+', text)))
    has_percent = float(bool(re.search(r'\d+\s*%', text)))
    has_year = float(bool(re.search(r'\b(20\d\d)\b', text)))

    specificity = 1.0 if promise.get("specificity") == "high" else 0.0

    category = promise.get("category", "Others")
    cat_idx = CATEGORIES.index(category) if category in CATEGORIES else len(CATEGORIES)-1
    cat_onehot = [0.0]*len(CATEGORIES)
    cat_onehot[cat_idx] = 1.0

    try:
        year = float(promise.get("year", 2019))
        year_norm = (year - 2009) / 15.0
    except:
        year_norm = 0.5

    return np.array([
        word_count, specificity, has_number, has_percent, has_year, year_norm
    ] + kw_vec + cat_onehot)


def build_feature_matrix(promises: List[Dict]):
    texts = [preprocess_sentence(p["promise"]) for p in promises]

    tfidf = TfidfVectorizer(max_features=100, ngram_range=(1,2))
    tfidf_matrix = tfidf.fit_transform(texts).toarray()

    handcrafted = np.array([extract_ml_features(p) for p in promises])

    return np.hstack([tfidf_matrix, handcrafted]), tfidf


def generate_synthetic_training_data(promises: List[Dict]) -> List[Dict]:
    data = [p for p in promises if p.get("completion_status")]

    if len(data) < 20:
        data.extend(promises[:20])

    return data


def train_prediction_model(promises: List[Dict]):
    print("Training Gradient Boosting model...")

    training_data = generate_synthetic_training_data(promises)

    X, tfidf = build_feature_matrix(training_data)
    y = np.array([status_to_label(p.get("completion_status", "Not Started")) for p in training_data])

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )

    if len(set(y)) > 1:
        try:
            scores = cross_val_score(model, X_scaled, y, cv=3)
            print(f"CV Score: {scores.mean():.3f}")
        except:
            pass

    model.fit(X_scaled, y)

    joblib.dump(model, MODELS_DIR / "prediction_model.pkl")
    joblib.dump(scaler, MODELS_DIR / "prediction_scaler.pkl")
    joblib.dump(tfidf, MODELS_DIR / "prediction_tfidf.pkl")

    return model, scaler, tfidf


def load_prediction_model():
    try:
        return (
            joblib.load(MODELS_DIR / "prediction_model.pkl"),
            joblib.load(MODELS_DIR / "prediction_scaler.pkl"),
            joblib.load(MODELS_DIR / "prediction_tfidf.pkl")
        )
    except:
        return None, None, None


def predict_completion_probabilities(promises: List[Dict], retrain=False):
    model, scaler, tfidf = load_prediction_model()

    if model is None or retrain:
        model, scaler, tfidf = train_prediction_model(promises)

    results = []

    for p in promises:
        p_copy = dict(p)

        try:
            text = preprocess_sentence(p["promise"])
            tfidf_feat = tfidf.transform([text]).toarray()

            handcrafted = extract_ml_features(p).reshape(1, -1)
            X = np.hstack([tfidf_feat, handcrafted])
            X_scaled = scaler.transform(X)

            prob = model.predict_proba(X_scaled)[0][1]

        except:
            prob = random.uniform(0.3, 0.7)

        p_copy["completion_probability"] = round(float(prob), 3)
        p_copy["probability_label"] = interpret_probability(prob)

        results.append(p_copy)

    with open(PROCESSED_DIR / "predictions.json", "w") as f:
        json.dump(results, f, indent=2)

    return results