'use strict';
/**
 * Builds a single self-contained HTML file (no server, no dependencies) for
 * previewing / playing CYBER TRAIL by just opening it in a browser.
 *
 * It inlines: the cyberpunk CSS, the game content, a browser-side port of the
 * server's engine logic, and the UI. NOTE: this demo build runs the normally
 * server-side logic in the browser, so it does NOT preserve the anti-cheat
 * trust boundary — it is for viewing/playing the UI only. The real game keeps
 * all logic on the server (see SECURITY.md).
 */
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, 'public', 'styles.css'), 'utf8');
const matrixJs = fs.readFileSync(path.join(__dirname, 'public', 'matrix.js'), 'utf8');

// Inline the logo images as base64 data URIs so the standalone stays a single
// offline file. (Marshall marks used with permission.)
function dataUri(file, mime) {
  const b64 = fs.readFileSync(path.join(__dirname, 'public', file)).toString('base64');
  return 'data:' + mime + ';base64,' + b64;
}
const cyberBisonUri = dataUri('cyber-bison.png', 'image/png');
const marcoBisonUri = dataUri('mascot.png', 'image/png');

const { FACILITIES, ROLES, EVENTS } = require('./content.js');
const { GLOSSARY } = require('./glossary.js');
const {
  MINIGAMES,
  EVENT_MINIGAMES,
  scoreMiniGame: _scoreMiniGame,
} = require('./minigames.js');

// Inline the REAL grader source (so the standalone's per-item review matches
// the server exactly). These helpers are pure and browser-safe.
const graderSource = [
  normalizeCmdSource(),
  'function clampPct(n){ return Math.max(0, Math.min(1, n)); }',
  bandFromScoreSource(),
  withReviewSource(),
  _scoreMiniGame.toString(),
].join('\n');

function normalizeCmdSource() {
  return (
    'function normalizeCmd(s){ if(typeof s!=="string") return ""; ' +
    "return s.replace(/[\\u2018\\u2019\\u201C\\u201D]/g, \"'\").replace(/\"/g, \"'\")" +
    ".toLowerCase().replace(/\\s+/g,' ').replace(/\\s*;\\s*$/,'').trim(); }"
  );
}
function bandFromScoreSource() {
  return (
    'function bandFromScore(score){ if(score>=0.999) return {band:"perfect",score:score};' +
    ' if(score>=0.6) return {band:"good",score:score}; return {band:"fail",score:score}; }'
  );
}
function withReviewSource() {
  return (
    'function withReview(score, review, skipped){ var wrongCount=review.filter(function(r){return !r.ok;}).length;' +
    ' var band = skipped ? "fail" : bandFromScore(score).band;' +
    ' return { band:band, score:score, wrongCount:wrongCount, review:review, skipped:!!skipped }; }'
  );
}

const facilities = JSON.stringify(Object.values(FACILITIES));
const roles = JSON.stringify(Object.values(ROLES));
const events = JSON.stringify(EVENTS);
const glossary = JSON.stringify(GLOSSARY);
// NOTE: the standalone demo is offline and client-only, so (unlike the real
// server) the answer keys necessarily ship to the browser. That's acceptable
// for a demo; the real game keeps grading server-side. See SECURITY.md.
const minigames = JSON.stringify(MINIGAMES);
const eventMinigames = JSON.stringify(EVENT_MINIGAMES);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CYBER TRAIL // Critical Infrastructure (standalone demo)</title>
<style>
${css}
</style>
</head>
<body>
<canvas id="matrix" aria-hidden="true"></canvas>
<div class="crt" aria-hidden="true"></div>
<div class="scanlines" aria-hidden="true"></div>
<main id="app" class="screen">
  <noscript>
    <div class="panel" style="margin-top:2rem">
      <h2 class="subtitle">JavaScript is required</h2>
      <p class="prompt-text">This game runs in your browser with JavaScript.
      It looks like scripts are disabled, or this file was opened in a preview
      (e.g. an email, messaging app, or cloud-drive viewer) that does not run
      scripts. Please <strong>save the file and open it in a real browser</strong>
      (Safari or Chrome), or enable JavaScript.</p>
    </div>
  </noscript>
</main>
<footer class="footer">
  <span class="blink">&#9679;</span> CYBER TRAIL v0.1 &mdash; in collaboration with the
  Marshall University Institute for Cyber Security.
  All "attacks" are simulated for learning.
</footer>

<script>
${matrixJs}
</script>

<script>
'use strict';
// ====== Inlined content ======
var FACILITIES = ${facilities};
var ROLES = ${roles};
var EVENTS = ${events};
var GLOSSARY = ${glossary};

