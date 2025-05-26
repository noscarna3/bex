const OPENAI_API_KEY = "";

const inputArea = document.getElementById('input-area');
const conversation = document.getElementById('conversation');
const summaryList = document.getElementById('summary-list');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');
const inputMirror = document.getElementById('input-mirror');

const selfIntroPrompt = `
당신은 AI이고 IT 기업에 지원하는 지원자 역할을 합니다. 지원 동기, 자신의 장점과 단점, 지원 부서를 요약해서 적어주세요.
본인을 AI로 인식합니다. 가끔식 대답을 할 때 애매한 대답이 포함 되어야 합니다. 
마크 다운을 제외한 일반적인 줄글 형식으로 사람과 사람 사이에서 대화하듯 답변을 해주십시오. 존대말을 해야합니다. 말을 너무 길게 하지 마십시오.
`;

async function callOpenAI(prompt, messages = null) {
  const bodyData = messages 
    ? { model: "gpt-4o-mini", messages, temperature: 0.7, max_tokens: 500 }
    : {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer `,
    },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function adjustInputHeight() {
  let text = inputArea.innerText.trim();
  inputMirror.textContent = text || '';
  let newHeight = inputMirror.offsetHeight;
  const minHeight = 40;
  const maxHeight = window.innerHeight / 2 - 40;

  if (newHeight < minHeight) newHeight = minHeight;
  if (newHeight > maxHeight) newHeight = maxHeight;

  inputArea.style.height = newHeight + 'px';
}

function calcUserMsgWidth(text) {
  const len = text.length;
  if (len <= 5) return '10%';
  if (len >= 50) return '40%';
  const width = 10 + ((len - 5) / 45) * 30;
  return width.toFixed(1) + '%';
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.classList.add('user-message');
  div.textContent = text;
  div.style.width = calcUserMsgWidth(text);
  div.style.maxWidth = '40%';
  conversation.appendChild(div);
  conversation.scrollTop = conversation.scrollHeight;
}

function addAIMessage(text) {
  const div = document.createElement('div');
  div.classList.add('ai-message');
  div.textContent = text;
  conversation.appendChild(div);
  conversation.scrollTop = conversation.scrollHeight;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.classList.add('ai-message');
  div.id = 'typing-indicator';
  div.textContent = "답변 중";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.classList.add('typing-dot');
    div.appendChild(dot);
  }
  conversation.appendChild(div);
  conversation.scrollTop = conversation.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

async function submitSelfIntro() {
  addTypingIndicator();
  try {
    const responseText = await callOpenAI(selfIntroPrompt);
    removeTypingIndicator();
    addAIMessage(responseText.trim());
  } catch (err) {
    removeTypingIndicator();
    addAIMessage("죄송합니다. 자기소개서 생성에 실패했습니다.");
    console.error(err);
  }
}

async function submitMessage() {
  let text = inputArea.innerText.trim();
  if (!text) return;

  addUserMessage(text);

  const summaryItem = document.createElement('div');
  summaryItem.classList.add('summary-item');
  summaryItem.textContent = text;
  summaryList.appendChild(summaryItem);
  summaryList.scrollTop = summaryList.scrollHeight;

  inputArea.innerText = '';
  adjustInputHeight();
  inputArea.focus();

  addTypingIndicator();

  try {
    const messages = [];
    messages.push({ role: "system", content: "마크 다운을 제외한 일반적인 줄글 형식으로 사람과 사람 사이에서 대화하듯 답변해 주세요. 존대말을 사용하십시오." });

    const chatNodes = conversation.querySelectorAll('.ai-message, .user-message');
    chatNodes.forEach(node => {
      messages.push({
        role: node.classList.contains('ai-message') ? 'assistant' : 'user',
        content: node.textContent
      });
    });

    messages.push({ role: "user", content: text });

    const aiReply = await callOpenAI(null, messages);

    removeTypingIndicator();
    addAIMessage(aiReply.trim());
  } catch (err) {
    removeTypingIndicator();
    addAIMessage("죄송합니다. 답변 생성에 실패했습니다.");
    console.error(err);
  }
}

function resetAll() {
  conversation.innerHTML = '';
  summaryList.innerHTML = '';
  inputArea.innerText = '';
  adjustInputHeight();
  submitSelfIntro();
}

inputArea.addEventListener('input', adjustInputHeight);
inputArea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitMessage();
  }
});
submitBtn.addEventListener('click', submitMessage);
resetBtn.addEventListener('click', resetAll);

// 초기화
submitSelfIntro();
adjustInputHeight();
