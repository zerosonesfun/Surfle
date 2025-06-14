import json
import os
import re
from collections import defaultdict

# Regex to match http(s) URLs
url_pattern = re.compile(r'https?://[^\s",}]+')

def extract_urls(obj):
    """Recursively extract all URLs from JSON values."""
    urls = []
    if isinstance(obj, dict):
        for v in obj.values():
            urls.extend(extract_urls(v))
    elif isinstance(obj, list):
        for item in obj:
            urls.extend(extract_urls(item))
    elif isinstance(obj, str):
        urls.extend(url_pattern.findall(obj))
    return urls

duplicate_found = False

for file in os.listdir('.'):
    if file.endswith('.json'):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                urls = extract_urls(data)
                seen = set()
                dups = set()
                for url in urls:
                    if url in seen:
                        dups.add(url)
                    else:
                        seen.add(url)

                if dups:
                    duplicate_found = True
                    print(f"\n❌ Duplicate URLs in `{file}`:")
                    for url in dups:
                        print(f"  - {url}")

        except Exception as e:
            print(f"⚠️ Failed to parse {file}: {e}")

if duplicate_found:
    exit(1)
else:
    print("✅ No duplicate URLs found within any individual .json file.")
