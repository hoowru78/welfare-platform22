// API 기본 URL - 환경에 따라 자동 설정 (중요!)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:5000/api'
    : window.location.protocol + '//' + window.location.host + '/api';

// DOM 요소들
const welcomeScreen = document.getElementById('welcome-screen');
const userInfoScreen = document.getElementById('user-info-screen');
const surveyScreen = document.getElementById('survey-screen');
const loadingScreen = document.getElementById('loading-screen');
const resultsScreen = document.getElementById('results-screen');
const errorScreen = document.getElementById('error-screen');

const startBtn = document.getElementById('start-btn');
const userInfoForm = document.getElementById('user-info-form');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const retryBtn = document.getElementById('retry-btn');

// 접근성 요소들
const fontSizeBtn = document.getElementById('font-size-btn');
const highContrastBtn = document.getElementById('high-contrast-btn');
const voiceGuideBtn = document.getElementById('voice-guide-btn');

// 전역 변수들
let currentUser = null;
let surveyQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let fontSize = 'normal';
let isHighContrast = false;
let isVoiceGuideEnabled = false;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadAccessibilitySettings();
});

function initializeApp() {
    console.log('앱 초기화 중...');
    console.log('API Base URL:', API_BASE_URL);
    showScreen('welcome');
}

function setupEventListeners() {
    // 메인 버튼들
    startBtn.addEventListener('click', showUserInfoScreen);
    userInfoForm.addEventListener('submit', handleUserInfoSubmit);
    prevBtn.addEventListener('click', showPreviousQuestion);
    nextBtn.addEventListener('click', showNextQuestion);
    restartBtn.addEventListener('click', restartApp);
    retryBtn.addEventListener('click', hideErrorScreen);

    // 접근성 버튼들
    fontSizeBtn.addEventListener('click', toggleFontSize);
    highContrastBtn.addEventListener('click', toggleHighContrast);
    voiceGuideBtn.addEventListener('click', toggleVoiceGuide);
}

// 화면 전환 함수
function showScreen(screenName) {
    const screens = [welcomeScreen, userInfoScreen, surveyScreen, loadingScreen, resultsScreen, errorScreen];
    screens.forEach(screen => screen.classList.add('hidden'));

    switch(screenName) {
        case 'welcome':
            welcomeScreen.classList.remove('hidden');
            break;
        case 'userInfo':
            userInfoScreen.classList.remove('hidden');
            break;
        case 'survey':
            surveyScreen.classList.remove('hidden');
            break;
        case 'loading':
            loadingScreen.classList.remove('hidden');
            break;
        case 'results':
            resultsScreen.classList.remove('hidden');
            break;
        case 'error':
            errorScreen.classList.remove('hidden');
            break;
    }

    // 음성 안내
    if (isVoiceGuideEnabled) {
        announceScreenChange(screenName);
    }
}

function showUserInfoScreen() {
    showScreen('userInfo');
    document.getElementById('name').focus();
}

async function handleUserInfoSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        name: formData.get('name').trim(),
        birth_year: parseInt(formData.get('birth_year')),
        region: formData.get('region')
    };

    if (!userData.name || !userData.birth_year || !userData.region) {
        showError('모든 필드를 입력해주세요.');
        return;
    }

    try {
        console.log('사용자 생성 요청:', userData);
        
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        console.log('응답 상태:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '사용자 생성에 실패했습니다.');
        }

        const result = await response.json();
        console.log('사용자 생성 성공:', result);
        
        currentUser = {
            userKey: result.user_key,
            userId: result.user_id,
            ...userData
        };

        await startSurvey();

    } catch (error) {
        console.error('사용자 생성 오류:', error);
        showError(error.message || '서버 연결에 실패했습니다.');
    }
}

