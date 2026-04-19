"""
preprocessing.py - Tokenization, stopword removal, lemmatization
"""
import re
import json
import nltk
import string
from pathlib import Path
from typing import List, Dict, Tuple
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download required NLTK data
for pkg in ['punkt', 'stopwords', 'wordnet', 'averaged_perceptron_tagger', 'punkt_tab']:
    try:
        nltk.download(pkg, quiet=True)
    except Exception:
        pass

PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

lemmatizer = WordNetLemmatizer()

try:
    STOP_WORDS = set(stopwords.words('english'))
except Exception:
    STOP_WORDS = set()

# Additional domain-specific stopwords
DOMAIN_STOPWORDS = {
    'shall', 'will', 'also', 'would', 'may', 'must', 'need', 'make', 'ensure',
    'provide', 'promote', 'support', 'develop', 'strengthen', 'india', 'government',
    'party', 'national', 'state', 'country', 'people', 'public', 'new', 'policy',
    'plan', 'program', 'scheme', 'initiative', 'continue', 'work', 'implement'
}
STOP_WORDS.update(DOMAIN_STOPWORDS)


def split_into_sentences(text: str) -> List[str]:
    """Split text into clean sentences."""
    try:
        sentences = sent_tokenize(text)
    except Exception:
        sentences = re.split(r'(?<=[.!?])\s+', text)
    
    cleaned = []
    for s in sentences:
        s = s.strip()
        if len(s.split()) >= 5:  # filter too-short sentences
            cleaned.append(s)
    return cleaned


def tokenize(text: str) -> List[str]:
    """Tokenize text into words."""
    try:
        tokens = word_tokenize(text.lower())
    except Exception:
        tokens = text.lower().split()
    return tokens


def remove_stopwords(tokens: List[str]) -> List[str]:
    """Remove stopwords and punctuation from tokens."""
    return [
        t for t in tokens
        if t not in STOP_WORDS
        and t not in string.punctuation
        and len(t) > 2
        and t.isalpha()
    ]


def lemmatize(tokens: List[str]) -> List[str]:
    """Lemmatize tokens."""
    return [lemmatizer.lemmatize(t) for t in tokens]


def preprocess_text(text: str) -> Dict:
    """Full preprocessing pipeline for a text."""
    sentences = split_into_sentences(text)
    tokens = tokenize(text)
    filtered = remove_stopwords(tokens)
    lemmatized = lemmatize(filtered)
    
    return {
        "sentences": sentences,
        "tokens": tokens,
        "filtered_tokens": filtered,
        "lemmatized_tokens": lemmatized,
        "processed_text": " ".join(lemmatized)
    }


def preprocess_sentence(sentence: str) -> str:
    """Preprocess a single sentence for ML features."""
    tokens = tokenize(sentence)
    filtered = remove_stopwords(tokens)
    lemmatized = lemmatize(filtered)
    return " ".join(lemmatized)


def preprocess_all_manifestoes(manifestoes: List[Dict]) -> List[Dict]:
    """Preprocess all manifesto texts."""
    processed = []
    for manifesto in manifestoes:
        print(f"Preprocessing {manifesto['label']}...")
        result = preprocess_text(manifesto['raw_text'])
        processed.append({
            **{k: v for k, v in manifesto.items() if k != 'raw_text'},
            "raw_text": manifesto['raw_text'],
            "sentences": result["sentences"],
            "processed_text": result["processed_text"],
            "token_count": len(result["tokens"]),
            "unique_tokens": len(set(result["lemmatized_tokens"]))
        })
        print(f"  {len(result['sentences'])} sentences, {len(result['tokens'])} tokens")
    
    return processed


if __name__ == "__main__":
    from ingestion import load_all_manifestoes
    manifestoes = load_all_manifestoes()
    processed = preprocess_all_manifestoes(manifestoes)
    print(f"Preprocessed {len(processed)} manifestoes")
