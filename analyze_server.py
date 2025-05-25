from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        print("Request Received！")
        print("Raw request.data content：", request.data)

        # Analyze JSON safely，Do not allow Flask to throw exceptions automatically
        try:
            data = request.get_json(force=True)
            print("Successly analyze JSON：")
            print(data)
        except Exception as e:
            print("Failed to analyze JSON：", e)
            return jsonify({"error": f"Failed to analyze JSON：{str(e)}"}), 400

        force_data = data.get("forceTrace", [])
        result = {
            "summary": {
                "normal": sum(1 for entry in force_data if max(entry["pressure"]) > 0.3),
                "too_weak": sum(1 for entry in force_data if max(entry["pressure"]) <= 0.2)
            },
        }

        # Generate prompt
        prompt = generate_prompt(result)
        result["prompt"] = prompt

        return jsonify(result)

    except Exception as e:
        print("Backend processing error：", str(e))
        return jsonify({"error": str(e)}), 500

def generate_prompt(result):
    summary = result["summary"]
    total = summary["normal"] + summary["too_weak"]

    prompt = f"""
        In the last session, the player had:
        - {summary['normal']} normal
        - {summary['too_weak']} too weak
        Out of {total} presses.
    """ 
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