async function startSurvey() {
    try {
        console.log('설문 시작 요청:', currentUser.userKey);
        
        const response = await fetch(`${API_BASE_URL}/survey/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_key: currentUser.userKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '설문 시작에 실패했습니다.');
        }

        const result = await response.json();
        console.log('설문 데이터 수신:', result);
        
        surveyQuestions = result.questions;
        currentQuestionIndex = 0;
        userAnswers = {};

        showScreen('survey');
        updateSurveyUI();

    } catch (error) {
        console.error('설문 시작 오류:', error);
        showError(error.message || '설문을 불러올 수 없습니다.');
    }
}

function updateSurveyUI() {
    const currentQuestion = surveyQuestions[currentQuestionIndex];
    const totalQuestions = surveyQuestions.length;
    
    // 진행률 업데이트
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('current-question').textContent = currentQuestionIndex + 1;
    document.getElementById('total-questions').textContent = totalQuestions;
    
    // 질문 렌더링
    renderQuestion(currentQuestion);
    
    // 버튼 상태 업데이트
    prevBtn.disabled = currentQuestionIndex === 0;
    
    // 다음/완료 버튼 텍스트 및 상태
    if (currentQuestionIndex === totalQuestions - 1) {
        nextBtn.textContent = '완료';
    } else {
        nextBtn.textContent = '다음';
    }
    
    updateNextButtonState();
}

function renderQuestion(question) {
    const container = document.getElementById('question-container');
    
    let html = `
        <div class="mb-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">${question.question}</h3>
    `;
    
    if (question.type === 'radio') {
        html += '<div class="space-y-3">';
        question.options.forEach((option, index) => {
            const isChecked = userAnswers[question.id] === option ? 'checked' : '';
            html += `
                <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="radio" name="question-${question.id}" value="${option}" ${isChecked}
                           class="mr-3 text-blue-600 focus:ring-blue-500" 
                           onchange="handleAnswerChange(${question.id}, '${option}')">
                    <span class="text-lg">${option}</span>
                </label>
            `;
        });
        html += '</div>';
        
    } else if (question.type === 'checkbox') {
        html += '<div class="space-y-3">';
        question.options.forEach((option, index) => {
            const currentAnswers = userAnswers[question.id] || [];
            const isChecked = currentAnswers.includes(option) ? 'checked' : '';
            html += `
                <label class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" value="${option}" ${isChecked}
                           class="mr-3 text-blue-600 focus:ring-blue-500" 
                           onchange="handleCheckboxChange(${question.id}, '${option}', this.checked)">
                    <span class="text-lg">${option}</span>
                </label>
            `;
        });
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function handleAnswerChange(questionId, answer) {
    userAnswers[questionId] = answer;
    updateNextButtonState();
    
    if (isVoiceGuideEnabled) {
        speak(`${answer} 선택됨`);
    }
}

function handleCheckboxChange(questionId, option, checked) {
    if (!userAnswers[questionId]) {
        userAnswers[questionId] = [];
    }
    
    if (checked) {
        if (!userAnswers[questionId].includes(option)) {
            userAnswers[questionId].push(option);
        }
    } else {
        userAnswers[questionId] = userAnswers[questionId].filter(item => item !== option);
    }
    
    updateNextButtonState();
    
    if (isVoiceGuideEnabled) {
        speak(checked ? `${option} 선택됨` : `${option} 선택 해제됨`);
    }
}

function updateNextButtonState() {
    const currentQuestion = surveyQuestions[currentQuestionIndex];
    const hasAnswer = userAnswers[currentQuestion.id] && 
                     (Array.isArray(userAnswers[currentQuestion.id]) 
                         ? userAnswers[currentQuestion.id].length > 0 
                         : userAnswers[currentQuestion.id]);
    
    nextBtn.disabled = !hasAnswer;
}

function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateSurveyUI();
    }
}

async function showNextQuestion() {
    // 현재 답변 저장
    const currentQuestion = surveyQuestions[currentQuestionIndex];
    const answer = userAnswers[currentQuestion.id];
    
    try {
        await saveAnswer(currentQuestion.id, answer);
        
        if (currentQuestionIndex < surveyQuestions.length - 1) {
            currentQuestionIndex++;
            updateSurveyUI();
        } else {
            // 모든 질문 완료 - 추천 생성
            await generateRecommendations();
        }
    } catch (error) {
        console.error('답변 저장 오류:', error);
        showError('답변 저장 중 오류가 발생했습니다.');
    }
}

async function saveAnswer(questionId, answer) {
    const response = await fetch(`${API_BASE_URL}/survey/answer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_key: currentUser.userKey,
            question_id: questionId,
            answer: answer
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '답변 저장에 실패했습니다.');
    }
}

