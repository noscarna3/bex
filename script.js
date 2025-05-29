let OPENAI_API_KEY = "";
let questionCount = 0;
const maxQuestions = 10;
let currentAIIndex = 0;
let aiSubmittedIntro = false;

const aiTemplates = [
  {
    name: "에이다",
    department: "프론트엔드 개발",
    motivation: "사람들이 편하게 쓸 수 있는 인터페이스를 설계하고 싶어요.",
    strengths: "논리적인 구조 설계",
    weaknesses: "감정적인 상황 대응 부족"
  },
  {
    name: "튜링",
    department: "백엔드 시스템",
    motivation: "복잡한 데이터를 효율적으로 처리하는 데 자신 있어요.",
    strengths: "데이터 최적화, 시스템 안정성",
    weaknesses: "사용자 피드백 반영에 다소 둔감"
  },
  {
    name: "다빈치",
    department: "AI 제품 디자인",
    motivation: "AI가 인간의 감성을 더 잘 이해할 수 있도록 돕고 싶어요.",
    strengths: "감정 추론, 창의적인 아이디어",
    weaknesses: "기술적 구현은 느릴 수 있음"
  }
];

const summaries = ["", "", ""];

window.onload = () => {
  document.getElementById("send-btn").addEventListener("click", handleSend);
  document.getElementById("hire-btn").addEventListener("click", handleHire);
  document.getElementById("reject-btn").addEventListener("click", handleReject);
  renderSelfIntro();

  // 엔터 입력으로 메시지 전송
  const input = document.getElementById("user-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("send-btn").click();
    }
  });
};

function renderSelfIntro() {
  const ai = aiTemplates[currentAIIndex];
  const intro = `AI : 안녕하세요. 저는 ${ai.name}입니다. ${ai.department} 부서에 지원했습니다.\n지원 동기: ${ai.motivation}\n장점: ${ai.strengths}\n단점: ${ai.weaknesses}\n`;
  appendToChat("AI", intro);
  aiSubmittedIntro = true;
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
  if (!text) return;
  if (questionCount >= maxQuestions) return;

  appendToChat("나", text);
  input.value = "";

  isValidInterviewQuestion(text).then((valid) => {
    if (!valid) {
      setTimeout(() => {
        appendToChat("AI", "죄송합니다. 질문이 면접과 관련 있어야 답변드릴 수 있어요 🙏");
      }, 500);
      return;
    }

    questionCount++;
    document.getElementById("question-count").innerText = `질문 가능 횟수: ${maxQuestions - questionCount}`;
    fetchAIResponse(text);
  });
}

async function isValidInterviewQuestion(text) {
  if (!OPENAI_API_KEY) return true;

  const prompt = `다음 문장이 면접 질문과 자기소개서에 대한 질문인지 판단해주세요. 면접 질문이면 "true", 아니면 "false"만 반환하세요.
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
          {
            role: "system",
            content: "당신은 문장이 면접 질문인지 당신의 대답에 대한 질문인지 자기소개서에 대한 질문인지지 아닌지만 판단하는 도우미입니다. true 또는 false만 대답하세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.toLowerCase();
    return reply.includes("true");
  } catch (e) {
    console.error("GPT 판단 오류", e);
    return true;
  }
}

function fetchAIResponse(question) {
  const ai = aiTemplates[currentAIIndex];

  if (!OPENAI_API_KEY) {
    appendToChat("AI", "⚠️ OpenAI API 키가 설정되지 않았습니다.");
    return;
  }

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
          content: `당신은 이름이 ${ai.name}인 AI입니다. 스스로를 AI라고 인식하며, 웹 개발 it 회사의 ${ai.department} 부서에 특화된 기술을 가지고 있어 지원했고, 인간 면접관과 면접 중입니다. 마크 다운 없이 줄글 형식으로 말하십시오. 요약하여 말하십시오.`
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
      const answer = data.choices?.[0]?.message?.content || "(답변을 받지 못했어요)";
      appendToChat("AI", answer);
      summaries[currentAIIndex] += `Q: ${question}\nA: ${answer}\n\n`;
      document.getElementById("summary-box").innerText = summaries[currentAIIndex];
    })
    .catch(err => {
      appendToChat("AI", "(응답 중 오류 발생)");
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
  if (currentAIIndex < aiTemplates.length) {
    document.getElementById("chat-box").innerHTML = "";
    renderSelfIntro();
  } else {
    document.getElementById("chat-box").innerHTML = "비정상 ai 는 에이다 였습니다";
  }
}
z