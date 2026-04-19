"""
promise_extraction.py - Hybrid rule-based + Groq LLM promise extraction
"""
import re
import os
import json
import time
from pathlib import Path
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Promise indicator keywords
PROMISE_KEYWORDS = [
    'will', 'shall', 'commit', 'pledge', 'promise', 'ensure', 'guarantee',
    'provide', 'create', 'build', 'establish', 'introduce', 'launch', 'implement',
    'expand', 'increase', 'reduce', 'improve', 'strengthen', 'develop', 'reform',
    'invest', 'allocate', 'fund', 'double', 'triple', 'achieve', 'deliver',
    'protect', 'promote', 'support', 'encourage', 'boost', 'revamp', 'transform'
]

PROMISE_PATTERN = re.compile(
    r'\b(' + '|'.join(PROMISE_KEYWORDS) + r')\b',
    re.IGNORECASE
)


def rule_based_extraction(sentences: List[str]) -> List[str]:
    """Extract candidate promise sentences using rule-based approach."""
    candidates = []
    for sentence in sentences:
        sentence = sentence.strip()
        # Must contain a promise keyword
        if not PROMISE_PATTERN.search(sentence):
            continue
        # Filter out very short or very long sentences
        word_count = len(sentence.split())
        if word_count < 6 or word_count > 80:
            continue
        # Skip sentences that are mostly numbers (tables, etc.)
        alpha_ratio = sum(c.isalpha() for c in sentence) / max(len(sentence), 1)
        if alpha_ratio < 0.5:
            continue
        candidates.append(sentence)
    return candidates


def groq_extract_promises(text_chunk: str, party: str, year: str) -> List[Dict]:
    """Use Groq API to extract structured promises from text."""
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key or groq_key == "your_groq_api_key_here":
        return []

    try:
        import groq
        client = groq.Groq(api_key=groq_key)

        prompt = f"""Extract political promises from this {party} manifesto text ({year}).

Return ONLY a JSON array of objects. Each object must have:
- "promise": the clean promise statement (1-2 sentences max)
- "category": one of [Economy, Education, Healthcare, Infrastructure, Agriculture, Women, Youth, Environment, Defence, Others]
- "specificity": "high" if contains numbers/targets, else "low"

Rules:
- Extract only actual commitments, not observations
- Each promise must be actionable and specific
- Maximum 20 promises from this chunk
- Return ONLY valid JSON array, no other text

Text:
{text_chunk[:3000]}"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000
        )

        content = response.choices[0].message.content.strip()
        
        # Parse JSON
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        
        promises = json.loads(content)
        if isinstance(promises, list):
            return promises
        return []

    except json.JSONDecodeError:
        return []
    except Exception as e:
        print(f"  Groq API error: {e}")
        return []


def extract_promises_for_manifesto(manifesto: Dict) -> List[Dict]:
    """Extract promises from a single manifesto using hybrid approach."""
    party = manifesto["party"]
    year = manifesto["year"]
    label = manifesto["label"]
    sentences = manifesto.get("sentences", [])
    raw_text = manifesto.get("raw_text", "")
    
    print(f"Extracting promises from {label}...")

    # Step 1: Rule-based filtering
    candidate_sentences = rule_based_extraction(sentences)
    print(f"  Rule-based: {len(candidate_sentences)} candidates")

    # Step 2: Try Groq enhancement
    groq_promises = []
    groq_key = os.getenv("GROQ_API_KEY", "")
    
    if groq_key and groq_key != "your_groq_api_key_here":
        # Split text into chunks of ~3000 chars
        chunk_size = 3000
        text_chunks = [raw_text[i:i+chunk_size] for i in range(0, min(len(raw_text), 15000), chunk_size)]
        
        for i, chunk in enumerate(text_chunks[:4]):  # max 4 chunks
            print(f"  Groq processing chunk {i+1}/{min(len(text_chunks), 4)}...")
            chunk_promises = groq_extract_promises(chunk, party, year)
            groq_promises.extend(chunk_promises)
            time.sleep(0.5)  # Rate limit

    # Step 3: Merge and deduplicate
    all_promises = []
    seen_texts = set()
    
    # Add Groq promises first (higher quality)
    for p in groq_promises:
        text = p.get("promise", "").strip()
        if text and text.lower() not in seen_texts and len(text.split()) >= 5:
            seen_texts.add(text.lower())
            all_promises.append({
                "id": f"{label}_{len(all_promises)}",
                "party": party,
                "year": year,
                "label": label,
                "promise": text,
                "category": p.get("category", "Others"),
                "specificity": p.get("specificity", "low"),
                "source": "groq",
                "completion_status": "Not Started",
                "completion_probability": None
            })

    # Add rule-based candidates not already covered
    for sentence in candidate_sentences:
        if sentence.lower() not in seen_texts and len(all_promises) < 100:
            seen_texts.add(sentence.lower())
            all_promises.append({
                "id": f"{label}_{len(all_promises)}",
                "party": party,
                "year": year,
                "label": label,
                "promise": sentence,
                "category": "Others",  # will be classified later
                "specificity": "low",
                "source": "rule_based",
                "completion_status": "Not Started",
                "completion_probability": None
            })

    print(f"  Total promises extracted: {len(all_promises)}")
    return all_promises


def extract_all_promises(manifestoes: List[Dict]) -> Dict[str, List[Dict]]:
    """Extract promises from all manifestoes."""
    all_party_promises = {}
    all_promises_flat = []

    for manifesto in manifestoes:
        promises = extract_promises_for_manifesto(manifesto)
        label = manifesto["label"]
        all_party_promises[label] = promises
        all_promises_flat.extend(promises)

    # Save to disk
    output_path = PROCESSED_DIR / "promises.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_promises_flat, f, ensure_ascii=False, indent=2)
    
    print(f"\nTotal promises extracted: {len(all_promises_flat)}")
    print(f"Saved to {output_path}")
    
    return all_party_promises


def load_promises() -> List[Dict]:
    """Load cached promises from disk."""
    path = PROCESSED_DIR / "promises.json"
    if path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


if __name__ == "__main__":
    from ingestion import load_all_manifestoes
    from preprocessing import preprocess_all_manifestoes
    
    manifestoes = load_all_manifestoes()
    processed = preprocess_all_manifestoes(manifestoes)
    promises = extract_all_promises(processed)
    for label, p_list in promises.items():
        print(f"{label}: {len(p_list)} promises")
