# Analysis Module Documentation

## Overview

The `analysis` module performs automated post-session analysis of dome press data collected from the Rhythm Keys game. It tags each press using a classification model, duration, and force characteristics, and generates AI-driven feedback to assist in patient rehabilitation.

## Architecture

- **Backend:** Python 3.8+, Flask + Flask-CORS
- **Analysis:** Rule-based classifier using NumPy and SciPy
- **AI Feedback:** Local Large Language Model (LLM) served via Ollama, using `mistral` model
- **Frontend:** JavaScript (fetch API integrated into Analysis tab)

## Setup & Usage

### 1️. Start LLM Server
First, install Ollama from [https://ollama.com](https://ollama.com) and follow the installation instructions for your platform.

Then, start the Ollama server:

```bash
ollama serve
```

Check that the `mistral` model is available:

```bash
ollama pull mistral
```
This command downloads the mistral model if it is not already present locally.
You only need to run it once, or when updating the model.

### 2️. Start Analyze Server

Run the Flask server:

```bash
python analyze_server.py
```

The server will listen on:

```
http://127.0.0.1:5000
```

### 3️. Run Analysis

1. Play a Rhythm Keys game session.
2. After the session, go to the "Analysis" tab in the web interface.
3. Click **"Start Analysis"**:

   * The frontend sends a POST request to `/analyze` with game data.
   * The server returns:

     * A classification summary
     * A feedback prompt
   * The frontend then sends the prompt to `/feedback`.
   * The AI feedback is streamed back and displayed.

If only the `/analyze` endpoint is used (without starting the Ollama server), the system will still generate and display the tag summary and pressure curves. The AI Feedback panel will remain at "Waiting for AI feedback...", and the terminal will display an error message when the `/feedback` request fails.


## API Endpoints

### `/analyze` (POST)

**Input:**

```json
{
  "forceTrace": [ ... ],
  "expectedNotes": [ ... ]
}
```

**Output:**

```json
{
  "summary": { ... },
  "tagged": [ ... ],
  "prompt": "..."
}
```

### `/feedback` (POST)

**Input:**

```json
{
  "prompt": "..."
}
```

**Output:**

* Streams textual feedback from the local Ollama server running the mistral model.

## Notes

* Both the **Ollama server** and **analyze_server.py** must be running for full analysis functionality.
* The **AI Feedback feature is optional**. If the Ollama server is not running, the module will still provide the classification summary and pressure curve visualization. The AI Feedback panel will simply not display any feedback.
* The AI model used (`mistral`) is specified in the `/feedback` route of `analyze_server.py`.
* The current classifier is rule-based (using thresholds on timing, force, and duration).
  It can be replaced with ML models (e.g., Random Forest or CNN) in future versions.


## Future Improvements

* Integrate ML-based press classification (Random Forest, CNN).
* Expose classification thresholds and model parameters via config.
* Improve robustness of peak detection.

