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
const { FACILITIES, ROLES, EVENTS } = require('./content.js');

const facilities = JSON.stringify(Object.values(FACILITIES));
const roles = JSON.stringify(Object.values(ROLES));
const events = JSON.stringify(EVENTS);

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
  <span class="blink">&#9679;</span> CYBER TRAIL v0.1 &mdash; standalone demo (runs offline in your browser).
  All "attacks" are simulated for learning.
</footer>

<script>
'use strict';
// ====== Inlined content ======
var FACILITIES = ${facilities};
var ROLES = ${roles};
var EVENTS = ${events};

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
  run.lastOutcome={ choiceId:ch.id, outcome:ch.outcome, isRecommended:ch.isRecommended, learning:ev.learning, eventTitle:ev.title };
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
  function render(nodes){ var app=getApp(); if(!app) return; app.textContent=''; app.classList.remove('fade'); void app.offsetWidth; app.classList.add('fade'); (Array.isArray(nodes)?nodes:[nodes]).forEach(function(n){app.appendChild(n);}); window.scrollTo(0,0); }
  var state={ facilityId:null, roleId:null, game:null };

  function titleScreen(){
    render([
      el('div',{class:'center'},[
        el('p',{class:'eyebrow',text:'// INSERT COIN — CRITICAL INFRASTRUCTURE DIVISION'}),
        el('h1',{class:'title',text:'CYBER TRAIL'}),
        el('p',{class:'subtitle',text:'Survive the journey. Defend the grid. Learn the threats.'})
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
  function beginGame(){ state.game=startGame(state.facilityId,state.roleId); journeyScreen(); }

  function meter(label,value){
    var cls=value>50?'good':value>25?'warn':'bad';
    return el('div',{class:'meter'},[
      el('div',{class:'label'},[ el('span',{text:label}), el('span',{text:String(value)}) ]),
      el('div',{class:'bar'},[ el('div',{class:'fill '+cls,style:'width:'+value+'%'}) ])
    ]);
  }
  function hud(g){ return el('div',{class:'hud'},[ meter('Integrity',g.resources.integrity), meter('Uptime',g.resources.uptime), meter('Budget',g.resources.budget), meter('Morale',g.resources.morale) ]); }

  function journeyScreen(){
    var g=state.game; if(g.status!=='in_progress'||!g.currentEvent) return endScreen();
    var ev=g.currentEvent; var keys=['A','B','C','D'];
    render([
      el('div',{class:'stage-bar',text:'◢ STAGE '+(g.stage+1)+' / '+g.totalStages+'   ·   SCORE '+g.score}),
      hud(g),
      el('div',{class:'panel'},[
        el('p',{class:'eyebrow',text:'// INCOMING EVENT'}),
        el('h2',{class:'subtitle',text:ev.title}),
        el('p',{class:'prompt-text',text:ev.prompt}),
        el('div',{}, ev.choices.map(function(c,i){
          return el('button',{class:'choice',onClick:function(){ state.game=choose(ev.id,c.id); debriefScreen(); }},[
            el('span',{class:'key',text:(keys[i]||'•')+'.'}), c.label
          ]);
        }))
      ])
    ]);
  }
  function debriefScreen(){
    var g=state.game; var o=g.lastOutcome; if(!o) return journeyScreen(); var L=o.learning;
    var nodes=[
      el('div',{class:'stage-bar',text:'◢ DEBRIEF — '+(o.eventTitle||'')}),
      hud(g),
      el('div',{class:'panel debrief'},[
        el('span',{class:'badge '+(o.isRecommended?'ok':'no'),text:o.isRecommended?'✓ Strong security decision':'✗ Risky decision'}),
        el('p',{class:'prompt-text',text:o.outcome}),
        el('hr'),
        el('p',{class:'eyebrow',text:'// THREAT INTEL'}),
        el('p',{},[ el('span',{class:'attack-name',text:L.attackType}) ]),
        el('p',{class:'prompt-text',text:L.summary}),
        el('p',{class:'real-world',text:'⌁ Real world: '+L.realWorldExample}),
        el('p',{class:'eyebrow',text:'// HOW TO PREVENT IT'}),
        el('ul',{class:'learn-list'}, L.preventiveMeasures.map(function(m){return el('li',{text:m});})),
        L.mitreAttck?el('p',{class:'meta',text:'MITRE ATT&CK: '+L.mitreAttck}):null
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
