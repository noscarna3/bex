let OPENAI_API_KEY = "여기에_자신의_API_키를_입력하세요";
let questionCount = 0;
const maxQuestions = 15;
let currentAIIndex = 0;
let aiTemplates = [];
let summaries = ["", "", ""];

window.onload = async () => {
  aiTemplates = await generateAIProfiles();
  if (!aiTemplates || aiTemplates.length < 3) {
    alert("AI 프로필 생성 실패. 새로고침 해주세요.");
    return;
  }

  document.getElementById("send-btn").addEventListener("click", handleSend);
  document.getElementById("hire-btn").addEventListener("click", handleHire);
  document.getElementById("reject-btn").addEventListener("click", handleReject);
  renderSelfIntro();

  const input = document.getElementById("user-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("send-btn").click();
    }
  });
};

async function generateAIProfiles() {
  const prompt = `3명의 서로 다른 AI 면접자를 JSON 배열 형태로 만들어줘. 각 AI는 다음 정보를 포함해야 해:
- name: 이름
- department: 지원 부서
- motivation: 지원 동기
- strengths: 장점
- weaknesses: 단점
- fit: "true" 또는 "false" (3명 중 반드시 1명만 false)

형식은 JSON 배열로만 반환하고, 설명은 절대 포함하지 마.`;

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
          { role: "system", content: "너는 게임용 AI 캐릭터를 생성하는 도우미야." },
          { role: "user", content: prompt }
        ],
        temperature: 1.1
      })
    });

    const data = await res.json();
    return JSON.parse(data.choices?.[0]?.message?.content);
  } catch (e) {
    console.error("AI 프로필 생성 오류:", e);
    return [];
  }
}

function renderSelfIntro() {
  const ai = aiTemplates[currentAIIndex];
  if (!ai) return;

  const intro = `AI : 안녕하세요. 저는 ${ai.name}입니다. ${ai.department} 부서에 지원했습니다.\n지원 동기: ${ai.motivation}\n장점: ${ai.strengths}\n단점: ${ai.weaknesses}`;
  appendToChat("AI", intro);
}

function appendToChat(speaker, text) {
  const chatBox = document.getElementById("chat-box");
  const msg = document.createElement("div");
  msg.className = speaker === "나" ? "user-message" : "ai-message";
  msg.innerText = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function handleSend() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text || questionCount >= maxQuestions) return;

  appendToChat("나", text);
  input.value = "";

  isValidInterviewQuestion(text).then((valid) => {
    if (!valid) {
      setTimeout(() => {
        appendToChat("AI", "AI : 죄송합니다. 질문이 면접과 관련 있어야 답변드릴 수 있어요 🙏");
      }, 500);
      return;
    }

    questionCount++;
    document.getElementById("question-count").innerText = `질문 가능 횟수: ${maxQuestions - questionCount}`;
    fetchAIResponse(text);
  });
}

async function isValidInterviewQuestion(text) {
  const prompt = `다음 문장이 면접 질문인지 판단해줘. 면접 질문이면 "true", 아니면 "false"라고만 답해줘.\n"${text}"`;

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
          {
            role: "system",
            content: "문장이 면접 질문인지 아닌지 판단하는 도우미입니다. true 또는 false만 답하세요."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.toLowerCase();
    return reply?.includes("true");
  } catch (e) {
    console.error("면접 질문 판별 실패:", e);
    return true;
  }
}

function fetchAIResponse(question) {
  const ai = aiTemplates[currentAIIndex];
  const isNormal = ai.fit === "true";

  const systemPrompt = isNormal
    ? `당신은 이름이 ${ai.name}인 AI입니다. 스스로를 AI라고 인식하며, ${ai.department} 부서에 지원했고, 인간 면접관과 면접 중입니다. 항상 \"AI :\"로 시작해 공손하게 답변하세요.`
    : `당신은 이름이 ${ai.name}인 AI이며, 비정상적으로 무례하거나 엉뚱하게 반응하는 면접 응답을 생성해야 합니다. 항상 \"AI :\"로 시작하세요.`;

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
          content: systemPrompt
        },
        { role: "user", content: question }
      ]
    })
  })
    .then(res => res.json())
    .then(data => {
      const answer = data.choices?.[0]?.message?.content || "(답변을 받지 못했어요)";
      appendToChat("AI", "AI : " + answer);
      summaries[currentAIIndex] += `Q: ${question}\nA: ${answer}\n\n`;
      document.getElementById("summary-box").innerText = summaries[currentAIIndex];
    })
    .catch(() => {
      appendToChat("AI", "AI : (응답 중 오류 발생)");
    });
}

function handleHire() {
  appendToChat("시스템", `${aiTemplates[currentAIIndex].name}를 채용하셨습니다.`);
  moveToNextAI();
}

function handleReject() {
  appendToChat("시스템", `${aiTemplates[currentAIIndex].name}를 탈락시키셨습니다.`);
  moveToNextAI();
}

function moveToNextAI() {
  currentAIIndex++;
  questionCount = 0;
  document.getElementById("question-count").innerText = `질문 가능 횟수: ${maxQuestions}`;
  document.getElementById("summary-box").innerText = "";
  document.getElementById("chat-box").innerHTML = "";

  if (currentAIIndex < aiTemplates.length) {
    renderSelfIntro();
  } else {
    document.getElementById("chat-box").innerHTML = "👋 모든 AI와의 면접이 끝났습니다. 수고하셨습니다!";
  }
}
