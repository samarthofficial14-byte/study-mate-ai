"""
StudyMate AI - Main Flask Application Server
An AI-powered study companion that helps students understand concepts,
summarize notes, generate quizzes, and prepare for exams using their own study material.
"""

import os
import io
import json
from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

from pdf_extractor import extract_text_from_pdf
import ai_engine

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload


@app.route('/')
def index():
    """Serves the main single-page application dashboard."""
    return render_template('index.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    """Returns system status and configured AI engines."""
    has_gemini = bool(os.environ.get('GEMINI_API_KEY'))
    has_openai = bool(os.environ.get('OPENAI_API_KEY'))
    return jsonify({
        "status": "healthy",
        "app_name": "StudyMate AI",
        "version": "1.0.0",
        "engines": {
            "gemini": has_gemini,
            "openai": has_openai,
            "smart_local_nlp": True
        }
    })


@app.route('/api/sample-notes/<topic>', methods=['GET'])
def get_sample_notes(topic):
    """Provides ready-to-use sample study material for instant 1-click demoing."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_map = {
        "cpu_scheduling": "sample_data/cpu_scheduling.txt",
        "machine_learning": "sample_data/machine_learning.txt"
    }
    
    relative_path = file_map.get(topic)
    if not relative_path:
        return jsonify({"error": "Sample topic not found"}), 404
        
    full_path = os.path.join(base_dir, relative_path)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify({
            "topic": topic,
            "content": content,
            "char_count": len(content),
            "word_count": len(content.split())
        })
    return jsonify({"error": "File does not exist"}), 404


@app.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    """Receives uploaded PDF file and returns extracted textual content."""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded in request"}), 400
        
    file = request.files['file']
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"success": False, "error": "Uploaded file must be a PDF document"}), 400

    try:
        pdf_bytes = io.BytesIO(file.read())
        result = extract_text_from_pdf(pdf_bytes)
        return jsonify(result), (200 if result["success"] else 400)
    except Exception as e:
        return jsonify({"success": False, "error": f"Internal PDF extraction error: {str(e)}"}), 500


@app.route('/api/doubt-solver', methods=['POST'])
def handle_doubt_solver():
    """Feature 1: AI Doubt Solver."""
    data = request.get_json(force=True) or {}
    question = data.get("question", "").strip()
    if not question:
        return jsonify({"error": "Please provide a question to solve."}), 400
        
    context = data.get("context", "")
    level = data.get("level", "beginner")
    custom_api_key = data.get("api_key")
    
    result = ai_engine.solve_doubt(question, context, level, custom_api_key)
    return jsonify(result)


@app.route('/api/summarize', methods=['POST'])
def handle_summarize():
    """Feature 2: Notes Summarizer."""
    data = request.get_json(force=True) or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Please provide study notes to summarize."}), 400
        
    focus_area = data.get("focus_area", "comprehensive")
    custom_api_key = data.get("api_key")
    
    result = ai_engine.summarize_notes(content, focus_area, custom_api_key)
    return jsonify(result)


@app.route('/api/generate-quiz', methods=['POST'])
def handle_generate_quiz():
    """Feature 3: Automatic Quiz Generator."""
    data = request.get_json(force=True) or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Please provide study notes to generate a quiz."}), 400
        
    num_questions = int(data.get("num_questions", 5))
    difficulty = data.get("difficulty", "medium")
    custom_api_key = data.get("api_key")
    
    result = ai_engine.generate_quiz(content, num_questions, difficulty, custom_api_key)
    return jsonify(result)


@app.route('/api/generate-flashcards', methods=['POST'])
def handle_generate_flashcards():
    """Feature 4: Flashcard Generator."""
    data = request.get_json(force=True) or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Please provide study material to generate flashcards."}), 400
        
    num_cards = int(data.get("num_cards", 6))
    custom_api_key = data.get("api_key")
    
    result = ai_engine.generate_flashcards(content, num_cards, custom_api_key)
    return jsonify(result)


@app.route('/api/exam-plan', methods=['POST'])
def handle_exam_plan():
    """Feature 5: Exam Preparation Mode."""
    data = request.get_json(force=True) or {}
    subject = data.get("subject", "").strip()
    topics = data.get("topics", "").strip()
    available_time = data.get("available_time", "3 days")
    target_goal = data.get("target_goal", "top_grade")
    custom_api_key = data.get("api_key")
    
    result = ai_engine.generate_exam_plan(subject, topics, available_time, target_goal, custom_api_key)
    return jsonify(result)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"\n==================================================")
    print(f"🎓 StudyMate AI - AI Study Companion Server")
    print(f"📡 Running locally at: http://127.0.0.1:{port}")
    print(f"==================================================\n")
    app.run(host='0.0.0.0', port=port, debug=True)