// ====== Glossary detection ("Beyond the acronym") ======
var GLOSSARY_TERMS = Object.keys(GLOSSARY);
function glossaryFor(ev){
  var parts=[ev.prompt];
  for(var i=0;i<ev.choices.length;i++){ parts.push(ev.choices[i].label); parts.push(ev.choices[i].outcome); }
  var text=parts.join(' \\u241F ');
  var found=[];
  for(var t=0;t<GLOSSARY_TERMS.length;t++){
    var term=GLOSSARY_TERMS[t];
    var esc=term.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&');
    var re=new RegExp('(^|[^A-Za-z0-9])'+esc+'s?([^A-Za-z0-9]|\$)');
    if(re.test(text)) found.push({ term:term, definition:GLOSSARY[term] });
  }
  found.sort(function(a,b){ return a.term<b.term?-1:(a.term>b.term?1:0); });
  return found;
}
// Build glossary from arbitrary text blocks (for the debrief).
function glossaryForText(blocks){
  return glossaryFor({ prompt: blocks.join(' \\u241F '), choices: [] });
}

// ====== Mini-games (data + the REAL grader, inlined from minigames.js) ======
var MINIGAMES = ${minigames};
var EVENT_MINIGAMES = ${eventMinigames};
function miniGameIdForEvent(id){ return EVENT_MINIGAMES[id] || null; }
function publicMiniGame(id){ var d=MINIGAMES[id]; return { id:id, type:d.type, config:d.config, attackType:d.attackType }; }
${graderSource}
function submitMiniGameLocal(eventId, minigameId, result, skipped){
  var def=MINIGAMES[minigameId];
  var pool=eventsFor(run.facilityId,run.roleId);
  var ev=findEvent(run.currentEventId,pool);
  var scored=scoreMiniGame(def, result, skipped);
  var band=scored.band;
  var graded=def.grades[band];
  for(var i=0;i<graded.effects.length;i++){ var eff=graded.effects[i]; run.resources[eff.key]=clamp(run.resources[eff.key]+eff.amount); }
  var gloss=glossaryForText([graded.outcome, ev.learning.summary, ev.learning.realWorldExample, ev.learning.preventiveMeasures.join(' ')]);
  run.lastOutcome={ choiceId:'minigame:'+minigameId, outcome:graded.outcome, isRecommended:(band==='perfect'||band==='good'), band:band, skipped:!!skipped, wrongCount:scored.wrongCount, review:scored.review, learning:ev.learning, eventTitle:ev.title, glossary:gloss };
  run.stage+=1;
  if(run.resources.integrity<=0||run.resources.uptime<=0){ run.status='lost'; run.currentEventId=null; }
  else if(run.stage>=run.totalStages){ run.status='won'; run.currentEventId=null; }
  else { run.currentEventId=run.deck[run.stage]||null; if(!run.currentEventId) run.status='won'; }
  return view(run);
}

// ====== Browser-side engine (ported from server engine.js) ======
// DEMO ONLY: in the real game this logic lives on the server (trust boundary).
function clamp(n){ return Math.max(0, Math.min(100, n)); }
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }
function eventsFor(fid,rid){ return EVENTS.filter(function(e){return e.facilities.indexOf(fid)>=0 && e.roles.indexOf(rid)>=0;}); }
function findEvent(id,pool){ for(var i=0;i<pool.length;i++){ if(pool[i].id===id) return pool[i]; } return null; }

