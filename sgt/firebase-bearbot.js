import { getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-ai.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const commands = {
  open_my_page: { action: 'myPage', text: '나의 보드를 열었어요.' },
  open_map: { action: 'map', text: '내 주변 메모 지도를 열었어요.' },
  open_hot_chat: { action: 'hotChat', text: 'Hot 채팅 목록을 열었어요.' },
  open_saved_notes: { action: 'savedNotes', text: '내가 붙여둔 메모를 열었어요.' }
};

let chat;
let loadingTimer;
let loadingStartedAt = 0;
function addBubble(kind, text, extraClass = '') {
  const bubble = document.createElement('article');
  bubble.className = `bearbot-bubble ${kind} ${extraClass}`.trim();
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
  $('#bearbotLog').append(bubble);
  bubble.scrollIntoView({ block: 'end', behavior: 'smooth' });
  return bubble;
}
function setStatus(text) { $('#bearbotStatus').textContent = text; }
function formatElapsed(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}
function startLoading() {
  loadingStartedAt = Date.now();
  const loading = $('#bearbotLoading');
  const elapsed = $('#bearbotElapsed');
  loading.classList.remove('hidden');
  elapsed.textContent = formatElapsed(0);
  loadingTimer = window.setInterval(() => { elapsed.textContent = formatElapsed(Date.now() - loadingStartedAt); }, 250);
}
function stopLoading() {
  window.clearInterval(loadingTimer);
  loadingTimer = undefined;
  $('#bearbotLoading').classList.add('hidden');
}
function openBearbot() { $('#meHub').classList.add('hidden'); $('#inboxHub').classList.add('hidden'); $('#mapHub').classList.add('hidden'); $('#bearbotHub').classList.remove('hidden'); $('#bearbotInput').focus(); }

function createChat() {
  const app = window.portbearFirebaseApp || getApp();
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const tools = [{ functionDeclarations: [
    { name: 'open_my_page', description: 'Open the user\'s My page when they ask to see their page, profile, or board.' },
    { name: 'open_map', description: 'Open the nearby offer map when the user asks for the map, places, or nearby offers.' },
    { name: 'open_hot_chat', description: 'Open the Hot chat list when the user asks to see chat, messages, or Hot connections.' },
    { name: 'open_saved_notes', description: 'Open the saved bookmark and booking notes when the user asks to see saved items, bookmarks, or reservations.' }
  ] }];
  const model = getGenerativeModel(ai, {
    model: 'gemini-3.6-flash',
    tools,
    generationConfig: { maxOutputTokens: 180, temperature: 0.5 },
    systemInstruction: 'You are the gentle Korean guide inside the Portbear mobile app. Reply in Korean, briefly and warmly. You may only use the four provided functions for navigation. Never claim a reservation, payment, match, or external action was completed. If the user asks for anything else, explain what you can help with.'
  });
  return model.startChat();
}

async function runCommand(call) {
  const command = commands[call.name];
  if (!command) return null;
  const message = window.portbearNavigate?.(command.action) || command.text;
  addBubble('bot', message);
  return { functionResponse: { name: call.name, response: { result: message } } };
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message) return;
  addBubble('me', message);
  $('#bearbotInput').value = '';
  setStatus('곰 도우미가 메모를 읽고 있어요...');
  startLoading();
  const loading = addBubble('bot', '···', 'loading');
  try {
    chat ||= createChat();
    const result = await chat.sendMessage(message);
    loading.remove();
    const calls = result.response.functionCalls?.() || [];
    if (!calls.length) {
      addBubble('bot', result.response.text() || '지금은 답을 적기 어려워요. 다시 말해볼까요?');
    } else {
      const responses = (await Promise.all(calls.map(runCommand))).filter(Boolean);
      if (responses.length) {
        const followUp = await chat.sendMessage(responses);
        const reply = followUp.response.text();
        if (reply) addBubble('bot', reply);
      } else addBubble('bot', '이 요청은 아직 포트베어에서 실행할 수 없어요.');
    }
    setStatus('Gemini 무료 테스트 · 화면 이동만 실행해요');
  } catch (error) {
    loading.remove();
    console.error('Portbear AI error', error);
    const detail = error?.code === 'ai/fetch-error' ? 'AI 요청이 거절됐어요. Firebase AI Logic 설정과 무료 한도를 확인해 주세요.' : '곰 도우미가 잠시 쉬고 있어요. 잠시 후 다시 시도해 주세요.';
    addBubble('bot', detail);
    setStatus('연결을 확인해 주세요 · 외부 기능은 실행하지 않아요');
  } finally {
    stopLoading();
  }
}

$('#bearbotButton').onclick = openBearbot;
$('#closeBearbot').onclick = () => $('#bearbotHub').classList.add('hidden');
$('#bearbotForm').onsubmit = event => { event.preventDefault(); sendMessage($('#bearbotInput').value); };
document.querySelectorAll('[data-bearbot-prompt]').forEach(button => button.onclick = () => sendMessage(button.dataset.bearbotPrompt));
