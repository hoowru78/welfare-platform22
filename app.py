from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import json
from datetime import datetime
import os
from cryptography.fernet import Fernet
import base64

app = Flask(__name__)
CORS(app)

# 데이터베이스 초기화
def init_db():
    conn = sqlite3.connect('welfare.db')
    cursor = conn.cursor()
    
    # 사용자 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            anonymous_key TEXT UNIQUE NOT NULL,
            name_encrypted TEXT NOT NULL,
            birth_year INTEGER NOT NULL,
            region TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 설문 응답 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS survey_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            answer TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # 추천 결과 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recommendations_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# 암호화 키 생성
def generate_encryption_key():
    return Fernet.generate_key()

# 텍스트 암호화
def encrypt_text(text, key):
    f = Fernet(key)
    encrypted_text = f.encrypt(text.encode())
    return base64.urlsafe_b64encode(encrypted_text).decode()

# 텍스트 복호화
def decrypt_text(encrypted_text, key):
    try:
        f = Fernet(key)
        encrypted_data = base64.urlsafe_b64decode(encrypted_text.encode())
        decrypted_text = f.decrypt(encrypted_data)
        return decrypted_text.decode()
    except:
        return None

# 사용자별 고유키 생성
def generate_user_key():
    return secrets.token_urlsafe(32)

# 메인 페이지 (루트 경로 추가 - 중요!)
@app.route('/')
def index():
    return render_template('index.html')

# 정적 파일 서비스
@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