async function generateRecommendations() {
    showScreen('loading');
    
    try {
        console.log('추천 생성 요청:', currentUser.userKey);
        
        const response = await fetch(`${API_BASE_URL}/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_key: currentUser.userKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '추천 생성에 실패했습니다.');
        }

        const result = await response.json();
        console.log('추천 결과:', result);
        
        displayRecommendations(result.recommendations);
        showScreen('results');

    } catch (error) {
        console.error('추천 생성 오류:', error);
        showError(error.message || '추천을 생성할 수 없습니다.');
    }
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendations-container');
    
    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-600 text-lg">현재 조건에 맞는 복지서비스를 찾을 수 없습니다.</p>
                <p class="text-gray-500 mt-2">주민센터에 직접 문의해보시기 바랍니다.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="space-y-6">';
    
    recommendations.forEach((rec, index) => {
        html += `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div class="flex items-start justify-between mb-4">
                    <h3 class="text-xl font-bold text-blue-800">${rec.title}</h3>
                    <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        추천 ${index + 1}
                    </span>
                </div>
                
                <p class="text-gray-700 mb-4 leading-relaxed">${rec.description}</p>
                
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-1">신청 자격</h4>
                        <p class="text-gray-600">${rec.eligibility}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-1">지원 금액</h4>
                        <p class="text-gray-600">${rec.amount}</p>
                    </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-blue-200">
                    <h4 class="font-semibold text-gray-800 mb-1">문의처</h4>
                    <p class="text-blue-600 font-medium">${rec.contact}</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    if (isVoiceGuideEnabled) {
        speak(`${recommendations.length}개의 복지서비스가 추천되었습니다.`);
    }
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    showScreen('error');
    
    if (isVoiceGuideEnabled) {
        speak(`오류: ${message}`);
    }
}

function hideErrorScreen() {
    showScreen('welcome');
}

function restartApp() {
    currentUser = null;
    surveyQuestions = [];
    currentQuestionIndex = 0;
    userAnswers = {};
    showScreen('welcome');
    
    // 폼 리셋
    userInfoForm.reset();
}

// 접근성 기능들
function toggleFontSize() {
    const sizes = ['normal', 'large', 'larger'];
    const currentIndex = sizes.indexOf(fontSize);
    fontSize = sizes[(currentIndex + 1) % sizes.length];
    
    document.body.classList.remove('text-normal', 'text-large', 'text-larger');
    document.body.classList.add(`text-${fontSize}`);
    
    localStorage.setItem('fontSize', fontSize);
    
    if (isVoiceGuideEnabled) {
        speak(`글자 크기 ${fontSize}으로 변경됨`);
    }
}

function toggleHighContrast() {
    isHighContrast = !isHighContrast;
    
    if (isHighContrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
    
    localStorage.setItem('highContrast', isHighContrast);
    
    if (isVoiceGuideEnabled) {
        speak(isHighContrast ? '고대비 모드 켜짐' : '고대비 모드 꺼짐');
    }
}

function toggleVoiceGuide() {
    isVoiceGuideEnabled = !isVoiceGuideEnabled;
    localStorage.setItem('voiceGuide', isVoiceGuideEnabled);
    
    if (isVoiceGuideEnabled) {
        speak('음성 안내가 켜졌습니다.');
        voiceGuideBtn.classList.add('bg-green-700');
    } else {
        voiceGuideBtn.classList.remove('bg-green-700');
    }
}

function speak(text) {
    if ('speechSynthesis' in window && isVoiceGuideEnabled) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

function announceScreenChange(screenName) {
    const messages = {
        'welcome': '시작 화면입니다.',
        'userInfo': '기본 정보 입력 화면입니다.',
        'survey': '설문조사 화면입니다.',
        'loading': '추천을 생성하고 있습니다.',
        'results': '추천 결과 화면입니다.',
        'error': '오류가 발생했습니다.'
    };
    
    if (messages[screenName]) {
        speak(messages[screenName]);
    }
}

function loadAccessibilitySettings() {
    // 저장된 설정 불러오기
    fontSize = localStorage.getItem('fontSize') || 'normal';
    isHighContrast = localStorage.getItem('highContrast') === 'true';
    isVoiceGuideEnabled = localStorage.getItem('voiceGuide') === 'true';
    
    // 설정 적용
    document.body.classList.add(`text-${fontSize}`);
    
    if (isHighContrast) {
        document.body.classList.add('high-contrast');
    }
    
    if (isVoiceGuideEnabled) {
        voiceGuideBtn.classList.add('bg-green-700');
    }
}

// 전역 함수들 (HTML에서 호출됨)
window.handleAnswerChange = handleAnswerChange;
window.handleCheckboxChange = handleCheckboxChange; 