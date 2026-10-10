// Apni OpenAI API key yahan direct daal dein
const OPENAI_API_KEY = "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";

let uploadedDocuments = [];
let recognition;
let isLiveSessionActive = false;

// Voice Recognition setup
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ur-PK'; // Urdu/English Support

    recognition.onresult = function(event) {
        const transcript = event.results[event.results.length - 1][0].transcript;
        document.getElementById('userInput').value = transcript;
        sendMessage();
    };
}

function startVoiceRecognition() {
    if (recognition) {
        recognition.start();
        isLiveSessionActive = true;
        document.getElementById('startVoiceBtn').disabled = true;
        document.getElementById('stopVoiceBtn').disabled = false;
        appendMessage('assistant-msg', 'Live Voice Session Started. Speak now...');
    } else {
        alert('Browser Speech Recognition not supported.');
    }
}

function stopVoiceRecognition() {
    if (recognition && isLiveSessionActive) {
        recognition.stop();
        isLiveSessionActive = false;
        document.getElementById('startVoiceBtn').disabled = false;
        document.getElementById('stopVoiceBtn').disabled = true;
        appendMessage('assistant-msg', 'Live Voice Session Stopped.');
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

function appendMessage(className, text) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function uploadDocument() {
    const fileInput = document.getElementById('docFile');
    if (!fileInput.files.length) {
        alert('Pehle koi text file select karein.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        uploadedDocuments.push({ name: file.name, content: content });
        
        // Update Sidebar List
        const fileList = document.getElementById('fileList');
        const li = document.createElement('li');
        li.innerText = file.name;
        fileList.appendChild(li);

        alert('File successfully loaded into browser memory!');
        fileInput.value = '';
    };

    reader.readAsText(file);
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user-msg', message);
    input.value = '';

    // Browser-side RAG Context Extraction
    let contextText = "";
    if (uploadedDocuments.length > 0) {
        contextText = "\n\nUploaded Documents Context:\n";
        uploadedDocuments.forEach(doc => {
            contextText += `--- File: ${doc.name} ---\n${doc.content}\n\n`;
        });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Aap ek secure AI document search assistant hain. Aap har zabaan (Urdu, Hindi, English) mein jawab de sakte hain. Agar documents ka context diya gaya ho toh uske mutabiq exact aur helpful answer dein." + contextText
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            const aiReply = data.choices[0].message.content;
            appendMessage('assistant-msg', aiReply);
            speakText(aiReply);
        } else {
            appendMessage('assistant-msg', 'Error: OpenAI API response error.');
        }
    } catch (err) {
        appendMessage('assistant-msg', 'Network connection error.');
    }
}