# API: 사용자 생성
@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.json
        name = data.get('name', '').strip()
        birth_year = data.get('birth_year')
        region = data.get('region', '').strip()
        
        if not name or not birth_year or not region:
            return jsonify({'error': '모든 필드를 입력해주세요.'}), 400
        
        # 익명 키 생성
        anonymous_key = generate_user_key()
        
        # 암호화 키 생성 및 이름 암호화
        encryption_key = generate_encryption_key()
        encrypted_name = encrypt_text(name, encryption_key)
        
        conn = sqlite3.connect('welfare.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO users (anonymous_key, name_encrypted, birth_year, region)
            VALUES (?, ?, ?, ?)
        ''', (anonymous_key, encrypted_name, birth_year, region))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'user_key': anonymous_key,
            'user_id': user_id,
            'message': '사용자가 성공적으로 등록되었습니다.'
        })
        
    except Exception as e:
        return jsonify({'error': f'사용자 생성 중 오류가 발생했습니다: {str(e)}'}), 500

# API: 설문 시작
@app.route('/api/survey/start', methods=['POST'])
def start_survey():
    try:
        data = request.json
        user_key = data.get('user_key')
        
        if not user_key:
            return jsonify({'error': '사용자 키가 필요합니다.'}), 400
        
        conn = sqlite3.connect('welfare.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE anonymous_key = ?', (user_key,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'error': '유효하지 않은 사용자입니다.'}), 404
        
        # 설문 질문들
        questions = [
            {
                "id": 1,
                "question": "현재 가계 소득 수준은 어느 정도입니까?",
                "type": "radio",
                "options": [
                    "기초생활수급자",
                    "차상위계층",
                    "중위소득 50% 이하",
                    "중위소득 80% 이하",
                    "중위소득 80% 초과"
                ]
            },
            {
                "id": 2,
                "question": "거동이 불편하거나 도움이 필요한 부분이 있습니까?",
                "type": "checkbox",
                "options": [
                    "보행 어려움",
                    "시각 장애",
                    "청각 장애",
                    "치매/인지장애",
                    "기타 신체장애",
                    "해당 없음"
                ]
            },
            {
                "id": 3,
                "question": "현재 동거하고 있는 가족이 있습니까?",
                "type": "radio",
                "options": [
                    "혼자 거주",
                    "배우자와 거주",
                    "자녀와 거주",
                    "기타 가족과 거주"
                ]
            },
            {
                "id": 4,
                "question": "다음 중 가장 필요하다고 생각하는 지원은 무엇입니까?",
                "type": "checkbox",
                "options": [
                    "생계비 지원",
                    "의료비 지원",
                    "주거비 지원",
                    "교통비 지원",
                    "식료품 지원",
                    "일자리 지원",
                    "건강관리 서비스"
                ]
            },
            {
                "id": 5,
                "question": "현재 앓고 있는 질병이나 건강상 문제가 있습니까?",
                "type": "checkbox",
                "options": [
                    "고혈압",
                    "당뇨병",
                    "관절염",
                    "심장질환",
                    "뇌혈관질환",
                    "우울증",
                    "기타 만성질환",
                    "해당 없음"
                ]
            }
        ]
        
        return jsonify({
            'questions': questions,
            'total_questions': len(questions)
        })
        
    except Exception as e:
        return jsonify({'error': f'설문 시작 중 오류가 발생했습니다: {str(e)}'}), 500

# API: 설문 응답 제출
@app.route('/api/survey/answer', methods=['POST'])
def submit_answer():
    try:
        data = request.json
        user_key = data.get('user_key')
        question_id = data.get('question_id')
        answer = data.get('answer')
        
        if not user_key or not question_id or not answer:
            return jsonify({'error': '모든 필드를 입력해주세요.'}), 400
        
        conn = sqlite3.connect('welfare.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE anonymous_key = ?', (user_key,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': '유효하지 않은 사용자입니다.'}), 404
        
        user_id = user[0]
        
        # 기존 응답 삭제 후 새 응답 저장
        cursor.execute('DELETE FROM survey_responses WHERE user_id = ? AND question_id = ?', 
                      (user_id, question_id))
        
        if isinstance(answer, list):
            answer_str = json.dumps(answer)
        else:
            answer_str = str(answer)
        
        cursor.execute('''
            INSERT INTO survey_responses (user_id, question_id, answer)
            VALUES (?, ?, ?)
        ''', (user_id, question_id, answer_str))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': '응답이 저장되었습니다.'})
        
    except Exception as e:
        return jsonify({'error': f'응답 저장 중 오류가 발생했습니다: {str(e)}'}), 500

# API: AI 추천 생성
@app.route('/api/recommendations', methods=['POST'])
def generate_recommendations():
    try:
        data = request.json
        user_key = data.get('user_key')
        
        if not user_key:
            return jsonify({'error': '사용자 키가 필요합니다.'}), 400
        
        conn = sqlite3.connect('welfare.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id, birth_year, region FROM users WHERE anonymous_key = ?', (user_key,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': '유효하지 않은 사용자입니다.'}), 404
        
        user_id, birth_year, region = user
        
        # 사용자 응답 조회
        cursor.execute('SELECT question_id, answer FROM survey_responses WHERE user_id = ?', (user_id,))
        responses = cursor.fetchall()
        
        # 추천 로직
        recommendations = generate_welfare_recommendations(birth_year, region, responses)
        
        # 추천 결과 저장
        cursor.execute('''
            INSERT INTO recommendations (user_id, recommendations_json)
            VALUES (?, ?)
        ''', (user_id, json.dumps(recommendations)))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'recommendations': recommendations,
            'message': 'AI 추천이 성공적으로 생성되었습니다.'
        })
        
    except Exception as e:
        return jsonify({'error': f'추천 생성 중 오류가 발생했습니다: {str(e)}'}), 500

# AI 추천 로직
def generate_welfare_recommendations(birth_year, region, responses):
    current_year = datetime.now().year
    age = current_year - birth_year
    
    recommendations = []
    
    # 나이별 기본 지원
    if age >= 65:
        recommendations.append({
            "title": "기초연금",
            "description": "만 65세 이상 어르신에게 매월 지급되는 연금",
            "eligibility": "만 65세 이상, 소득하위 70%",
            "amount": "월 최대 334,810원",
            "contact": "국민연금공단",
            "priority": 1
        })
        
        recommendations.append({
            "title": "노인장기요양보험",
            "description": "거동이 불편한 어르신을 위한 요양서비스",
            "eligibility": "만 65세 이상 또는 65세 미만 거동불편자",
            "amount": "본인부담금 15-20%",
            "contact": "국민건강보험공단",
            "priority": 2
        })
    
    # 응답 분석
    for question_id, answer in responses:
        try:
            answer_data = json.loads(answer) if answer.startswith('[') else answer
        except:
            answer_data = answer
        
        # 소득 수준에 따른 추천
        if question_id == 1:
            if "기초생활수급자" in str(answer_data) or "차상위계층" in str(answer_data):
                recommendations.append({
                    "title": "기초생활급여",
                    "description": "생계, 의료, 주거, 교육급여 지원",
                    "eligibility": "기준 중위소득 30-50% 이하",
                    "amount": "급여별 차등 지급",
                    "contact": "주민센터",
                    "priority": 1
                })
        
        # 거동 불편에 따른 추천
        if question_id == 2 and "해당 없음" not in str(answer_data):
            recommendations.append({
                "title": "장애인활동지원서비스",
                "description": "장애인의 일상생활 지원을 위한 활동보조 서비스",
                "eligibility": "등록장애인 중 활동지원 인정조사 결과",
                "amount": "월 최대 1,944,000원",
                "contact": "시군구청 장애인복지과",
                "priority": 2
            })
        
        # 독거에 따른 추천
        if question_id == 3 and "혼자 거주" in str(answer_data):
            recommendations.append({
                "title": "독거노인 생활관리사 파견",
                "description": "독거어르신을 위한 안전확인 및 생활지원",
                "eligibility": "만 65세 이상 독거노인",
                "amount": "무료",
                "contact": "지역 시니어클럽",
                "priority": 3
            })
        
        # 필요 지원에 따른 추천
        if question_id == 4:
            if "의료비 지원" in str(answer_data):
                recommendations.append({
                    "title": "의료급여",
                    "description": "저소득층 의료비 지원",
                    "eligibility": "의료급여 수급권자",
                    "amount": "의료비 본인부담금 면제/경감",
                    "contact": "국민건강보험공단",
                    "priority": 2
                })
            
            if "주거비 지원" in str(answer_data):
                recommendations.append({
                    "title": "주거급여",
                    "description": "저소득층 임차료 및 수선유지비 지원",
                    "eligibility": "기준 중위소득 47% 이하",
                    "amount": "지역별 기준임대료 내 실제임차료",
                    "contact": "주민센터",
                    "priority": 2
                })
    
    # 우선순위별 정렬 및 중복 제거
    unique_recommendations = []
    seen_titles = set()
    
    for rec in sorted(recommendations, key=lambda x: x['priority']):
        if rec['title'] not in seen_titles:
            unique_recommendations.append(rec)
            seen_titles.add(rec['title'])
    
    return unique_recommendations[:5]  # 최대 5개

# API: 사용자 추천 결과 조회
@app.route('/api/recommendations/<user_key>', methods=['GET'])
def get_recommendations(user_key):
    try:
        conn = sqlite3.connect('welfare.db')
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.recommendations_json, r.created_at 
            FROM recommendations r
            JOIN users u ON r.user_id = u.id
            WHERE u.anonymous_key = ?
            ORDER BY r.created_at DESC
            LIMIT 1
        ''', (user_key,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return jsonify({'error': '추천 결과를 찾을 수 없습니다.'}), 404
        
        recommendations_json, created_at = result
        recommendations = json.loads(recommendations_json)
        
        return jsonify({
            'recommendations': recommendations,
            'generated_at': created_at
        })
        
    except Exception as e:
        return jsonify({'error': f'추천 결과 조회 중 오류가 발생했습니다: {str(e)}'}), 500

# 애플리케이션 초기화
if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 