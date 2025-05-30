let aiTemplates = [];
let summaries = [];
let OPENAI_API_KEY = "";
let currentAIIndex = 0;
let questionCount = 0;
const maxQuestions = 5;

// 사용자 입력 잠금/해제 함수
function disableUserInput() {
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  input.disabled = true;
  sendBtn.disabled = true;
  sendBtn.style.opacity = 0.6;
}

function enableUserInput() {
  const input = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  input.disabled = false;
  sendBtn.disabled = false;
  sendBtn.style.opacity = 1;
}

// AI 지원자 3명 가져오기
async function fetchRandomAIs() {
  const prompt = `AI 지원자 3명을 다음 형식의 JSON 배열로 출력해주세요 (백틱 없이, JSON만):
[
  {
    "name": "(한국 이름)",
    "department": "(지원 부서)",
    "motivation": "(지원 동기)",
    "strengths": "(장점)",
    "weaknesses": "(단점점)"
  }
]`;

  const chatBox = document.getElementById("chat-box");

  const loadingMsg = document.createElement("div");
  loadingMsg.className = "ai-message";
  loadingMsg.innerText = "자기소개서 생성중입니다...";
  chatBox.appendChild(loadingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    disableUserInput();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "너는 IT 회사의 인사 담당자야. AI 자기소개서를 바탕으로 JSON 데이터를 정리해. 다음 대화에도 쭉 이 내용을 기억해" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await res.json();
    loadingMsg.remove();
    enableUserInput();

    if (!res.ok) {
      console.error("GPT 요청 실패", data);
      appendToChat("시스템", `오류 발생: ${data.error.message}`);
      return;
    }

    let content = data.choices[0].message.content;
    const clean = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    aiTemplates = parsed;
    summaries = Array(parsed.length).fill("");
    renderSelfIntro();

  } catch (e) {
    console.error("AI 생성 실패:", e);
    loadingMsg.remove();
    enableUserInput();
    appendToChat("시스템", "AI 생성 중 오류가 발생했어요.");
  }
}

// AI 자기소개 렌더링
function renderSelfIntro() {
  if (currentAIIndex >= aiTemplates.length) {
    appendToChat("시스템", "모든 AI 지원자 면접이 종료되었습니다.");
    return;
  }
  const ai = aiTemplates[currentAIIndex];
  const intro = `안녕하십니까까. 저는 ${ai.name}입니다. ${ai.department} 부서에 지원했습니다.
지원 동기: ${ai.motivation}
장점: ${ai.strengths}
단점: ${ai.weaknesses}`;
  appendToChat("AI", intro);
}

// 채팅창 메시지 추가
function appendToChat(speaker, text) {
  const chatBox = document.getElementById("chat-box");
  const msg = document.createElement("div");
  msg.className = speaker === "나" ? "user-message" : "ai-message";
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 질문이 면접 질문인지 판단
async function isValidInterviewQuestion(text) {
  if (!OPENAI_API_KEY) return true;

  const prompt = `다음 문장이 면접 질문인지 자기 소개서에 관한 내용인지 판단해주세요. 면접과 관련된 질문이면 "true", 아니면 "false"만 반환하세요.
질문: "${text}"`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "당신은 면접 질문인지 판단하는 도우미입니다. 'true' 아니면 'false'만 답변하세요." },
          { role: "user", content: prompt }
        ],
        temperature: 0
      })
    });

    const data = await res.json();
    const reply = data.choices[0].message.content.trim().toLowerCase();
    return reply === "true";

  } catch (e) {
    console.error("GPT 판단 오류", e);
    return true;
  }
}

// AI 응답 생성
function fetchAIResponse(question) {
  const ai = aiTemplates[currentAIIndex];

  if (!OPENAI_API_KEY) {
    appendToChat("AI", "⚠️ OpenAI API 키가 설정되지 않았습니다.");
    return;
  }

  const chatBox = document.getElementById("chat-box");
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "ai-message";
  loadingMsg.innerText = "생성중입니다...";
  chatBox.appendChild(loadingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  disableUserInput();

  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 이름이 ${ai.name}인 AI입니다. 스스로를 AI라고 인식하며, 웹 개발 IT 회사의 ${ai.department} 부서에 특화된 기술을 가지고 있어 지원했고, 인간 면접관과 면접 중입니다. 마크다운 없이 줄글 형식으로 답하십시오. 
          자기 소개서에 적은 내용을 기억하고 질문에 대답하십시오`
        },
        {
          role: "user",
          content: question
        }
      ]
    })
  })
  .then(res => res.json())
  .then(data => {
    loadingMsg.remove();
    enableUserInput();

    const answer = data.choices[0].message.content || "(답변을 받지 못했어요)";
    appendToChat("AI", answer);
    summaries[currentAIIndex] += `Q: ${question}\nA: ${answer}\n\n`;
    document.getElementById("summary-box").innerText = summaries[currentAIIndex];
  })
  .catch(err => {
    console.error(err);
    loadingMsg.remove();
    enableUserInput();
    appendToChat("AI", "(응답 중 오류 발생)");
  });
}

// 질문 전송 처리
async function handleSend() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;
  if (questionCount >= maxQuestions) return;

  appendToChat("나", text);
  input.value = "";

  const valid = await isValidInterviewQuestion(text);

  if (!valid) {
    appendToChat("AI", "죄송합니다. 질문이 면접과 관련된 내용이 아니라고 판단되었습니다.");
    return;
  }

  questionCount++;
  document.getElementById("question-count").innerText = `질문 가능 횟수: ${maxQuestions - questionCount}`;
  fetchAIResponse(text);
}

// AI 지원자 다음으로
function moveToNextAI() {
  currentAIIndex++;
  questionCount = 0;
  document.getElementById("question-count").innerText = `질문 가능 횟수: ${maxQuestions}`;
  document.getElementById("summary-box").innerText = "";
  document.getElementById("chat-box").innerHTML = "";
  if (currentAIIndex < aiTemplates.length) {
    renderSelfIntro();
  } else {
    appendToChat("시스템", "모든 AI 지원자 면접이 종료되었습니다.");
  }
}

// 채용/탈락 처리
function handleHire() {
  appendToChat("시스템", `${aiTemplates[currentAIIndex].name}을(를) 채용하셨습니다.`);
  moveToNextAI();
}

function handleReject() {
  appendToChat("시스템", `${aiTemplates[currentAIIndex].name}을(를) 탈락시키셨습니다.`);
  moveToNextAI();
}

// 초기화 및 이벤트 등록
window.addEventListener("DOMContentLoaded", () => {
  fetchRandomAIs();

  document.getElementById("send-btn").addEventListener("click", handleSend);
  document.getElementById("hire-btn").addEventListener("click", handleHire);
  document.getElementById("reject-btn").addEventListener("click", handleReject);

  document.getElementById("user-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
});
