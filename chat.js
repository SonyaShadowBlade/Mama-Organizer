(() => {
  const FUNCTION_URL="https://lhfzvwlbnfvictowzvmp.supabase.co/functions/v1/mama-sto-chat";
  const isMama=!!document.getElementById("app");
  const CHAT_TITLE=isMama?"Чат с Admin":"Чат с Mama";
  let role=null,opened=false,timer=null,messages=[];

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=v=>{try{return new Date(v).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(_){return""}};

  function css(){
    if(document.getElementById("mamaStoChatStyle"))return;
    const s=document.createElement("style");s.id="mamaStoChatStyle";
    s.textContent=`
      #mamaStoChatButton{display:none;width:auto;min-width:150px;max-width:190px;min-height:42px;padding:8px 14px;font-size:14px;font-weight:800}
      #mamaStoChatButton.mama-sto-unread{background:#facc15!important;color:#111827!important;box-shadow:0 0 0 3px rgba(250,204,21,.3)!important}
      .mama-sto-chat-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;margin-left:6px;border-radius:999px;background:#dc2626;color:#fff;font-size:12px;font-weight:900}
      .mama-sto-chat-bg{position:fixed;inset:0;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;z-index:100000;padding:16px;box-sizing:border-box}.mama-sto-chat-bg.open{display:flex}
      .mama-sto-chat{width:min(620px,100%);max-height:92vh;background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
      .mama-sto-chat-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb;font-weight:900;font-size:18px}
      .mama-sto-chat-list{padding:14px;overflow:auto;display:flex;flex-direction:column;gap:9px;min-height:260px}.mama-sto-msg{max-width:82%;padding:9px 11px;border-radius:13px;background:#f1f5f9;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere}.mama-sto-msg.mine{align-self:flex-end;background:#dbeafe}
      .mama-sto-meta{font-size:11px;color:#64748b;margin-top:4px}.mama-sto-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb}.mama-sto-chat-input{flex:1;min-height:44px;max-height:120px;resize:vertical;padding:9px 10px;border:1px solid #cbd5e1;border-radius:10px}.mama-sto-chat-status{font-size:12px;color:#64748b;padding:0 14px 8px;min-height:16px}.mama-sto-msg-actions{display:flex;gap:5px;margin-top:5px}.mama-sto-msg-actions button{font-size:11px;padding:3px 7px;border-radius:7px;background:#fff;border:1px solid #cbd5e1}
    `;document.head.appendChild(s);
  }

  function getToken(){
    const ref=isMama?"lhfzvwlbnfvictowzvmp":"lurjmjgtqogwlxkyauso";
    for(const store of [localStorage,sessionStorage]){
      for(let i=0;i<store.length;i++){
        const k=store.key(i);if(!k||!k.includes(ref))continue;
        try{const v=JSON.parse(store.getItem(k)||"null");if(v?.access_token)return v.access_token}catch(_){}
      }
    }
    throw new Error("Сессия не найдена. Войдите в приложение.");
  }

  async function request(action=null,extra={}){
    const token=getToken(),o={headers:{Authorization:"Bearer "+token}};
    if(action){o.method="POST";o.headers["Content-Type"]="application/json";o.body=JSON.stringify({action,...extra})}
    const r=await fetch(FUNCTION_URL,o),d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||"Ошибка чата");return d;
  }

  function setUnread(n){
    const b=document.getElementById("mamaStoChatButton");if(!b)return;
    const count=Math.max(0,Number(n)||0);b.classList.toggle("mama-sto-unread",count>0);
    b.style.setProperty("display","inline-flex","important");
    b.style.setProperty("background",count>0?"#facc15":"", "important");
    b.style.setProperty("color",count>0?"#111827":"", "important");
    let badge=b.querySelector(".mama-sto-chat-badge");
    if(count){if(!badge){badge=document.createElement("span");badge.className="mama-sto-chat-badge";b.appendChild(badge)}badge.textContent=count>99?"99+":String(count)}else if(badge)badge.remove();
  }

  function addButton(){
    let b=document.getElementById("mamaStoChatButton");
    if(!b){
      const host=isMama?document.querySelector(".actions"):document.querySelector(".sanechka-main-buttons");
      if(!host)return;
      b=document.createElement("button");b.id="mamaStoChatButton";b.className=isMama?"btn secondary":"sanechka-main-button";b.type="button";host.appendChild(b);b.onclick=openChat;
    }
    b.innerHTML="💬 "+esc(CHAT_TITLE);
    b.style.setProperty("display","inline-flex","important");
  }

  function render(){
    const list=document.getElementById("mamaStoChatList");if(!list)return;
    list.innerHTML=messages.length?messages.map(m=>{
      const mine=m.sender_role===role,del=!!m.deleted_at,status=mine?(m.read_at?"✓✓":m.delivered_at?"✓":"◷"):"";
      const actions=mine&&!del?`<div class="mama-sto-msg-actions"><button type="button" data-edit="${esc(m.id)}">Изменить</button><button type="button" data-del="${esc(m.id)}">Удалить</button></div>`:"";
      return `<div class="mama-sto-msg ${mine?"mine":""}"><div>${del?"Сообщение удалено":esc(m.body)}</div><div class="mama-sto-meta">${mine?"Вы":(isMama?"Admin":"Mama")} · ${esc(fmt(m.created_at))} ${status} ${m.edited_at&&!del?"· изменено":""}</div>${actions}</div>`;
    }).join(""):'<div style="color:#64748b;text-align:center;padding:40px 10px">Пока сообщений нет.</div>';
    list.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>editMessage(x.dataset.edit));list.querySelectorAll("[data-del]").forEach(x=>x.onclick=()=>deleteMessage(x.dataset.del));list.scrollTop=list.scrollHeight;
  }

  async function loadMessages(markRead=opened){
    try{
      const d=await request();role=d.role;messages=d.messages||[];addButton();
      const unread=messages.filter(m=>m.recipient_role===role&&!m.read_at&&!m.deleted_at).length;setUnread(unread);
      if(markRead&&unread){await request("read");messages=messages.map(m=>m.recipient_role===role&&!m.read_at?({...m,read_at:new Date().toISOString(),delivered_at:m.delivered_at||new Date().toISOString()}):m);setUnread(0)}
      if(opened)render();
    }catch(e){const b=document.getElementById("mamaStoChatButton");if(b)b.style.setProperty("display","none","important");if(opened)setStatus(e.message)}
  }

  function setStatus(v){const e=document.getElementById("mamaStoChatStatus");if(e)e.textContent=v||""}

  function addModal(){
    if(document.getElementById("mamaStoChatModal"))return;
    const bg=document.createElement("div");bg.id="mamaStoChatModal";bg.className="mama-sto-chat-bg";
    bg.innerHTML=`<div class="mama-sto-chat"><div class="mama-sto-chat-head"><span>${esc(CHAT_TITLE)}</span><button id="mamaStoClose" type="button">✕</button></div><div id="mamaStoChatList" class="mama-sto-chat-list"></div><div id="mamaStoChatStatus" class="mama-sto-chat-status"></div><form id="mamaStoChatForm" class="mama-sto-chat-form"><textarea id="mamaStoChatInput" class="mama-sto-chat-input" maxlength="4000" placeholder="Сообщение..." required></textarea><button class="btn primary" type="submit">📨</button></form></div>`;
    document.body.appendChild(bg);document.getElementById("mamaStoClose").onclick=closeChat;bg.addEventListener("click",e=>{if(e.target===bg)closeChat()});
    document.getElementById("mamaStoChatForm").onsubmit=async e=>{e.preventDefault();const input=document.getElementById("mamaStoChatInput"),body=input.value.trim();if(!body)return;setStatus("Отправляем…");try{await request("send",{body});input.value="";await loadMessages(false);setStatus("")}catch(err){setStatus(err.message)}};
  }

  async function editMessage(id){const m=messages.find(x=>x.id===id);if(!m)return;const v=prompt("Изменить сообщение:",m.body);if(v===null||!v.trim())return;try{await request("edit",{id,body:v.trim()});await loadMessages(false)}catch(e){setStatus(e.message)}}
  async function deleteMessage(id){if(!confirm("Удалить это сообщение?"))return;try{await request("delete",{id});await loadMessages(false)}catch(e){setStatus(e.message)}}
  async function openChat(){addModal();document.getElementById("mamaStoChatModal").classList.add("open");opened=true;await loadMessages(true);document.getElementById("mamaStoChatInput")?.focus()}
  function closeChat(){document.getElementById("mamaStoChatModal")?.classList.remove("open");opened=false}

  async function init(){if(!window.supabase)return;css();addButton();addModal();await loadMessages(false);if(timer)clearInterval(timer);timer=setInterval(()=>loadMessages(opened),1500);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadMessages(opened)})}
  window.mamaStoChat={open:openChat,close:closeChat,refresh:()=>loadMessages(false)};
  setInterval(addButton,1000);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();