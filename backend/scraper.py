import os
import requests
import urllib.parse
from bs4 import BeautifulSoup

# 데이터 저장 폴더 설정
CACHE_DIR = "persona_cache"
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

def fetch_namuwiki_persona(slug: str) -> str:
    # 1. 캐시 확인
    file_path = os.path.join(CACHE_DIR, f"{slug}.txt")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    # 2. 캐시가 없으면 크롤링 수행
    encoded_slug = urllib.parse.quote(slug)
    url = f"https://namu.wiki/w/{encoded_slug}"
    headers = {"User-Agent": "Mozilla/5.0 ..."}
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        # (기존 섹션 파싱 로직...)
        content = soup.get_text()[:3000] # 예시용
        
        # 3. 결과를 파일로 저장 (다음 요청을 위해)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return content
    except:
        return "데이터 로드 실패"