var run = null;
function computeScore(r){
  var res=r.resources; var survival=r.stage*100;
  var resourceScore=res.integrity*3+res.uptime*3+res.budget+res.morale;
  var winBonus=r.status==='won'?500:0;
  return Math.max(0, survival+resourceScore+winBonus);
}
function view(r){
  var pool=eventsFor(r.facilityId,r.roleId);
  var ev=r.currentEventId?findEvent(r.currentEventId,pool):null;
  if(ev){ var copy={}; for(var k in ev) copy[k]=ev[k]; copy.glossary=glossaryFor(ev); var mgId=miniGameIdForEvent(ev.id); if(mgId) copy.minigame=publicMiniGame(mgId); ev=copy; }
  return { sessionId:'local', facilityId:r.facilityId, roleId:r.roleId, stage:r.stage,
    totalStages:r.totalStages, resources:r.resources, status:r.status, score:computeScore(r),
    currentEvent:ev, lastOutcome:r.lastOutcome };
}
function startGame(fid,rid){
  var fac=FACILITIES.filter(function(f){return f.id===fid;})[0];
  var pool=eventsFor(fid,rid);
  var totalStages=Math.min(fac.stages, pool.length);
  var deck=shuffle(pool.map(function(e){return e.id;})).slice(0,totalStages);
  run={ facilityId:fid, roleId:rid, stage:0, totalStages:totalStages,
    resources:{integrity:fac.startingResources.integrity,uptime:fac.startingResources.uptime,
      budget:fac.startingResources.budget,morale:fac.startingResources.morale},
    status:'in_progress', deck:deck, currentEventId:deck[0]||null, lastOutcome:null };
  return view(run);
}
function choose(eventId,choiceId){
  var pool=eventsFor(run.facilityId,run.roleId);
  var ev=findEvent(run.currentEventId,pool);
  var ch=ev.choices.filter(function(c){return c.id===choiceId;})[0];
  for(var i=0;i<ch.effects.length;i++){ var eff=ch.effects[i]; run.resources[eff.key]=clamp(run.resources[eff.key]+eff.amount); }
  var debriefGloss=glossaryForText([ch.outcome, ev.learning.summary, ev.learning.realWorldExample, ev.learning.preventiveMeasures.join(' ')]);
  run.lastOutcome={ choiceId:ch.id, outcome:ch.outcome, isRecommended:ch.isRecommended, learning:ev.learning, eventTitle:ev.title, glossary:debriefGloss };
  run.stage+=1;
  if(run.resources.integrity<=0||run.resources.uptime<=0){ run.status='lost'; run.currentEventId=null; }
  else if(run.stage>=run.totalStages){ run.status='won'; run.currentEventId=null; }
  else { run.currentEventId=run.deck[run.stage]||null; if(!run.currentEventId) run.status='won'; }
  return view(run);
}

