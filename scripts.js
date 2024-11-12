let apiKey = localStorage.getItem('openai_api_key') || '';
let chatHistory = JSON.parse(localStorage.getItem('chat_history')) || [];

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// 페이지 로드 시 저장된 데이터 불러오기
window.addEventListener('DOMContentLoaded', () => {
    if (apiKey) {
        document.getElementById('api-key-section').classList.add('hidden');
        document.getElementById('chat-section').classList.remove('hidden');
        // 저장된 대화 내역 표시
        chatHistory.forEach(msg => {
            addMessage(msg.content, msg.sender, false);
        });
    }
});

async function validateApiKey() {
    const inputKey = document.getElementById('api-key').value;
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${inputKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{role: "user", content: "Hello"}]
            })
        });

        if (response.ok) {
            apiKey = inputKey;
            localStorage.setItem('openai_api_key', apiKey);
            document.getElementById('api-key-section').classList.add('hidden');
            document.getElementById('chat-section').classList.remove('hidden');
        } else {
            alert('유효하지 않은 API 키입니다.');
        }
    } catch (error) {
        alert('API 키 확인 중 오류가 발생했습니다.');
    }
}

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{role: "user", content: message}]
            })
        });

        const data = await response.json();
        const botResponse = data.choices[0].message.content;
        addMessage(botResponse, 'bot');
    } catch (error) {
        addMessage('죄송합니다. 오류가 발생했습니다.', 'bot');
    }
}

function addMessage(message, sender, save = true) {
    const chatContainer = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = message;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (save) {
        chatHistory.push({ content: message, sender: sender });
        localStorage.setItem('chat_history', JSON.stringify(chatHistory));
    }
}

// API 키 초기화 버튼 추가
function resetApiKey() {
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('chat_history');
    location.reload();
}

document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 녹음 기능 추가
async function toggleRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await transcribeAudio(audioBlob);
                audioChunks = [];
            };

            mediaRecorder.start();
            isRecording = true;
            document.getElementById('record-button').textContent = '녹음 중지';
            document.getElementById('record-button').classList.add('recording');
        } catch (error) {
            alert('마이크 접근 권한이 필요합니다.');
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('record-button').textContent = '음성 입력';
        document.getElementById('record-button').classList.remove('recording');
    }
}

async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.text) {
            document.getElementById('user-input').value = data.text;
        }
    } catch (error) {
        alert('음성 변환 중 오류가 발생했습니다.');
    }
}
