from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import json
import numpy as np
from scipy.signal import find_peaks

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        # Analyze JSON safely，Do not allow Flask to throw exceptions automatically
        try:
            data = request.get_json(force=True)
            print("Received JSON with", len(data["forceTrace"]), "data points")
        except Exception as e:
            print("Failed to analyze JSON：", e)
            return jsonify({"error": f"Failed to analyze JSON：{str(e)}"}), 400    
        
        tagged = analyze_force_trace(data)
        tag_count = {}
        for item in tagged:
            for tag in item["tags"]:
                tag_count[tag] = tag_count.get(tag, 0) + 1

        result = {
            "summary": tag_count,
            "forceTrace": data["forceTrace"],
            "expectedNotes": data["expectedNotes"]
        }

        # Generate prompt
        result["prompt"] = generate_prompt(result)
        return jsonify(result)

    except Exception as e:
        print("Backend processing error：", str(e))
        return jsonify({"error": str(e)}), 500

def generate_prompt(result):
    summary = result["summary"]
    total = sum(summary.values())

    prompt = f"In the last session, the player had:{total} presses:\n"
    for tag, count in summary.items():
        prompt += f"- {count} {tag.replace('_', ' ')}\n"
    prompt += "\n\nPlease give friendly and concise feedback."
    return prompt

@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.get_json()
    prompt = data.get("prompt", "")

    def stream():
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "mistral", "prompt": prompt, "stream": True},
            stream=True
        )
        for line in response.iter_lines():
            if line:
                try:
                    line = line.decode("utf-8").strip()
                    if line.startswith("data: "):
                        line = line[len("data: "):]
                    chunk = json.loads(line)
                    if "response" in chunk:
                        yield chunk["response"]
                except:
                    continue

    return Response(stream(), content_type="text/plain")

def analyze_force_trace(data):
    force_trace = data["forceTrace"]
    expected_notes = data["expectedNotes"]

    # === Parameters ===
    window_ms = 1000
    min_peak_height = 0.1
    min_prominence = 0.05
    min_distance = 3
    press_start_threshold = 0.1
    press_end_threshold = 0.1

    # Feature thresholds (in seconds or force units)
    delay_threshold = 0.8
    early_threshold = -0.7
    short_threshold = 0.3
    long_threshold = 0.8
    weak_threshold = 0.3       # directly using raw pressure values (0 ~ 1)
    strong_threshold = 0.9

    # === Extract time and pressure ===
    times = np.array([pt["time"] for pt in force_trace])
    pressures_all = np.array([pt["pressure"] for pt in force_trace])  # (N, 3)

    # === Peak detection ===
    peak_dict = {0: [], 1: [], 2: []}
    for lane in range(3):
        pressure = pressures_all[:, lane]
        peaks, _ = find_peaks(
            pressure,
            height=min_peak_height,
            distance=min_distance,
            prominence=min_prominence
        )
        for idx in peaks:
            peak_dict[lane].append({
                "time": times[idx],
                "index": idx
            })

    # === Match peaks to expected notes ===
    candidates = []
    for note_idx, note in enumerate(expected_notes):
        t_note = note["time"]
        lane = note["lane"]
        for peak in peak_dict[lane]:
            t_peak = peak["time"]
            if abs(t_peak - t_note) <= window_ms:
                time_diff = abs(t_peak - t_note)
                candidates.append((time_diff, note_idx, peak["index"], lane))

    # === Greedy match ===
    candidates.sort()
    note_matched = set()
    peak_matched = {0: set(), 1: set(), 2: set()}
    tagged_curves = []

    for _, note_idx, peak_idx, lane in candidates:
        note = expected_notes[note_idx]
        t_note = note["time"]
        t_peak = times[peak_idx]

        if note_idx in note_matched or t_peak in peak_matched[lane]:
            continue

        # Find start time
        start_idx = peak_idx
        while start_idx > 0 and pressures_all[start_idx, lane] > press_start_threshold:
            start_idx -= 1
        start_time = times[start_idx]

        # Find end time
        end_idx = peak_idx
        while end_idx < len(times) - 1 and pressures_all[end_idx, lane] > press_end_threshold:
            end_idx += 1
        end_time = times[end_idx]

        # Extend segment for analysis
        start_idx_seg = max(0, start_idx - 10)
        end_idx_seg = min(len(times) - 1, end_idx + 10)

        time_segment = times[start_idx_seg:end_idx_seg + 1].tolist()
        pressure_segment = pressures_all[start_idx_seg:end_idx_seg + 1, lane].tolist()

        # === Feature extraction ===
        time_offset = (start_time - t_note) / 1000.0
        duration = (end_time - start_time) / 1000.0
        pressure_array = np.array(pressure_segment)
        max_force = np.max(pressure_array)
        std_force = np.std(pressure_array)
        valley_idx, valleys = find_peaks(-pressure_array, distance=3, prominence=0.01)
        num_valleys = len(valley_idx)

        # === Tagging ===
        tags = []
        if time_offset > delay_threshold:
            tags.append("delay")
        if time_offset < early_threshold:
            tags.append("early")
        if duration < short_threshold:
            tags.append("too_short")
        if duration > long_threshold:
            tags.append("too_long")
        if max_force < weak_threshold:
            tags.append("too_weak")
        if max_force > strong_threshold:
            tags.append("too_strong")
        if num_valleys > 0:
            tags.append("jittery")

        if not tags:
            tags = ["normal"]

        # === Store result ===
        tagged_curves.append({
            "lane": lane,
            "note_time": int(t_note),
            "start_time": int(start_time),
            "peak_time": int(t_peak),
            "end_time": int(end_time),
            "time": time_segment,
            "pressure": pressure_segment,
            "features": {
                "time_offset": round(time_offset, 3),
                "duration": round(duration, 3),
                "max_force": round(max_force, 4),
                "std_force": round(std_force, 4),
                "num_valleys": num_valleys
            },
            "tags": tags
        })

        note_matched.add(note_idx)
        peak_matched[lane].add(t_peak)
    return tagged_curves
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