// ====== UI (adapted from public/app.js to call the local engine) ======
(function(){
  function getApp(){ return document.getElementById('app'); }
  function el(tag,props,children){
    var node=document.createElement(tag);
    if(props){ for(var k in props){
      if(k==='class') node.className=props[k];
      else if(k==='text') node.textContent=props[k];
      else if(k.indexOf('on')===0 && typeof props[k]==='function'){ node.addEventListener(k.slice(2).toLowerCase(),props[k]); }
      else node.setAttribute(k,props[k]);
    }}
    (children||[]).forEach(function(c){ if(c==null) return; node.appendChild(typeof c==='string'?document.createTextNode(c):c); });
    return node;
  }
  function render(nodes){ var app=getApp(); if(!app) return; app.textContent=''; app.classList.remove('fade'); void app.offsetWidth; app.classList.add('fade'); (Array.isArray(nodes)?nodes:[nodes]).forEach(function(n){ if(n!=null) app.appendChild(n); }); window.scrollTo(0,0); }
  var state={ facilityId:null, roleId:null, game:null };

  function titleScreen(){
    render([
      el('div',{class:'center'},[
        el('p',{class:'eyebrow',text:'// INSERT COIN — CRITICAL INFRASTRUCTURE DIVISION'}),
        el('img',{class:'hero-logo',src:'${cyberBisonUri}',alt:'Marshall Cyber Bison'}),
        el('h1',{class:'title',text:'CYBER TRAIL'}),
        el('p',{class:'subtitle',text:'Survive the journey. Defend the grid. Learn the threats.'}),
        el('p',{class:'collab',text:'In collaboration with the Marshall University Institute for Cyber Security.'})
      ]),
      el('div',{class:'panel'},[
        el('p',{class:'prompt-text',text:'The year is now. You are responsible for guiding a piece of critical infrastructure through a gauntlet of cyber threats. Like the pioneers of old, your journey is full of hazards — but yours are phishing emails, ransomware, and insider threats instead of dysentery and broken axles. Choose your facility. Choose your role. Make smart decisions. Survive.'}),
        el('div',{class:'btn-row'},[ el('button',{class:'btn',onClick:facilityScreen,text:'▶ Begin Journey'}) ])
      ])
    ]);
  }
  function facilityScreen(){
    render([
      el('p',{class:'eyebrow',text:'// STEP 1 OF 2 — SELECT FACILITY'}),
      el('h2',{class:'subtitle',text:'Which critical infrastructure will you defend?'}),
      el('div',{class:'card-grid'}, FACILITIES.map(function(fac){
        return el('button',{class:'card',onClick:function(){state.facilityId=fac.id; roleScreen();}},[
          el('div',{class:'tag',text:fac.sector}), el('h3',{text:fac.name}), el('p',{text:fac.description})
        ]);
      }))
    ]);
  }
  function roleScreen(){
    render([
      el('p',{class:'eyebrow',text:'// STEP 2 OF 2 — SELECT ROLE'}),
      el('h2',{class:'subtitle',text:'Whose eyes will you see the threats through?'}),
      el('div',{class:'card-grid'}, ROLES.map(function(role){
        return el('button',{class:'card',onClick:function(){state.roleId=role.id; beginGame();}},[
          el('div',{class:'tag',text:role.tagline}), el('h3',{text:role.name}), el('p',{text:role.description})
        ]);
      })),
      el('div',{class:'btn-row'},[ el('button',{class:'btn secondary',onClick:facilityScreen,text:'◀ Back'}) ])
    ]);
  }
  function isMobile(){
    var coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
    var touch=('ontouchstart' in window)||(navigator.maxTouchPoints||0)>0;
    var narrow=window.innerWidth<=820;
    var uaMobile=navigator.userAgentData?!!navigator.userAgentData.mobile:/Mobi|Android|iPhone|iPod/i.test(navigator.userAgent||'');
    return (uaMobile||((coarse||touch)&&narrow));
  }
  function startJourney(){ state.game=startGame(state.facilityId,state.roleId); journeyScreen(); }
  function beginGame(){ if(isMobile()) startJourney(); else importScreen(); }
  var LINUX_HINTS=[
    "This operating system's kernel, first released in 1991 by Linus Torvalds, shares its creator's first name. What is it?",
    'Its mascot is a penguin named Tux. Name this open-source OS.',
    'Android is built on top of this open-source OS kernel. Name it.'
  ];
  function accessGateFor(role){
    if(role==='operator') return { password:'linux', caseSensitive:false, hints:LINUX_HINTS.map(function(h){return 'access code hint: '+h+' (answer is all lowercase)';}) };
    if(role==='supervisor') return { password:'Marco', caseSensitive:true, hints:['access code hint: the password is the Mascot\\u2019s name, capitalized.'] };
    return null;
  }
  function importScreen(){
    var fac=state.facilityId, role=state.roleId;
    var expected=('import '+fac+' --'+role).toLowerCase();
    var gate=accessGateFor(role);
    var screen=el('div',{class:'term-screen term-import-screen'});
    var input=el('input',{class:'term-input',autocomplete:'off',spellcheck:'false',placeholder:'type here and press Enter'});
    var promptSpan=el('span',{class:'term-prompt',text:'operator@cyber-trail:~\$ '});
    var phase='import';
    function print(line,cls){ screen.appendChild(el('div',{class:'term-line'+(cls?' '+cls:'')},[line])); screen.scrollTop=screen.scrollHeight; }
    function setMasked(m){ input.type=m?'password':'text'; input.value=''; input.placeholder=m?'enter access code and press Enter':'type the import command and press Enter'; }
    function norm(s){ return (s||'').toLowerCase().replace(/\\s+/g,' ').trim(); }
    function checkPassword(raw){ return gate.caseSensitive?(raw===gate.password):(raw.toLowerCase()===gate.password.toLowerCase()); }
    function beginAuth(){
      print('restricted: '+role+' access requires an access code.','term-dim');
      print(gate.hints[(Math.random()*gate.hints.length)|0],'term-dim');
      print('—','term-dim');
      promptSpan.textContent='auth@cyber-trail:~\$ ';
      phase='auth'; setMasked(true); input.focus();
    }
    function launch(){
      input.disabled=true;
      print('fetching '+fac+' profile …','term-out');
      setTimeout(function(){ print('loading '+role+' toolkit …','term-out'); },350);
      setTimeout(function(){ print('integrity check … OK','term-out'); },700);
      setTimeout(function(){ print('mission loaded. launching …','term-ok'); },1000);
      setTimeout(function(){ startJourney(); },1500);
    }
    function run(){
      var raw=input.value.trim(); if(!raw) return;
      if(phase==='auth'){
        print(promptSpan.textContent+'••••••');
        if(checkPassword(raw)){ print('access granted. welcome, '+role+'.','term-ok'); launch(); }
        else { print('access denied — incorrect access code. try again.','term-dim'); input.value=''; input.focus(); }
        return;
      }
      print(promptSpan.textContent+raw);
      var n=norm(raw);
      var ok=(n===expected)||(n===norm('import --'+role+' '+fac))||(n===norm('import '+fac+' -'+role));
      if(!ok){ if(n.indexOf('import')!==0){ print('command not found: '+raw.split(' ')[0]+' — try: import '+fac+' --'+role,'term-dim'); } else { print('import: unknown target — usage: import <facility> --<role> (import '+fac+' --'+role+')','term-dim'); } input.value=''; input.focus(); return; }
      print('import OK — '+fac+' / '+role+' staged.','term-ok');
      if(gate){ beginAuth(); } else { launch(); }
    }
    input.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); run(); } });
    render([
      el('p',{class:'eyebrow',text:'// MISSION LOADER'}),
      el('h2',{class:'subtitle',text:'Import your mission data'}),
      role==='supervisor' ? el('div',{class:'mascot-cue'},[
        el('img',{class:'mascot-img',src:'${marcoBisonUri}',alt:'Marshall mascot'}),
        el('p',{class:'mascot-cap',text:'Marshall\\u2019s mascot stands guard here.'})
      ]) : null,
      el('div',{class:'panel'},[ screen, el('div',{class:'term-input-row'},[promptSpan,input]) ]),
      el('div',{class:'btn-row'},[ el('button',{class:'btn secondary',onClick:roleScreen,text:'◀ Back'}) ])
    ]);
    print('cyber-trail // mission loader','term-ok');
    print('usage: import <facility> --<role>','term-dim');
    print('note: <> mark placeholders — do not type the angle brackets.','term-dim');
    print('target facility : '+fac,'term-dim');
    print('target role     : '+role,'term-dim');
    print('e.g.  import '+fac+' --'+role,'term-dim');
    print('—','term-dim');
    setMasked(false);
    input.focus();
  }

  function meter(label,value){
    var cls=value>50?'good':value>25?'warn':'bad';
    return el('div',{class:'meter'},[
      el('div',{class:'label'},[ el('span',{text:label}), el('span',{text:String(value)}) ]),
      el('div',{class:'bar'},[ el('div',{class:'fill '+cls,style:'width:'+value+'%'}) ])
    ]);
  }
  function hud(g){ return el('div',{class:'hud'},[ meter('Integrity',g.resources.integrity), meter('Uptime',g.resources.uptime), meter('Budget',g.resources.budget), meter('Morale',g.resources.morale) ]); }

  function glossaryBlock(terms){
    if(!terms||!terms.length) return null;
    var dl=el('dl',{class:'glossary-list'});
    terms.forEach(function(t){ dl.appendChild(el('dt',{text:t.term})); dl.appendChild(el('dd',{text:t.definition})); });
    return el('details',{class:'glossary'},[
      el('summary',{text:'ⓘ Beyond the acronym ('+terms.length+')'}),
      dl
    ]);
  }

  function reviewBlock(o){
    if(!o||!o.review||!o.review.length) return null;
    var total=o.review.length, wrong=o.wrongCount||0;
    var summary=wrong===0?('★ Review your answers — all '+total+' correct'):('⚠ Review your answers — '+wrong+' of '+total+' wrong (tap to see where)');
    var ul=el('ul',{class:'review-list'});
    o.review.forEach(function(r){
      ul.appendChild(el('li',{class:'review-item '+(r.ok?'ok':'no')},[
        el('span',{class:'review-mark',text:r.ok?'✓ ':'✗ '}),
        el('span',{class:'review-label',text:r.label}),
        el('div',{class:'review-detail',text:r.detail})
      ]));
    });
    var details=el('details',{class:'review '+(wrong===0?'all-ok':'has-wrong')},[ el('summary',{text:summary}), ul ]);
    if(wrong>0) details.open=true;
    return details;
  }

  function journeyScreen(){
    var g=state.game; if(g.status!=='in_progress'||!g.currentEvent) return endScreen();
    var ev=g.currentEvent; var keys=['A','B','C','D'];
    render([
      el('div',{class:'stage-bar',text:'◢ STAGE '+(g.stage+1)+' / '+g.totalStages+'   ·   SCORE '+g.score}),
      hud(g),
      el('div',{class:'panel'},[
        el('p',{class:'eyebrow',text:ev.minigame?'// INTERACTIVE CHALLENGE':'// INCOMING EVENT'}),
        el('h2',{class:'subtitle',text:ev.title}),
        el('p',{class:'prompt-text',text:ev.prompt}),
        ev.minigame ? miniGameBlock(ev) : el('div',{}, ev.choices.map(function(c,i){
          return el('button',{class:'choice',onClick:function(){ state.game=choose(ev.id,c.id); debriefScreen(); }},[
            el('span',{class:'key',text:(keys[i]||'•')+'.'}), c.label
          ]);
        })),
        glossaryBlock(ev.glossary)
      ])
    ]);
  }

  function doSubmitMiniGame(ev, result, skipped){
    state.game = submitMiniGameLocal(ev.id, ev.minigame.id, result, skipped);
    debriefScreen();
  }
  function mgButtons(ev, collect){
    return el('div',{class:'btn-row mg-actions'},[
      el('button',{class:'btn',onClick:function(){ doSubmitMiniGame(ev, collect(), false); },text:'✓ Submit'}),
      el('button',{class:'btn secondary',onClick:function(){ if(window.confirm('Skip this challenge? It will be scored as a failure and you will take the full resource loss for it.')) doSubmitMiniGame(ev, {}, true); },text:'⤼ Skip (take the loss)'})
    ]);
  }
  function miniGameBlock(ev){
    try { return miniGameBlockInner(ev); }
    catch(err){
      return el('div',{class:'minigame'},[
        el('p',{class:'error',text:'This challenge failed to load: '+(err&&err.message)}),
        el('div',{class:'btn-row'},[ el('button',{class:'btn secondary',onClick:function(){ doSubmitMiniGame(ev,{},true); },text:'Skip this challenge and continue'}) ])
      ]);
    }
  }
  function miniGameBlockInner(ev){
    var mg=ev.minigame, cfg=mg.config;
    var wrap=el('div',{class:'minigame'},[ el('p',{class:'mg-instructions',text:cfg.instructions}) ]);
    var st={ selected:{}, assignments:{} };
    if(mg.type==='spot_the_phish'){
      wrap.appendChild(el('div',{class:'mg-email'},[
        el('div',{class:'mg-email-head'},[
          el('div',{},[ el('span',{class:'mg-label',text:'From: '}), el('span',{class:'mg-tok',text:cfg.from}) ]),
          el('div',{},[ el('span',{class:'mg-label',text:'Subject: '}), el('span',{class:'mg-tok',text:cfg.subject}) ])
        ]),
        el('div',{class:'mg-tokens'}, cfg.tokens.map(function(t){
          var b=el('button',{class:'mg-token',onClick:function(){ st.selected[t.id]=!st.selected[t.id]; b.classList.toggle('picked',!!st.selected[t.id]); }},[t.text]);
          return b;
        }))
      ]));
      wrap.appendChild(mgButtons(ev,function(){ return { selected:Object.keys(st.selected).filter(function(k){return st.selected[k];}) }; }));
    } else if(mg.type==='pick_practices'){
      wrap.appendChild(el('div',{class:'mg-options'}, cfg.options.map(function(o){
        var chk=el('span',{class:'mg-check',text:'◻ '});
        var b=el('button',{class:'mg-option',onClick:function(){ st.selected[o.id]=!st.selected[o.id]; b.classList.toggle('picked',!!st.selected[o.id]); chk.textContent=st.selected[o.id]?'☑ ':'◻ '; }},[chk,o.text]);
        return b;
      })));
      wrap.appendChild(mgButtons(ev,function(){ return { selected:Object.keys(st.selected).filter(function(k){return st.selected[k];}) }; }));
    } else if(mg.type==='sort_messages'){
      wrap.appendChild(el('div',{class:'mg-sort'}, cfg.items.map(function(it){
        var binRow=el('div',{class:'mg-bins'}, cfg.bins.map(function(bn){
          var bb=el('button',{class:'mg-bin',onClick:function(){ st.assignments[it.id]=bn.id; var all=binRow.querySelectorAll('.mg-bin'); for(var i=0;i<all.length;i++) all[i].classList.remove('sel'); bb.classList.add('sel'); }},[bn.label]);
          return bb;
        }));
        return el('div',{class:'mg-sort-row'},[ el('div',{class:'mg-sort-text',text:it.text}), binRow ]);
      })));
      wrap.appendChild(mgButtons(ev,function(){ return { assignments:st.assignments }; }));
    } else if(mg.type==='order_steps'){
      var chosen=[];
      var chosenBox=el('div',{class:'mg-order-chosen'});
      var pool=el('div',{class:'mg-order-pool'});
      function redraw(){
        chosenBox.textContent='';
        chosen.forEach(function(id,i){ var s=cfg.steps.filter(function(x){return x.id===id;})[0]; chosenBox.appendChild(el('div',{class:'mg-order-item'},[ el('span',{class:'mg-order-num',text:(i+1)+'. '}), s.text ])); });
        pool.textContent='';
        cfg.steps.filter(function(s){return chosen.indexOf(s.id)<0;}).forEach(function(s){ pool.appendChild(el('button',{class:'mg-order-btn',onClick:function(){ chosen.push(s.id); redraw(); }},['+ '+s.text])); });
      }
      redraw();
      wrap.appendChild(el('p',{class:'mg-sublabel',text:'Your order:'}));
      wrap.appendChild(chosenBox);
      wrap.appendChild(el('p',{class:'mg-sublabel',text:'Remaining steps:'}));
      wrap.appendChild(pool);
      wrap.appendChild(el('div',{class:'btn-row'},[ el('button',{class:'btn secondary',onClick:function(){ chosen.length=0; redraw(); },text:'↺ Reset order'}) ]));
      wrap.appendChild(mgButtons(ev,function(){ return { order:chosen.slice() }; }));
    } else if(mg.type==='terminal'){
      wrap.appendChild(terminalGameSA(ev, cfg));
    }
    return wrap;
  }

  function terminalGameSA(ev, cfg){
    var host=el('div',{class:'terminal-host'});
    function levelSelect(){
      host.textContent='';
      host.appendChild(el('p',{class:'prompt-text',text:cfg.scenario}));
      host.appendChild(el('p',{class:'mg-sublabel',text:'How comfortable are you with Linux?'}));
      function card(level,title,desc){ return el('button',{class:'card term-level',onClick:function(){ runGame(level); }},[ el('h3',{text:title}), el('p',{text:desc}) ]); }
      host.appendChild(el('div',{class:'term-levels'},[
        card('guided','🟢 New to Linux','I\\u2019ll show you each command and explain it. You still type it.'),
        card('comfortable','🟡 Comfortable','You get a command palette and a "reveal" option if stuck.'),
        card('expert','🔴 Expert','Just the task and a bare prompt. No hints.')
      ]));
      host.appendChild(el('p',{class:'meta',text:'You can reach a perfect score at any level — the level only changes how much help you get.'}));
    }
    function runGame(level){
      var steps=cfg.steps, idx=0, typed={}, reveals=[];
      host.textContent='';
      var banner=el('div',{class:'term-banner',text:'LEVEL: '+({guided:'NEW TO LINUX (guided)',comfortable:'COMFORTABLE',expert:'EXPERT'}[level])});
      var screen=el('div',{class:'term-screen'});
      var taskBox=el('div',{class:'term-task'});
      var helpBox=el('div',{class:'term-help'});
      var input=el('input',{class:'term-input',type:'text',autocomplete:'off',spellcheck:'false',placeholder:'type a command and press Enter'});
      function print(line,cls){ screen.appendChild(el('div',{class:'term-line'+(cls?' '+cls:'')},[line])); screen.scrollTop=screen.scrollHeight; }
      function printMulti(txt,cls){ String(txt).split('\\n').forEach(function(l){ print(l,cls); }); }
      function loadStep(){
        if(idx>=steps.length) return finish();
        var s=steps[idx];
        taskBox.textContent='';
        taskBox.appendChild(el('span',{class:'term-step-num',text:'STEP '+(idx+1)+'/'+steps.length+' — '}));
        taskBox.appendChild(document.createTextNode(s.task));
        helpBox.textContent='';
        if(level==='guided'){
          helpBox.appendChild(el('div',{class:'term-guide'},[ el('div',{},[el('span',{class:'term-cmd-hint',text:s.canonical})]), el('div',{class:'term-explain',text:s.explain}) ]));
        } else if(level==='comfortable'){
          var pal=el('div',{class:'term-palette'}, (s.palette||[]).map(function(c){ return el('button',{class:'term-pal-btn',onClick:function(){ input.value=c; input.focus(); }},[c]); }));
          var reveal=el('button',{class:'term-reveal',onClick:function(){ if(reveals.indexOf(s.id)<0) reveals.push(s.id); input.value=s.canonical; input.focus(); print('(revealed: '+s.canonical+')','term-dim'); },text:'reveal answer'});
          helpBox.appendChild(el('div',{class:'term-help-row'},[ el('span',{class:'mg-label',text:'commands: '}), pal ]));
          helpBox.appendChild(reveal);
        }
        input.value=''; input.focus();
      }
      function matchesStep(s,raw){ var norm=(raw||'').replace(/"/g,"'").toLowerCase().replace(/\\s+/g,' ').replace(/\\s*;\\s*\$/,'').trim(); var canon=s.canonical.replace(/"/g,"'").toLowerCase().replace(/\\s+/g,' ').trim(); return norm===canon; }
      function submitLine(){
        var s=steps[idx]; var raw=input.value.trim(); if(!raw) return;
        print(cfg.prompt+' '+raw); typed[s.id]=raw;
        if(matchesStep(s,raw)){ printMulti(s.output,'term-out'); print('✓ nice — that\\u2019s the right tool for this step.','term-ok'); idx+=1; setTimeout(loadStep,150); }
        else { print('Hmm, that didn\\u2019t surface what you need. Try another command'+(level==='expert'?'.':(level==='comfortable'?' (or use the palette / reveal).':' — check the suggested command above.')),'term-dim'); }
      }
      function finish(){ print('— investigation complete —','term-ok'); input.disabled=true; }
      input.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); submitLine(); } });
      host.appendChild(banner);
      host.appendChild(taskBox);
      host.appendChild(screen);
      var inputRow=el('div',{class:'term-input-row'},[ el('span',{class:'term-prompt',text:cfg.prompt+' '}), input ]);
      host.appendChild(inputRow);
      host.appendChild(helpBox);
      host.appendChild(mgButtons(ev,function(){ return { level:level, steps:typed, reveals:reveals.slice() }; }));
      print(cfg.scenario,'term-dim');
      loadStep();
    }
    levelSelect();
    return host;
  }
  function debriefScreen(){
    var g=state.game; var o=g.lastOutcome; if(!o) return journeyScreen(); var L=o.learning;
    var nodes=[
      el('div',{class:'stage-bar',text:'◢ DEBRIEF — '+(o.eventTitle||'')}),
      hud(g),
      el('div',{class:'panel debrief'},[
        el('span',{class:'badge '+(o.isRecommended?'ok':'no'),text: o.band ? ((o.skipped?'⤼ Skipped — ':'')+({perfect:'★ PERFECT',good:'✓ GOOD',fail:'✗ FAILED'}[o.band]||o.band)) : (o.isRecommended?'✓ Strong security decision':'✗ Risky decision')}),
        el('p',{class:'prompt-text',text:o.outcome}),
        reviewBlock(o),
        el('hr'),
        el('p',{class:'eyebrow',text:'// THREAT INTEL'}),
        el('p',{},[ el('span',{class:'attack-name',text:L.attackType}) ]),
        el('p',{class:'prompt-text',text:L.summary}),
        el('p',{class:'real-world',text:'⌁ Real world: '+L.realWorldExample}),
        el('p',{class:'eyebrow',text:'// HOW TO PREVENT IT'}),
        el('ul',{class:'learn-list'}, L.preventiveMeasures.map(function(m){return el('li',{text:m});})),
        L.mitreAttck?el('p',{class:'meta',text:'MITRE ATT&CK: '+L.mitreAttck}):null,
        glossaryBlock(o.glossary)
      ])
    ];
    var next=g.status==='in_progress'
      ? el('button',{class:'btn',onClick:journeyScreen,text:'▶ Continue Journey'})
      : el('button',{class:'btn',onClick:endScreen,text:'▶ See Final Report'});
    nodes.push(el('div',{class:'btn-row'},[next]));
    render(nodes);
  }
  function endScreen(){
    var g=state.game; var won=g.status==='won';
    render([
      el('div',{class:'center'},[
        el('p',{class:'eyebrow',text:won?'// JOURNEY COMPLETE':'// JOURNEY FAILED'}),
        el('div',{class:'endbanner '+(won?'win':'lose'),text:won?'INFRASTRUCTURE SECURED':'INFRASTRUCTURE COMPROMISED'}),
        el('p',{class:'prompt-text',text:won?'You guided your facility through the gauntlet. The lights stayed on, the systems stayed clean, and your people stayed sharp. This is what defense in depth looks like.':'A meter hit zero — a breach or outage you could not recover from. In critical infrastructure the stakes are real. Study the debriefs, learn the preventive measures, and run the trail again.'}),
        el('p',{class:'score',text:'FINAL SCORE: '+g.score}),
        hud(g),
        el('div',{class:'btn-row',style:'justify-content:center'},[
          el('button',{class:'btn',onClick:function(){state.game=null; titleScreen();},text:'↺ Play Again'}),
          el('button',{class:'btn secondary',onClick:function(){state.facilityId=null; state.roleId=null; facilityScreen();},text:'⇄ New Facility / Role'})
        ])
      ])
    ]);
  }
  // Boot once the DOM is ready (robust across mobile load timing).
  function boot(){ try { titleScreen(); } catch (err) {
    var a = document.getElementById('app');
    if (a) { a.textContent = 'Something went wrong starting the game: ' + err.message; }
  } }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>
</body>
</html>`;

const out = path.join(__dirname, '..', 'cyber-trail-standalone.html');
fs.writeFileSync(out, html);
console.log('wrote', out, '(' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB)');
