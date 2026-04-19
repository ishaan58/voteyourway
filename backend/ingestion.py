"""
ingestion.py - Load and parse manifesto PDF files
"""
import os
import re
import json
import pdfplumber
import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict, List, Optional


MANIFESTOES_DIR = Path(__file__).parent.parent / "data" / "manifestoes"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"


def extract_text_pdfplumber(pdf_path: str) -> str:
    """Extract text from PDF using pdfplumber."""
    text_parts = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        print(f"pdfplumber failed for {pdf_path}: {e}")
        return ""
    return "\n".join(text_parts)


def extract_text_pymupdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF as fallback."""
    text_parts = []
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text = page.get_text("text")
            if text:
                text_parts.append(text)
        doc.close()
    except Exception as e:
        print(f"PyMuPDF failed for {pdf_path}: {e}")
        return ""
    return "\n".join(text_parts)


def clean_extracted_text(raw_text: str) -> str:
    """Clean and normalize extracted PDF text."""
    if not raw_text:
        return ""

    # Remove excessive whitespace but preserve sentence boundaries
    text = re.sub(r'\r\n', '\n', raw_text)
    text = re.sub(r'\r', '\n', text)

    # Fix broken sentences: join lines that don't end with punctuation
    lines = text.split('\n')
    cleaned_lines = []
    buffer = ""

    for line in lines:
        line = line.strip()
        if not line:
            if buffer:
                cleaned_lines.append(buffer)
                buffer = ""
            continue

        # If line is very short (likely a header or page artifact), keep as-is
        if len(line) < 5:
            if buffer:
                cleaned_lines.append(buffer)
                buffer = ""
            cleaned_lines.append(line)
            continue

        # If buffer exists and current line starts lowercase, it's a continuation
        if buffer and line and line[0].islower():
            buffer = buffer.rstrip() + " " + line
        elif buffer and not buffer.rstrip().endswith(('.', '!', '?', ':', ';')):
            buffer = buffer.rstrip() + " " + line
        else:
            if buffer:
                cleaned_lines.append(buffer)
            buffer = line

    if buffer:
        cleaned_lines.append(buffer)

    text = "\n".join(cleaned_lines)

    # Remove multiple consecutive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove page numbers (common patterns)
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text)

    # Fix common PDF artifacts
    text = re.sub(r'([a-z])-\n([a-z])', r'\1\2', text)  # hyphenated line breaks
    text = re.sub(r'  +', ' ', text)  # multiple spaces

    return text.strip()


def parse_party_name(filename: str) -> Dict[str, str]:
    """Parse party name and year from filename like 'bjp_2019.pdf'."""
    stem = Path(filename).stem.lower()
    parts = stem.split('_')
    
    party_map = {
        'bjp': 'BJP',
        'inc': 'INC',
        'aap': 'AAP',
        'sp': 'SP',
        'bsp': 'BSP',
        'cpi': 'CPI',
        'tmc': 'TMC',
        'ncp': 'NCP',
    }
    
    party_code = parts[0] if parts else stem
    year = parts[1] if len(parts) > 1 else "unknown"
    party_name = party_map.get(party_code, party_code.upper())
    
    return {
        "party": party_name,
        "party_code": party_code,
        "year": year,
        "label": f"{party_name}_{year}"
    }


def load_manifesto(pdf_path: str) -> Optional[Dict]:
    """Load a single manifesto PDF and return structured data."""
    filename = os.path.basename(pdf_path)
    meta = parse_party_name(filename)
    
    print(f"Loading: {filename}")

    # Try pdfplumber first, fallback to PyMuPDF
    raw_text = extract_text_pdfplumber(pdf_path)
    if len(raw_text.strip()) < 100:
        print(f"  pdfplumber got little text, trying PyMuPDF...")
        raw_text = extract_text_pymupdf(pdf_path)

    if not raw_text.strip():
        print(f"  WARNING: Could not extract text from {filename}")
        return None

    cleaned_text = clean_extracted_text(raw_text)
    word_count = len(cleaned_text.split())

    print(f"  Extracted {word_count} words from {filename}")

    return {
        "filename": filename,
        "party": meta["party"],
        "party_code": meta["party_code"],
        "year": meta["year"],
        "label": meta["label"],
        "raw_text": cleaned_text,
        "word_count": word_count,
        "char_count": len(cleaned_text)
    }


def load_all_manifestoes() -> List[Dict]:
    """Load all manifesto PDFs from the manifestoes directory."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    if not MANIFESTOES_DIR.exists():
        MANIFESTOES_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Created manifestoes directory: {MANIFESTOES_DIR}")
        return []

    pdf_files = sorted(MANIFESTOES_DIR.glob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {MANIFESTOES_DIR}")
        return []

    manifestoes = []
    for pdf_path in pdf_files:
        data = load_manifesto(str(pdf_path))
        if data:
            manifestoes.append(data)

    # Cache to disk
    cache_path = PROCESSED_DIR / "manifestoes_cache.json"
    cache_data = [{k: v for k, v in m.items() if k != 'raw_text'} for m in manifestoes]
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)

    print(f"\nLoaded {len(manifestoes)} manifestoes.")
    return manifestoes


def get_party_list() -> List[Dict]:
    """Return list of available parties from loaded manifestoes."""
    manifestoes = load_all_manifestoes()
    parties = {}
    for m in manifestoes:
        key = m["party"]
        if key not in parties:
            parties[key] = {"party": m["party"], "years": [], "files": []}
        parties[key]["years"].append(m["year"])
        parties[key]["files"].append(m["filename"])
    return list(parties.values())


if __name__ == "__main__":
    data = load_all_manifestoes()
    for d in data:
        print(f"{d['label']}: {d['word_count']} words")
