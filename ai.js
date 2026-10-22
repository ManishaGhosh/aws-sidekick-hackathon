
const MOCK_MODE = false;
const AI_ENDPOINT = "/api/ai"; 
async function callBackend(task, payload) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, ...payload })
  });
  if (!res.ok) throw new Error("AI backend error: " + res.status);
  return res.json();
}


async function askAI(video, question) {
  
  if (MOCK_MODE) {
    
    await delay(600);
    const fact = video.facts[Math.floor(Math.random() * video.facts.length)];
    return `Good questions. ${fact.text}`;
  }
  const data = await callBackend("ask", {
    title: video.title,
    synopsis: video.synopsis,
    facts: video.facts.map(f => f.text),
    question
  });
  return data.answer;
}


async function exploreAI(video, followup) {
  if (MOCK_MODE) {
    await delay(700);
    return {
      cards: video.facts.map((f, i) => ({
        title: video.topics[i % video.topics.length],
        detail: f.text
      }))
    };
  }
  const data = await callBackend("explore", {
    title: video.title,
    topics: video.topics,
    followup
  });
  return data; 
}


async function quizAI(video) {
  if (MOCK_MODE) {
    await delay(700);
    return {
      questions: video.facts.map(f => ({
        question: `True or false: ${f.text.split(".")[0]}.`,
        options: ["True", "False", "Not mentioned", "Partially true"],
        correctIndex: 0
      }))
    };
  }
  const data = await callBackend("quiz", {
    title: video.title,
    facts: video.facts.map(f => f.text)
  });
  return data; 
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
