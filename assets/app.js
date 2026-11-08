(() => {
'use strict';
const dishes = window.DISHES;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = 'fandian:v1';
const defaults = () => ({saved:[], reviews:{}, preferences:{budget:100,spicy:2,vegetarian:false}});
let user = defaults(), storageAvailable = true;
try {
  const value = JSON.parse(localStorage.getItem(key));
  if (value && typeof value === 'object') {
    user.saved = Array.isArray(value.saved) ? [...new Set(value.saved.filter(id => dishes.some(d => d.id === id)))] : [];
    if (value.reviews && typeof value.reviews === 'object') for (const d of dishes) {
      const r = value.reviews[d.id];
      if (r && typeof r.name === 'string' && typeof r.text === 'string' && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5) user.reviews[d.id] = {name:r.name.slice(0,16),text:r.text.slice(0,300),rating:r.rating,date:typeof r.date === 'string' ? r.date.slice(0,30) : ''};
    }
    const pref = value.preferences || {};
    user.preferences = {budget:[10,15,20,100].includes(pref.budget) ? pref.budget : 100,spicy:[0,1,2].includes(pref.spicy) ? pref.spicy : 2,vegetarian:pref.vegetarian === true};
  }
} catch { storageAvailable = false; }
let state = {view:'discover', mine:'saved', query:'', canteen:'全部食堂', category:'全部分类', budget:100,taste:'all',high:false,sort:'recommend'};
let detailId = null, randomId = null, toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'),3200); }
function persist() { try { localStorage.setItem(key,JSON.stringify(user)); storageAvailable = true; return true; } catch { storageAvailable = false; toast('浏览器无法保存数据，本次操作仅在当前页面有效'); return false; } }
function rating(d) { const r = user.reviews[d.id]; return r ? (d.rating*d.count+r.rating)/(d.count+1) : d.rating; }
function count(d) { return d.count + (user.reviews[d.id] ? 1 : 0); }
function fitsPreferences(d) { const p=user.preferences; return d.price<=p.budget && d.spicy<=p.spicy && (!p.vegetarian || d.vegetarian); }
function recommendation(d) { return (fitsPreferences(d) ? 10 : 0) + rating(d) + (user.saved.includes(d.id) ? .15 : 0); }
function filtered() {
 const q=state.query.trim().toLowerCase();
 return dishes.filter(d => (!q || [d.name,d.canteen,d.window,d.category,d.description,...d.tags,['不辣','微辣','中辣'][d.spicy],d.vegetarian?'素食':''].join(' ').toLowerCase().includes(q)) && (state.canteen==='全部食堂'||d.canteen===state.canteen) && (state.category==='全部分类'||d.category===state.category) && d.price<=state.budget && (state.taste==='all'||(state.taste==='veg'?d.vegetarian:d.spicy===Number(state.taste))) && (!state.high||rating(d)>=4.7));
}
function sorted(list, mode=state.sort) { return [...list].sort((a,b) => mode==='price'?a.price-b.price:mode==='rating'?rating(b)-rating(a):mode==='popular'?count(b)-count(a):recommendation(b)-recommendation(a)); }
function card(d,index) {
 const saved=user.saved.includes(d.id);
 return `<article class="dish-card"><div class="card-visual"><button class="dish-open" data-detail="${d.id}" aria-label="查看${d.name}详情"><img src="${d.image}" alt="${d.name}示意插画" loading="lazy" width="640" height="460"></button><span class="card-badge ${state.view==='ranking'?'rank-badge':''}">${state.view==='ranking'?'TOP '+(index+1):escape(d.tags[0])}</span><button class="save-button ${saved?'saved':''}" data-save="${d.id}" aria-label="${saved?'取消收藏':'收藏'}${d.name}" aria-pressed="${saved}">${saved?'♥':'♡'}</button></div><div class="card-body"><div class="card-title-row"><h3><button data-detail="${d.id}">${d.name}</button></h3><span class="score" aria-label="${rating(d).toFixed(1)} 分">★ ${rating(d).toFixed(1)}</span></div><p class="card-location">⌖ ${d.canteen} · ${d.window}</p><div class="card-tags"><span>${['不辣','微辣','中辣'][d.spicy]}</span><span>${d.vegetarian?'素食友好':d.tags[1]}</span><span>约 ${d.wait} 分钟</span></div><div class="card-footer"><span class="price"><small>¥</small>${d.price}<span>/ 份</span></span><span class="review-count">${count(d)} 条点评</span><button data-detail="${d.id}">看看详情 ↗</button></div></div></article>`;
}
function syncFilters() {
 for (const [target,values,field] of [['canteen-filters',['全部食堂','一食堂','二食堂','三食堂'],'canteen'],['category-filters',['全部分类','中式米饭','面食粉类','轻食沙拉','早餐小吃'],'category']]) $('#'+target).innerHTML=values.map(v=>`<button data-filter="${field}" data-value="${v}" class="${state[field]===v?'active':''}" aria-pressed="${state[field]===v}">${v}</button>`).join('');
 $('#search').value=state.query; $('#budget').value=state.budget; $('#taste').value=state.taste; $('#high-rating').checked=state.high; $('#sort').value=state.sort;
}
function render() {
 const mine=state.view==='mine', rank=state.view==='ranking';
 $$('[data-nav]').forEach(a=>{ a.classList.toggle('active',a.dataset.nav===state.view); if(a.dataset.nav===state.view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
 $('#saved-count').textContent=user.saved.length;
 $('#section-title').innerHTML=mine?'我的食光<span class="small-dot">.</span>':rank?'校园好味，口碑说了算<span class="small-dot">.</span>':'发现你的下一口喜欢<span class="small-dot">.</span>';
 $('#section-kicker').textContent=mine?'YOUR FOOD MEMORIES':rank?'CAMPUS FAVORITES':'YOUR NEXT FAVORITE';
 $('#section-description').textContent=mine?'收藏想吃的，记下吃过的，把好味道留住。':rank?'按评分排列的校园好味道，评分相同时保留菜品原始顺序。':'吃什么不用想太久，好味道就在身边。';
 $('#discover-controls').hidden=mine; $('#mine-tabs').hidden=!mine; $('#sort-label').hidden=rank||(mine&&state.mine==='reviews');
 $$('[data-mine]').forEach(b=>{b.classList.toggle('active',b.dataset.mine===state.mine);b.setAttribute('aria-pressed',b.dataset.mine===state.mine);});
 let list=mine?dishes.filter(d=>state.mine==='saved'?user.saved.includes(d.id):user.reviews[d.id]):filtered();
 list=sorted(list,rank?'rating':state.sort);
 $('#results-count').innerHTML=mine?`共 <strong>${list.length}</strong> ${state.mine==='saved'?'道收藏菜品':'条个人点评'}`:`找到 <strong>${list.length}</strong> 道好味道${state.sort==='recommend'&&!rank?' · 根据口味偏好优先推荐':''}`;
 $('#dish-grid').innerHTML=mine&&state.mine==='reviews'?list.map(d=>{const r=user.reviews[d.id];return `<article class="my-review-card"><img src="${d.image}" alt="${d.name}示意插画"><div><h3><button data-detail="${d.id}">${d.name} ↗</button></h3><p>${escape(r.text)}</p><div class="review-tools"><span class="score">${'★'.repeat(r.rating)}</span><small>${escape(r.date)}</small><button class="text-button" data-review="${d.id}">修改点评</button><button class="text-button" data-delete="${d.id}">删除</button></div></div></article>`;}).join(''):list.map(card).join('');
 const empty=$('#empty-state');empty.hidden=!!list.length;
 empty.querySelector('h3').textContent=mine?(state.mine==='saved'?'收藏夹还在等第一道好味道':'你的第一篇食堂日记，从这里开始'):'暂时没有找到这一口';
 empty.querySelector('p').textContent=mine?(state.mine==='saved'?'点击菜品上的爱心，下次就能轻松找到。':'去菜品详情写下用餐感受，记录自己的口味。'):'试试换个关键词，或者放宽一点筛选条件。';
}
function resetFilters() {Object.assign(state,{query:'',canteen:'全部食堂',category:'全部分类',budget:100,taste:'all',high:false,sort:'recommend'});syncFilters();render();}
function showDialog(id) { const target=$('#'+id);$$('dialog[open]').forEach(d=>{if(d!==target)d.close();});if(!target.open)target.showModal(); }
function toggleSaved(id) {if(!dishes.some(d=>d.id===id))return;const had=user.saved.includes(id);user.saved=had?user.saved.filter(x=>x!==id):[...user.saved,id];const saved=persist();render();if($('#detail-dialog').open)renderDetail(id);if(saved)toast(had?'已取消收藏':'已收藏到「我的食光」');}
function renderDetail(id) {
 const d=dishes.find(d=>d.id===id);if(!d)return;detailId=id;const own=user.reviews[id];const reviews=[...(own?[{...own,own:true}]:[]),...d.reviews];
 $('#detail-content').innerHTML=`<div class="detail-top"><img src="${d.image}" alt="${d.name}示意插画"><div class="detail-summary"><span class="eyebrow orange">GOOD FOOD, GOOD MOOD</span><h2 id="detail-title">${d.name}</h2><span class="score">★ ${rating(d).toFixed(1)}</span> <span class="review-count">${count(d)} 条点评 · 含模拟汇总</span><p class="card-location">${d.canteen} · ${d.window}</p><span class="price"><small>¥</small>${d.price}<span>/ 份</span></span></div></div><div class="detail-main"><p class="detail-description">${d.description}</p><div class="detail-facts"><div><span>供应时段（示例）</span>${d.hours}</div><div><span>参考等待时间</span>约 ${d.wait} 分钟</div><div><span>口味与分类</span>${['不辣','微辣','中辣'][d.spicy]} · ${d.category}${d.vegetarian?' · 素食':''}</div><div><span>可能含有（请向窗口确认）</span>${d.allergens}</div></div><div class="detail-actions"><button class="button ghost" data-save="${id}" aria-pressed="${user.saved.includes(id)}">${user.saved.includes(id)?'♥ 已收藏':'♡ 收藏这道菜'}</button><button class="button primary" data-review="${id}">${own?'修改我的点评':'写下我的点评'} ↗</button></div><div class="detail-reviews-heading"><h3>这一口，大家怎么说</h3><span>展示 ${reviews.length} 条 · 含示例点评</span></div>${reviews.map(r=>`<article class="review-item"><div><strong>${escape(r.name)}</strong>${r.own?'<span class="review-owner">我的点评</span>':''}<span class="score">${'★'.repeat(r.rating)}</span><span class="review-date">${escape(r.date)}</span></div><p>${escape(r.text)}</p>${r.own?`<button class="text-button" data-review="${id}">修改点评</button>`:''}</article>`).join('')}</div>`;
}
function openDetail(id) {renderDetail(id);showDialog('detail-dialog');}
function fillReview(id) {
 const r=user.reviews[id];$('#review-dish').value=id;$('#review-name').value=r?.name||Object.values(user.reviews)[0]?.name||'';$('#review-text').value=r?.text||'';
 const score=r?.rating||5;$('#star-input').innerHTML=[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" ${n===score?'checked':''} required aria-label="${n} 星"><span class="${n<=score?'lit':''}" aria-hidden="true">★</span></label>`).join('');
}
function openReview(id) {$('#review-dish').innerHTML=dishes.map(d=>`<option value="${d.id}">${d.name} · ${d.canteen}</option>`).join('');fillReview(id||dishes[0].id);showDialog('review-dialog');}
function openPreferences() {$('#pref-budget').value=user.preferences.budget;$('#pref-spicy').value=user.preferences.spicy;$('#pref-veg').checked=user.preferences.vegetarian;showDialog('preferences-dialog');}
function chooseRandom() {
 const candidates=(state.view==='mine'?dishes:filtered()).filter(fitsPreferences);
 const pool=candidates.length>1?candidates.filter(d=>d.id!==randomId):candidates;
 const d=pool[Math.floor(Math.random()*pool.length)];
 $('#random-detail').disabled=!d;$('[data-action="reroll"]').disabled=pool.length===0;
 if(!d){randomId=null;$('#random-content').innerHTML='<div class="empty-state"><h3>这次条件有一点严格</h3><p>没有同时符合当前筛选与口味偏好的菜品。</p><button class="text-button" data-action="preferences">调整我的口味 →</button><br><button class="text-button" data-action="random-reset">清空当前筛选 →</button></div>';}
 else {randomId=d.id;$('#random-content').innerHTML=`<div class="random-result"><img src="${d.image}" alt="${d.name}示意插画"><h3>${d.name}</h3><p>${d.canteen} · ${d.window}</p><p><span class="price">¥${d.price}</span>　<span class="score">★ ${rating(d).toFixed(1)}</span></p><p>符合预算与口味偏好 · ${d.tags.join(' · ')}</p></div>`;}
 showDialog('random-dialog');
}
function route() {const hash=location.hash.slice(1);if(['discover','ranking','mine'].includes(hash)){state.view=hash;render();if(hash!=='discover')$('#menu').scrollIntoView({behavior:'instant'});} }
document.addEventListener('click',event=>{
 const b=event.target.closest('button,a');if(!b)return;
 if(b.hasAttribute('data-close')){b.closest('dialog').close();return;}
 if(b.dataset.detail){openDetail(b.dataset.detail);return;}
 if(b.dataset.save){toggleSaved(b.dataset.save);return;}
 if(b.dataset.review){openReview(b.dataset.review);return;}
 if(b.dataset.delete){const id=b.dataset.delete;const previous=user.reviews[id];delete user.reviews[id];const ok=persist();render();if(ok){toast('点评已删除');const undo=document.createElement('button');undo.textContent='撤销';undo.style.cssText='color:#fff;text-decoration:underline;margin-left:16px';undo.addEventListener('click',()=>{user.reviews[id]=previous;const restored=persist();render();if(restored)toast('点评已恢复');});$('#toast').append(undo);$('#toast').style.pointerEvents='auto';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').classList.remove('visible');$('#toast').style.pointerEvents='';},8000);}return;}
 if(b.dataset.filter){state[b.dataset.filter]=b.dataset.value;syncFilters();render();return;}
 if(b.dataset.mine){state.mine=b.dataset.mine;render();return;}
 if(b.dataset.preset){state.view='discover';resetFilters();if(b.dataset.preset==='popular')state.high=true;if(b.dataset.preset==='budget')state.budget=10;if(b.dataset.preset==='light')state.category='轻食沙拉';location.hash='menu';syncFilters();render();$('#menu').scrollIntoView({behavior:'instant'});return;}
 switch(b.dataset.action){
 case 'write':openReview();break;
 case 'random':case 'reroll':chooseRandom();break;
 case 'random-reset':resetFilters();chooseRandom();break;
 case 'preferences':openPreferences();break;
 case 'about':showDialog('about-dialog');break;
 case 'reset':state.view='discover';resetFilters();location.hash='menu';break;
 }
});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});
$('#budget').addEventListener('change',e=>{state.budget=Number(e.target.value);render();});
$('#taste').addEventListener('change',e=>{state.taste=e.target.value;render();});
$('#high-rating').addEventListener('change',e=>{state.high=e.target.checked;render();});
$('#sort').addEventListener('change',e=>{state.sort=e.target.value;render();});
$('#random-detail').addEventListener('click',()=>{if(randomId)openDetail(randomId);});
$('#review-dish').addEventListener('change',e=>fillReview(e.target.value));
$('#star-input').addEventListener('change',e=>{$$('#star-input span').forEach((s,i)=>s.classList.toggle('lit',i<Number(e.target.value)));});
$('#review-form').addEventListener('submit',e=>{
 e.preventDefault();const id=$('#review-dish').value,name=$('#review-name').value.trim(),text=$('#review-text').value.trim(),score=Number(new FormData(e.target).get('rating'));
 if(!name||text.length<5||![1,2,3,4,5].includes(score)){toast('请填写昵称、评分和至少 5 个字的用餐感受');return;}
 user.reviews[id]={name,text,rating:score,date:new Date().toLocaleDateString('zh-CN')};const ok=persist();render();openDetail(id);if(ok)toast('点评已保存，感谢认真记录这一餐');
});
$('#preferences-form').addEventListener('submit',e=>{e.preventDefault();user.preferences={budget:Number($('#pref-budget').value),spicy:Number($('#pref-spicy').value),vegetarian:$('#pref-veg').checked};const ok=persist();$('#preferences-dialog').close();state.sort='recommend';$('#sort').value='recommend';render();if(ok)toast('口味偏好已保存，推荐已更新');});
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!$('dialog[open]')){e.preventDefault();if(state.view==='mine'){state.view='discover';render();}$('#search').focus();$('#menu').scrollIntoView({behavior:'instant'});}});
window.addEventListener('hashchange',route);
syncFilters();route();render();
if(!storageAvailable)toast('本地记录不可读取，将使用临时数据；保存时会再次尝试');
})();
