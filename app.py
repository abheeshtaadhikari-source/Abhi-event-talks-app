import datetime
import logging
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent hitting Google's feeds too frequently
cache = {
    "data": None,
    "last_fetched": None
}
CACHE_DURATION = datetime.timedelta(minutes=5)

def parse_sub_updates(content_html):
    """
    Parses the HTML content of an entry to split it by <h3> tags
    into individual release note items (e.g. Feature, Issue, Announcement).
    """
    if not content_html:
        return []
        
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    current_type = None
    current_nodes = []
    
    for child in soup.contents:
        if child.name == 'h3':
            # Save the previous update if we have one
            if current_type and current_nodes:
                updates.append({
                    "type": current_type,
                    "content_html": "".join(str(n) for n in current_nodes).strip()
                })
            current_type = child.get_text().strip()
            current_nodes = []
        elif current_type:
            current_nodes.append(child)
            
    # Save the last update
    if current_type and current_nodes:
        updates.append({
            "type": current_type,
            "content_html": "".join(str(n) for n in current_nodes).strip()
        })
        
    # Fallback if there are no <h3> tags
    if not updates and content_html.strip():
        updates.append({
            "type": "Update",
            "content_html": content_html.strip()
        })
        
    return updates

def fetch_release_notes():
    """
    Fetches the Atom feed and parses it into structured JSON-serializable list.
    """
    logger.info("Fetching release notes from feed...")
    response = requests.get(FEED_URL, timeout=10)
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    namespace = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_items = []
    
    for entry in root.findall('atom:entry', namespace):
        date_title = entry.find('atom:title', namespace).text
        entry_id = entry.find('atom:id', namespace).text
        updated = entry.find('atom:updated', namespace).text
        
        link_elem = entry.find('atom:link[@rel="alternate"]', namespace)
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespace)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse individual sub-updates in the entry
        sub_updates = parse_sub_updates(content_html)
        
        for idx, sub in enumerate(sub_updates):
            parsed_items.append({
                "id": f"{entry_id}_{idx}",
                "date": date_title,
                "updated_timestamp": updated,
                "link": link,
                "type": sub["type"],
                "content_html": sub["content_html"]
            })
            
    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    now = datetime.datetime.now()
    
    # Check cache validity
    if cache["data"] and cache["last_fetched"] and (now - cache["last_fetched"] < CACHE_DURATION):
        logger.info("Serving release notes from cache")
        return jsonify({
            "source": "cache",
            "last_fetched": cache["last_fetched"].isoformat(),
            "notes": cache["data"]
        })
        
    try:
        notes = fetch_release_notes()
        cache["data"] = notes
        cache["last_fetched"] = now
        return jsonify({
            "source": "live",
            "last_fetched": now.isoformat(),
            "notes": notes
        })
    except Exception as e:
        logger.error(f"Error fetching release notes: {e}")
        # If live fetch fails but cache has older data, serve cache
        if cache["data"]:
            return jsonify({
                "source": "stale-cache",
                "last_fetched": cache["last_fetched"].isoformat(),
                "notes": cache["data"],
                "error": str(e)
            })
        return jsonify({"error": f"Failed to fetch release notes: {str(e)}"}), 500

@app.route('/api/notes/refresh', methods=['POST'])
def force_refresh():
    try:
        notes = fetch_release_notes()
        cache["data"] = notes
        cache["last_fetched"] = datetime.datetime.now()
        return jsonify({
            "source": "live-refresh",
            "last_fetched": cache["last_fetched"].isoformat(),
            "notes": notes
        })
    except Exception as e:
        logger.error(f"Error forcing refresh: {e}")
        return jsonify({"error": f"Failed to refresh: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
