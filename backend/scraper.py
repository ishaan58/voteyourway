"""
scraper.py - Web scraper for tracking promise completion status
"""
import os
import re
import time
import json
import random
import requests
from pathlib import Path
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from urllib.parse import quote_plus

COMPLETION_DIR = Path(__file__).parent.parent / "data" / "completion"
COMPLETION_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def generate_search_queries(promise: str, party: str) -> List[str]:
    """Generate search queries for a given promise."""
    # Extract key phrases
    words = promise.lower().split()
    # Remove common words
    stopwords = {'the', 'a', 'an', 'to', 'for', 'and', 'or', 'of', 'in', 'on',
                 'will', 'shall', 'we', 'our', 'that', 'this', 'by', 'with', 'is', 'are'}
    key_words = [w for w in words if w not in stopwords and len(w) > 3][:6]
    key_phrase = " ".join(key_words)
    
    queries = [
        f"India {party} {key_phrase} implemented status",
        f"{key_phrase} India government progress 2024",
        f"{party} promise {key_phrase} completed",
        f"India {key_phrase} scheme launched"
    ]
    return queries[:2]  # Limit to 2 queries per promise


def scrape_google_news(query: str, max_articles: int = 3) -> List[Dict]:
    """Scrape Google News for articles matching query."""
    articles = []
    
    try:
        url = f"https://news.google.com/search?q={quote_plus(query)}&hl=en-IN&gl=IN"
        time.sleep(random.uniform(1, 2))
        
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find article links
        for article in soup.find_all('article', limit=max_articles * 2):
            try:
                title_elem = article.find('h3') or article.find('h4')
                if not title_elem:
                    continue
                title = title_elem.get_text(strip=True)
                link_elem = article.find('a')
                if not link_elem:
                    continue
                
                articles.append({
                    "title": title,
                    "url": "",  # Google News URLs are complex
                    "snippet": title,  # Use title as snippet
                    "source": "Google News"
                })
                
                if len(articles) >= max_articles:
                    break
            except Exception:
                continue
                
    except requests.RequestException as e:
        print(f"  Google News error: {e}")
    
    return articles


def scrape_duckduckgo(query: str, max_results: int = 3) -> List[Dict]:
    """Scrape DuckDuckGo for news articles."""
    results = []
    
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        time.sleep(random.uniform(1, 2))
        
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for result in soup.find_all('div', class_='result', limit=max_results * 2):
            try:
                title_elem = result.find('a', class_='result__a')
                snippet_elem = result.find('a', class_='result__snippet')
                
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                href = title_elem.get('href', '')
                
                if title and len(title) > 10:
                    results.append({
                        "title": title,
                        "url": href,
                        "snippet": snippet,
                        "source": "DuckDuckGo"
                    })
                
                if len(results) >= max_results:
                    break
                    
            except Exception:
                continue
                
    except requests.RequestException as e:
        print(f"  DuckDuckGo error: {e}")
    
    return results


def fetch_article_content(url: str, max_chars: int = 2000) -> str:
    """Fetch and clean article content from URL."""
    if not url or not url.startswith('http'):
        return ""
    
    try:
        time.sleep(random.uniform(0.5, 1.5))
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return ""
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unwanted elements
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'ads']):
            tag.decompose()
        
        # Get main content
        content = ""
        for tag in soup.find_all(['p', 'article', 'main']):
            content += tag.get_text(separator=' ', strip=True) + ' '
        
        # Clean
        content = re.sub(r'\s+', ' ', content).strip()
        return content[:max_chars]
        
    except Exception:
        return ""


def search_for_promise(promise: str, party: str, max_retries: int = 2) -> List[Dict]:
    """Search for news articles about a specific promise with retry logic."""
    queries = generate_search_queries(promise, party)
    all_articles = []
    
    for query in queries:
        for attempt in range(max_retries):
            try:
                articles = scrape_duckduckgo(query)
                all_articles.extend(articles)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    print(f"  Failed after {max_retries} attempts: {e}")
    
    # Deduplicate
    seen_titles = set()
    unique_articles = []
    for a in all_articles:
        if a['title'] not in seen_titles:
            seen_titles.add(a['title'])
            unique_articles.append(a)
    
    return unique_articles[:5]


def scrape_completion_data(promises: List[Dict], batch_size: int = 10, 
                            delay: float = 2.0) -> List[Dict]:
    """
    Scrape completion data for a batch of promises.
    Returns promises with scraped_articles attached.
    """
    results = []
    
    for i, promise in enumerate(promises[:batch_size]):
        print(f"  Scraping [{i+1}/{min(len(promises), batch_size)}]: {promise['promise'][:50]}...")
        
        articles = search_for_promise(promise['promise'], promise['party'])
        
        promise_copy = dict(promise)
        promise_copy["scraped_articles"] = articles
        promise_copy["article_count"] = len(articles)
        results.append(promise_copy)
        
        time.sleep(delay)
    
    return results


def save_scraping_results(results: List[Dict], party: str):
    """Save scraping results to disk."""
    output_path = COMPLETION_DIR / f"{party}_scraped.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved scraping results to {output_path}")


if __name__ == "__main__":
    # Test with a sample promise
    test_promise = {
        "promise": "Build 100 new airports across India",
        "party": "BJP",
        "year": "2019"
    }
    articles = search_for_promise(test_promise["promise"], test_promise["party"])
    print(f"Found {len(articles)} articles")
    for a in articles:
        print(f"  - {a['title'][:80]}")
