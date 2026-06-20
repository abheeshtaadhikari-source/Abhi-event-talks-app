# BigQuery Release Notes Explorer & Share

A premium, modern web application built using Python Flask and vanilla client-side technologies (HTML, CSS, JavaScript) that fetches, parses, and segments the official Google Cloud BigQuery release notes and provides an integrated workflow to draft and share updates directly to X (Twitter).

Live Repository: [https://github.com/abheeshtaadhikari-source/Abhi-event-talks-app](https://github.com/abheeshtaadhikari-source/Abhi-event-talks-app)

---

## 🌟 Key Features

*   **Sub-Topic Entry Segmentation**: Google Cloud feeds aggregate multiple notes (e.g., standard features, issues, breaking changes) under a single day's Atom entry. The application parses and isolates these so that they can be filtered, searched, and shared individually.
*   **Real-time Search & Category Filters**: Responsive UI filters that narrow down the release notes by text queries or specific update types (Features, Issues, Announcements, Changes, and Breaking Changes).
*   **Smart Tweet Composer**: Standardizes tweets by stripping HTML tags, inserting category metadata, and generating a text draft that dynamically truncates itself to leave room for the source URL (never exceeding **280 characters**).
*   **Dynamic SVG Limit Indicator**: An interactive circle outline in the modal that shrinks and changes color (blue ➔ yellow ➔ red) as the user approaches the character limit.
*   **Double-Channel Sharing**: Allows copying text directly to the system clipboard (with toast confirmation) or opening a pre-filled Twitter/X intent window.
*   **In-Memory Server-side Cache**: Implements a simple cache store that holds fetched notes for **5 minutes** to prevent rate-limiting and maximize page load speeds.

---

## 🛠️ Technology Stack

*   **Backend Server**: Python (version 3.x) with the [Flask](https://flask.palletsprojects.com/) microframework.
*   **XML Parsing**: Python standard library's `xml.etree.ElementTree` for traversing Atom namespaces.
*   **HTML Parsing**: [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) with `lxml` parser for segmenting daily release logs on `<h3>` boundaries.
*   **Client Core**: Vanilla HTML5 (semantic layout) and Vanilla ES6 JavaScript (reactive DOM, state, and SVG operations).
*   **Styling**: Pure CSS3 utilizing deep dark gradients, glassmorphism, responsive grid architectures, and micro-animations.

---

## 📂 Codebase File Structure

*   **[app.py](app.py)**: Python application runner. Handles RSS fetching, HTML sub-topic segmentation, and standard caching policies.
*   **[templates/index.html](templates/index.html)**: Single-page application template housing grid view components and modal shells.
*   **[static/css/style.css](static/css/style.css)**: Stylesheet containing theme variables, backdrop filter styles, card animations, and badge definitions.
*   **[static/js/main.js](static/js/main.js)**: Orchestrates DOM listeners, API integration, filters, and Tweet length calculations.
*   **[requirements.txt](requirements.txt)**: Python package dependency manifest.

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have Python 3 installed. Check your local installation using:
```bash
python --version
```

### Installation & Run Steps

1.  **Clone or navigate to the repository directory**:
    ```bash
    cd bigquery-release-app
    ```

2.  **Install dependencies**:
    Install required libraries using `pip`:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Launch the application**:
    Start the Flask server:
    ```bash
    python app.py
    ```

4.  **Access the application**:
    Open your web browser and navigate to:
    👉 **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🗺️ Future Roadmap

*   **Persistent SQLite Storage**: Store fetched notes in a local SQLite database to support offline access and track historical archive lists.
*   **Automated Twitter OAuth Flow**: Transition from Web Intents to an API-based scheduler to queue or schedule posts directly from the panel.
*   **Interactive Visualizations**: Draw charts showing update frequency by category over time using libraries like Chart.js.
