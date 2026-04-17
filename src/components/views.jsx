import React, { useState } from 'react';
import { MAX_STEPS, PAGE, GENRES, GENRE_NAMES, MODES, LANE_CLR, SOUND_PRESETS, clamp } from '../engine/musicEngine';

export function PerformView({genre,gc,isPlaying,currentSectionName,laneVU,patterns,bassLine,synthLine,laneLen,step,page,setPage,activeNotes,arpeMode,modeName,autopilot,autopilotIntensity,setAutopilotIntensity,perfActions,regenerateSection,savedScenes,saveScene,loadScene,master,setMaster,space,setSpace,tone,setTone,drive,setDrive,grooveAmt,setGrooveAmt,swing,setSwing,toggleCell,songArc,arcIdx,songActive,setNote,bassPreset,synthPreset,drumPreset,performancePreset,applyBassPreset,applySynthPreset,applyDrumPreset,applyPerformancePreset,compact,phone}){
  const SECTION_COLORS={drop:'#ff2244',break:'#4488ff',build:'#ffaa00',groove:'#00cc66',tension:'#ff6622',fill:'#cc00ff',intro:'#44ffcc',outro:'#aaaaaa'};
  const sc=SECTION_COLORS[currentSectionName]||gc;
  const visibleStart=page*16,visibleEnd=Math.min(visibleStart+16,MAX_STEPS);
  const visIdx=Array.from({length:visibleEnd-visibleStart},(_,i)=>visibleStart+i);
  const SECTS=['drop','break','build','groove','tension','fill','intro','outro'];
  const shortcut={drop:'A',break:'S',build:'D',groove:'F',tension:'G',fill:'H'};

  return(
    <div style={{flex:1,display:'flex',flexDirection:compact?'column':'row',gap:6,padding:phone?'8px':'5px 7px 8px 7px',minHeight:0,overflowY:'auto',overflowX:'hidden'}}>

      {/* LEFT — Section triggers + autopilot */}
      <div style={{width:compact?'100%':118,display:'flex',flexDirection:'column',gap:3,flexShrink:0}}>
        {/* Section pads */}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.18em',marginBottom:1,textTransform:'uppercase'}}>SECTIONS</div>
        {SECTS.map(sec=>{
          const scl=SECTION_COLORS[sec]||'#ffffff';
          const isActive=currentSectionName===sec;
          return(
            <button key={sec} onClick={()=>perfActions[sec]?perfActions[sec]():null} style={{
              padding:'6px 6px',borderRadius:4,border:`1px solid ${isActive?scl:scl+'33'}`,
              background:isActive?`${scl}22`:`${scl}08`,
              color:isActive?scl:`${scl}88`,
              fontSize:10,fontWeight:700,cursor:'pointer',
              fontFamily:'Space Mono,monospace',letterSpacing:'0.1em',
              textTransform:'uppercase',transition:'all 0.08s',
              boxShadow:isActive?`0 0 8px ${scl}44`:'none',
              display:'flex',justifyContent:'space-between',alignItems:'center',
            }}>
              <span>{sec}</span>
              {shortcut[sec]&&<span style={{fontSize:10,opacity:0.4}}>[{shortcut[sec]}]</span>}
            </button>
          );
        })}

        {/* Actions */}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.18em',marginTop:3,textTransform:'uppercase'}}>ACTIONS</div>
        {[
          {label:'MUTATE',fn:perfActions.mutate,key:'M',tip:'flip drum hits'},
          {label:'THIN',fn:perfActions.thinOut,tip:'sparse out'},
          {label:'THICKEN',fn:perfActions.thicken,tip:'add hits'},
          {label:'REHARM',fn:perfActions.reharmonize,tip:'new chords'},
          {label:'ARP→',fn:perfActions.shiftArp,tip:'change pattern'},
          {label:'REGEN',fn:()=>regenerateSection(currentSectionName),key:'R',tip:'full rebuild'},
          {label:'RND SYNTH',fn:perfActions.randomizeNotes,tip:'random notes'},
          {label:'RND BASS',fn:perfActions.randomizeBass,tip:'random bass'},
          {label:'NOTES ↑',fn:perfActions.shiftNotesUp,tip:'shift up'},
          {label:'NOTES ↓',fn:perfActions.shiftNotesDown,tip:'shift down'},
          {label:'CLEAR',fn:perfActions.clear,tip:'clear all lanes'},
        ].map(({label,fn,key,tip})=>(
          <button key={label} onClick={fn} title={tip} style={{
            padding:'4px 6px',borderRadius:3,border:'1px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.02)',color:'rgba(255,255,255,0.96)',
            fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace',
            letterSpacing:'0.06em',display:'flex',justifyContent:'space-between',alignItems:'center',
          }}>
            <span>{label}</span>
            {key&&<span style={{fontSize:10,opacity:0.35}}>[{key}]</span>}
          </button>
        ))}
      </div>

      {/* CENTER — Grid + VU */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:4,minWidth:0,order:compact?1:2}}>

        {/* Section indicator + info bar */}
        <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:8,minHeight:22,flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:sc,letterSpacing:'0.16em',textTransform:'uppercase',textShadow:`0 0 16px ${sc}55`}}>
            {currentSectionName.toUpperCase()}
          </div>
          <div style={{width:1,height:12,background:'rgba(255,255,255,0.08)'}}/>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.08em'}}>{genre} · {modeName} · arp:{arpeMode}</span>
          <div style={{flex:1}}/>
          {songArc.length>0&&(
            <div style={{display:'flex',gap:2,alignItems:'center'}}>
              {songArc.map((s,i)=>(
                <div key={i} style={{width:i===arcIdx?22:14,height:4,borderRadius:2,background:i===arcIdx?SECTION_COLORS[s]||gc:i<arcIdx?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.05)',transition:'all 0.2s'}}/>
              ))}
            </div>
          )}
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{...navBtn,opacity:page===0?0.3:1,padding:'1px 5px',fontSize:10}}>‹</button>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',fontFamily:'Space Mono,monospace'}}>{page+1}/4</span>
          <button onClick={()=>setPage(p=>Math.min(3,p+1))} disabled={page===3} style={{...navBtn,opacity:page===3?0.3:1,padding:'1px 5px',fontSize:10}}>›</button>
        </div>

        {/* Lane rows with VU + grid */}
        {['kick','snare','hat','bass','synth'].map(lane=>{
          const lc=LANE_CLR[lane];
          const ll=laneLen[lane]||16;
          const vu=laneVU[lane]||0;
          return(
            <div key={lane} style={{flex:1,display:'flex',alignItems:'stretch',gap:5,minHeight:0}}>
              {/* Lane label + VU */}
              <div style={{width:38,flexShrink:0,display:'flex',flexDirection:'column',justifyContent:'center',gap:1}}>
                <span style={{fontSize:10,fontWeight:700,color:lc,letterSpacing:'0.14em',textTransform:'uppercase'}}>{lane}</span>
                <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${vu*100}%`,background:lc,borderRadius:2,transition:'width 0.04s',boxShadow:`0 0 4px ${lc}`}}/>
                </div>
                {(lane==='bass'||lane==='synth')&&(
                  <span style={{fontSize:9.5,color:'rgba(255,255,255,0.96)',letterSpacing:'0.04em'}}>{activeNotes[lane]}</span>
                )}
              </div>
              {/* Step grid */}
              <div style={{flex:1,display:'grid',gridTemplateColumns:`repeat(${visIdx.length},1fr)`,gap:1.5,alignItems:'stretch'}}>
                {visIdx.map(idx=>{
                  if(idx>=ll)return<div key={idx} style={{borderRadius:2,background:'rgba(255,255,255,0.015)',opacity:0.25}}/>;
                  const sd=patterns[lane][idx];
                  const on=sd.on,isActive=step===idx&&isPlaying;
                  const isTied=sd.tied;
                  const isBeat=idx%4===0,isBar=idx%16===0;
                  return(
                    <button key={idx} onClick={()=>toggleCell(lane,idx)} style={{
                      borderRadius:isTied?'1px 2px 2px 1px':'2px',
                      borderTop:`1px solid ${isActive?lc:isBar?`${lc}44`:isBeat?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'}`,
                      borderRight:`1px solid ${isActive?lc:isBar?`${lc}44`:isBeat?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'}`,
                      borderBottom:`1px solid ${isActive?lc:isBar?`${lc}44`:isBeat?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'}`,
                      borderLeft:isTied?`2px solid ${lc}44`:`1px solid ${isActive?lc:isBar?`${lc}44`:isBeat?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'}`,
                      background:isActive?`${lc}88`:isTied?`${lc}1a`:on?`${lc}${Math.round(clamp((sd.p||1),0.3,1)*255).toString(16).padStart(2,'0')}`:'rgba(255,255,255,0.02)',
                      boxShadow:isActive?`0 0 7px ${lc}77`:on&&!isTied?`0 0 2px ${lc}22`:'none',
                      cursor:'pointer',transition:'background 0.03s',
                    }}/>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Note info row */}
        <div style={{display:'flex',gap:1.5,flexShrink:0,height:12}}>
          {visIdx.map(idx=>{
            const bn=bassLine[idx],sn=synthLine[idx];
            const hasBass=patterns.bass[idx]?.on;
            const hasSynth=patterns.synth[idx]?.on;
            return(
              <div key={idx} style={{flex:1,textAlign:'center'}}>
                {(hasBass||hasSynth)&&<span style={{fontSize:6,color:'rgba(255,255,255,0.96)',fontFamily:'Space Mono,monospace'}}>{hasBass?bn.replace(/[0-9]/g,''):sn.replace(/[0-9]/g,'')}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Macro knobs + scenes */}
      <div style={{width:compact?'100%':118,display:'flex',flexDirection:'column',gap:4,flexShrink:0,order:compact?3:3}}>
        {/* Main macro faders */}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:1}}>MACROS</div>
        {[
          {label:'MASTER',v:master,s:setMaster,c:'#ffffff'},
          {label:'SPACE',v:space,s:setSpace,c:'#44ffcc'},
          {label:'TONE',v:tone,s:setTone,c:'#22d3ee'},
          {label:'DRIVE',v:drive,s:setDrive,c:'#ff8844'},
          {label:'GROOVE',v:grooveAmt,s:setGrooveAmt,c:'#ffdd00'},
          {label:'SWING',v:swing,s:setSwing,min:0,max:0.25,c:'#aa88ff'},
          {label:'AUTO INT',v:autopilotIntensity,s:setAutopilotIntensity,c:gc},
        ].map(({label,v,s,c,min=0,max=1})=>(
          <div key={label} style={{display:'flex',flexDirection:'column',gap:1}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:10,letterSpacing:'0.08em',color:'rgba(255,255,255,0.96)',textTransform:'uppercase'}}>{label}</span>
              <span style={{fontSize:10,color:c,fontFamily:'Space Mono,monospace'}}>{((v-min)/(max-min)*100).toFixed(0)}</span>
            </div>
            <input type="range" min={min} max={max} step={0.01} value={v} onChange={e=>s(Number(e.target.value))} style={{width:'100%',color:c,accentColor:c,height:12}}/>
          </div>
        ))}

        <div style={{flex:1}}/>

        {/* Scenes */}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:1}}>SCENES</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:2}}>
          {savedScenes.map((sc,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:1}}>
              <button onClick={()=>loadScene(i)} style={{
                padding:'4px 2px',borderRadius:2,border:`1px solid ${sc?gc+'44':'rgba(255,255,255,0.07)'}`,
                background:sc?`${gc}0e`:'rgba(255,255,255,0.015)',
                color:sc?gc:'rgba(255,255,255,0.94)',
                fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace',
                textAlign:'center',
              }}>
                S{i+1}{sc?'◆':''}
              </button>
              <button onClick={()=>saveScene(i)} style={{padding:'1px',borderRadius:2,border:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.015)',color:'rgba(255,255,255,0.96)',fontSize:9.5,cursor:'pointer',fontFamily:'Space Mono,monospace',textAlign:'center'}}>SAVE</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const navBtn={padding:'1px 5px',borderRadius:2,border:'1px solid rgba(255,255,255,0.09)',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace'};

export function PresetSelect({label,value,options,onChange,accent='#ffffff',compact=false}){
  return(
    <label style={{display:'flex',flexDirection:'column',gap:2,minWidth:compact?112:124}}>
      <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em',textTransform:'uppercase'}}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${accent}33`,color:accent,borderRadius:4,padding:compact?'4px 6px':'5px 7px',fontSize:10,fontFamily:'Space Mono,monospace',outline:'none'}}>
        {Object.entries(options).map(([key,preset])=><option key={key} value={key} style={{color:'#111',background:'#f2f2f2'}}>{preset.label}</option>)}
      </select>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDIO VIEW — detailed editor
// ─────────────────────────────────────────────────────────────────────────────
export function StudioView({genre,gc,patterns,bassLine,synthLine,laneLen,step,page,setPage,toggleCell,setNote,modeName,laneVU,space,setSpace,tone,setTone,noiseMix,setNoiseMix,drive,setDrive,compress,setCompress,bassFilter,setBassFilter,synthFilter,setSynthFilter,drumDecay,setDrumDecay,bassSubAmt,setBassSubAmt,fmIdx,setFmIdx,master,setMaster,swing,setSwing,humanize,setHumanize,grooveAmt,setGrooveAmt,grooveProfile,setGrooveProfile,regenerateSection,currentSectionName,undoLen,undo,recState,startRec,stopRec,recordings,exportJSON,importRef,importJSON,savedScenes,saveScene,loadScene,projectName,setProjectName,clearPattern,polySynth,setPolySynth,bassStack,setBassStack,bassPreset,synthPreset,drumPreset,performancePreset,applyBassPreset,applySynthPreset,applyDrumPreset,applyPerformancePreset,compact,phone}){
  const [tab,setTab]=useState('mixer');
  const [noteEditLane,setNoteEditLane]=useState('bass');
  const visibleStart=page*16,visibleEnd=Math.min(visibleStart+16,MAX_STEPS);
  const visIdx=Array.from({length:visibleEnd-visibleStart},(_,i)=>visibleStart+i);
  const mode=MODES[modeName]||MODES.minor;
  const notePool=noteEditLane==='bass'?mode.b:mode.s;

  return(
    <div style={{flex:1,display:'flex',flexDirection:compact?'column':'row',gap:5,padding:phone?'8px':'5px 7px 8px 7px',minHeight:0,overflowY:'auto',overflowX:'hidden'}}>

      {/* LEFT — Grid editor */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:3,minWidth:0}}>
        {/* Grid header */}
        <div style={{display:'flex',alignItems:'center',gap:5,height:20,flexShrink:0}}>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.1em'}}>{genre.toUpperCase()} · {modeName.toUpperCase()} · {currentSectionName.toUpperCase()}</span>
          <div style={{flex:1}}/>
          <button onClick={undo} disabled={undoLen===0} style={{...navBtn,opacity:undoLen>0?1:0.3,fontSize:10}}>↩ ({undoLen})</button>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{...navBtn,opacity:page===0?0.3:1}}>‹</button>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',fontFamily:'Space Mono,monospace'}}>pg {page+1}/4</span>
          <button onClick={()=>setPage(p=>Math.min(3,p+1))} disabled={page===3} style={{...navBtn,opacity:page===3?0.3:1}}>›</button>
        </div>

        {/* Lane grids */}
        {['kick','snare','hat','bass','synth'].map(lane=>{
          const lc=LANE_CLR[lane];const ll=laneLen[lane]||16;const vu=laneVU[lane]||0;
          return(
            <div key={lane} style={{flex:1,display:'flex',alignItems:'stretch',gap:4,minHeight:0}}>
              <div style={{width:36,flexShrink:0,display:'flex',flexDirection:'column',justifyContent:'center',gap:1}}>
                <span style={{fontSize:10,fontWeight:700,color:lc,letterSpacing:'0.12em',textTransform:'uppercase'}}>{lane}</span>
                <div style={{height:2,borderRadius:1,background:'rgba(255,255,255,0.05)',overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${vu*100}%`,background:lc,borderRadius:1,transition:'width 0.04s'}}/>
                </div>
              </div>
              <div style={{flex:1,display:'grid',gridTemplateColumns:`repeat(${visIdx.length},1fr)`,gap:1.5,alignItems:'stretch'}}>
                {visIdx.map(idx=>{
                  if(idx>=ll)return<div key={idx} style={{borderRadius:2,background:'rgba(255,255,255,0.015)',opacity:0.4}}/>;
                  const sd=patterns[lane][idx];const on=sd.on,isActive=step===idx;
                  const isBeat=idx%4===0,isBar=idx%16===0;
                  return(
                    <button key={idx} onClick={()=>toggleCell(lane,idx)} style={{
                      borderRadius:2,border:`1px solid ${isActive?lc:isBar?`${lc}38`:isBeat?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)'}`,
                      background:isActive?`${lc}77`:on?`${lc}66`:'rgba(255,255,255,0.02)',
                      cursor:'pointer',transition:'background 0.03s',
                    }}/>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Note editor row */}
        <div style={{flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:4}}>
          <div style={{display:'flex',gap:4,marginBottom:3,alignItems:'center'}}>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em'}}>NOTES</span>
            {['bass','synth'].map(l=>(
              <button key={l} onClick={()=>setNoteEditLane(l)} style={{...navBtn,border:`1px solid ${noteEditLane===l?LANE_CLR[l]:'rgba(255,255,255,0.1)'}`,color:noteEditLane===l?LANE_CLR[l]:'rgba(255,255,255,0.97)',fontSize:10}}>{l}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${visIdx.length},1fr)`,gap:1.5}}>
            {visIdx.map(idx=>{
              const lc=LANE_CLR[noteEditLane];
              const isOn=noteEditLane==='bass'?patterns.bass[idx]?.on:patterns.synth[idx]?.on;
              const curNote=noteEditLane==='bass'?bassLine[idx]:synthLine[idx];
              const cur=notePool.indexOf(curNote);
              return(
                <div key={idx} style={{opacity:isOn?1:0.2}}>
                  <button disabled={!isOn} onClick={()=>{if(!isOn)return;const next=notePool[(cur+1)%notePool.length];setNote(noteEditLane,idx,next);}}
                    style={{width:'100%',padding:'2px 0',borderRadius:2,border:`1px solid ${isOn?lc+'44':'rgba(255,255,255,0.04)'}`,background:isOn?`${lc}1a`:'rgba(255,255,255,0.01)',color:isOn?lc:'rgba(255,255,255,0.94)',fontSize:10,cursor:isOn?'pointer':'default',fontFamily:'Space Mono,monospace',textAlign:'center'}}>
                    {curNote||'—'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT — Controls */}
      <div style={{width:compact?'100%':178,display:'flex',flexDirection:'column',gap:0,flexShrink:0,borderLeft:compact?'none':'1px solid rgba(255,255,255,0.05)',borderTop:compact?'1px solid rgba(255,255,255,0.05)':'none'}}>
        {/* Tabs */}
        <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:4,alignItems:'flex-end'}}>
          <PresetSelect label='BASS' value={bassPreset} options={SOUND_PRESETS.bass} onChange={applyBassPreset} accent='#22d3ee' compact />
          <PresetSelect label='SYNTH' value={synthPreset} options={SOUND_PRESETS.synth} onChange={applySynthPreset} accent={gc} compact />
          <PresetSelect label='DRUM' value={drumPreset} options={SOUND_PRESETS.drum} onChange={applyDrumPreset} accent='#ffb347' compact />
          <PresetSelect label='PERF' value={performancePreset} options={SOUND_PRESETS.performance} onChange={applyPerformancePreset} accent='#7ee787' compact />
          <button onClick={clearPattern} style={{padding:'4px 8px',borderRadius:3,border:'1px solid rgba(255,80,80,0.3)',background:'rgba(255,80,80,0.08)',color:'#ff8a8a',fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace'}}>CLEAR</button><button onClick={()=>setPolySynth(v=>!v)} style={{padding:'4px 8px',borderRadius:3,border:`1px solid ${polySynth?gc:'rgba(255,255,255,0.08)'}`,background:polySynth?`${gc}18`:'rgba(255,255,255,0.03)',color:polySynth?gc:'rgba(255,255,255,0.97)',fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace'}}>SYNTH POLY</button><button onClick={()=>setBassStack(v=>!v)} style={{padding:'4px 8px',borderRadius:3,border:'1px solid rgba(34,211,238,0.25)',background:bassStack?'rgba(34,211,238,0.12)':'rgba(255,255,255,0.03)',color:bassStack?'#22d3ee':'rgba(255,255,255,0.97)',fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace'}}>BASS STACK</button></div><div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
          {['mixer','synth','session'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'5px 0',fontSize:9.5,fontWeight:700,letterSpacing:'0.1em',border:'none',background:'transparent',color:tab===t?gc:'rgba(255,255,255,0.94)',cursor:'pointer',borderBottom:tab===t?`2px solid ${gc}`:'2px solid transparent',textTransform:'uppercase',fontFamily:'Space Mono,monospace',transition:'color 0.1s'}}>{t}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'6px 7px',display:'flex',flexDirection:'column',gap:4}}>

          {tab==='mixer'&&<>
            {[
              {l:'MASTER',v:master,s:setMaster,c:'#ffffff'},
              {l:'SPACE',v:space,s:setSpace,c:'#44ffcc'},
              {l:'TONE',v:tone,s:setTone,c:'#22d3ee'},
              {l:'NOISE',v:noiseMix,s:setNoiseMix,c:'#aaaaaa'},
              {l:'DRIVE',v:drive,s:setDrive,c:'#ff8844'},
              {l:'COMPRESS',v:compress,s:setCompress,c:'#ffaa44'},
              {l:'BASS FILTER',v:bassFilter,s:setBassFilter,c:LANE_CLR.bass},
              {l:'SYNTH FILTER',v:synthFilter,s:setSynthFilter,c:LANE_CLR.synth},
              {l:'DRUM DECAY',v:drumDecay,s:setDrumDecay,c:LANE_CLR.kick},
              {l:'BASS SUB',v:bassSubAmt,s:setBassSubAmt,c:LANE_CLR.bass},
              {l:'SWING',v:swing,s:setSwing,min:0,max:0.25,c:'#aa88ff'},
              {l:'HUMANIZE',v:humanize,s:setHumanize,min:0,max:0.05,c:'#88aaff'},
              {l:'GROOVE AMT',v:grooveAmt,s:setGrooveAmt,c:'#ffdd00'},
              {l:'FM INDEX',v:fmIdx,s:setFmIdx,min:0,max:3,c:'#cc88ff'},
            ].map(({l,v,s,c,min=0,max=1})=>(
              <div key={l}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:0}}>
                  <span style={{fontSize:10,letterSpacing:'0.08em',color:'rgba(255,255,255,0.96)',textTransform:'uppercase'}}>{l}</span>
                  <span style={{fontSize:10,color:c,fontFamily:'Space Mono,monospace'}}>{((v-min)/(max-min)*100).toFixed(0)}</span>
                </div>
                <input type="range" min={min} max={max} step={(max-min)/200} value={v} onChange={e=>s(Number(e.target.value))} style={{width:'100%',accentColor:c,color:c,height:12}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.1em',marginBottom:2,textTransform:'uppercase'}}>GROOVE PROFILE</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2}}>
                {['steady','broken','bunker','float'].map(gp=>(
                  <button key={gp} onClick={()=>setGrooveProfile(gp)} style={{
                    padding:'3px',borderRadius:2,border:`1px solid ${grooveProfile===gp?gc:'rgba(255,255,255,0.08)'}`,
                    background:grooveProfile===gp?`${gc}18`:'rgba(255,255,255,0.02)',
                    color:grooveProfile===gp?gc:'rgba(255,255,255,0.96)',
                    fontSize:9.5,cursor:'pointer',fontFamily:'Space Mono,monospace',letterSpacing:'0.06em',textTransform:'uppercase',
                  }}>{gp}</button>
                ))}
              </div>
            </div>
          </>}

          {tab==='synth'&&<>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.1em',marginBottom:2,textTransform:'uppercase'}}>SECTION GENERATOR</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2}}>
              {Object.keys(SECTIONS).map(sec=>(
                <button key={sec} onClick={()=>regenerateSection(sec)} style={{
                  padding:'5px 3px',borderRadius:2,border:`1px solid ${currentSectionName===sec?gc:'rgba(255,255,255,0.08)'}`,
                  background:currentSectionName===sec?`${gc}18`:'rgba(255,255,255,0.02)',
                  color:currentSectionName===sec?gc:'rgba(255,255,255,0.97)',
                  fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace',letterSpacing:'0.05em',textTransform:'uppercase',
                }}>{sec}</button>
              ))}
            </div>
            <div style={{marginTop:3,fontSize:9.5,color:'rgba(255,255,255,0.96)',lineHeight:1.5}}>
              Click to regenerate with that section's feel.
            </div>
          </>}

          {tab==='session'&&<>
            {/* Recording */}
            <button onClick={recState==='idle'?startRec:stopRec} style={{
              padding:'7px',borderRadius:3,border:`1px solid ${recState==='recording'?'#ff2244':'rgba(255,255,255,0.12)'}`,
              background:recState==='recording'?'rgba(255,34,68,0.12)':'rgba(255,255,255,0.03)',
              color:recState==='recording'?'#ff2244':'rgba(255,255,255,0.55)',
              fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace',letterSpacing:'0.1em',textAlign:'center',
            }}>{recState==='recording'?'■ STOP REC':'● REC'}</button>
            {recordings.map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:3,padding:'3px 5px',borderRadius:3,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.05)'}}>
                <audio src={r.url} controls style={{flex:1,height:22,filter:'invert(1)',opacity:0.65}}/>
                <a href={r.url} download={r.name} style={{color:gc,fontSize:9.5,textDecoration:'none',fontFamily:'Space Mono,monospace'}}>DL</a>
              </div>
            ))}

            <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'4px 0'}}/>

            {/* Scenes */}
            <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em',marginBottom:2,textTransform:'uppercase'}}>SCENES (6)</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
              {savedScenes.map((sc,i)=>(
                <div key={i} style={{display:'flex',flexDirection:'column',gap:1}}>
                  <button onClick={()=>loadScene(i)} style={{
                    padding:'5px',borderRadius:3,border:`1px solid ${sc?gc+'44':'rgba(255,255,255,0.08)'}`,
                    background:sc?`${gc}0d`:'rgba(255,255,255,0.02)',
                    color:sc?gc:'rgba(255,255,255,0.95)',
                    fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace',textAlign:'center',
                  }}>S{i+1}{sc?` ◆`:''}</button>
                  <button onClick={()=>saveScene(i)} style={{padding:'2px',borderRadius:2,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.02)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace',textAlign:'center'}}>SAVE</button>
                </div>
              ))}
            </div>

            <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'4px 0'}}/>

            {/* Export/Import */}
            <button onClick={exportJSON} style={{padding:'7px',borderRadius:3,border:`1px solid ${gc}44`,background:`${gc}0d`,color:gc,fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace',letterSpacing:'0.1em',textAlign:'center',textTransform:'uppercase'}}>EXPORT JSON</button>
            <button onClick={()=>importRef.current?.click()} style={{padding:'7px',borderRadius:3,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace',letterSpacing:'0.1em',textAlign:'center',textTransform:'uppercase'}}>IMPORT JSON</button>
            <input ref={importRef} type="file" accept=".json" onChange={importJSON} style={{display:'none'}}/>

            <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'2px 0'}}/>
            <div style={{fontSize:9.5,color:'rgba(255,255,255,0.96)',lineHeight:1.7,letterSpacing:'0.06em'}}>
              SHORTCUTS<br/>
              SPACE = play/stop<br/>
              A=drop S=break D=build<br/>
              F=groove G=tension H=fill<br/>
              M=mutate R=regen P=autopilot<br/>
              T=tap tempo Z=undo
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SONG VIEW — arc composer and arrangement
// ─────────────────────────────────────────────────────────────────────────────
export function SongView({genre,gc,songArc,arcIdx,songActive,startSongArc,stopSongArc,currentSectionName,SONG_ARCS,SECTIONS,triggerSection,modeName,arpeMode,bpm,compact,phone}){
  const SECTION_COLORS={drop:'#ff2244',break:'#4488ff',build:'#ffaa00',groove:'#00cc66',tension:'#ff6622',fill:'#cc00ff',intro:'#44ffcc',outro:'#aaaaaa'};
  const gd=GENRES[genre];

  return(
    <div style={{flex:1,display:'flex',flexDirection:compact?'column':'row',gap:8,padding:phone?'8px':'6px 12px 12px 12px',minHeight:0,overflowY:'auto',overflowX:'hidden'}}>

      {/* LEFT — Genre info + arc control */}
      <div style={{width:compact?'100%':260,display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
        {/* Genre card */}
        <div style={{padding:16,borderRadius:8,border:`1px solid ${gc}33`,background:`${gc}08`}}>
          <div style={{fontSize:18,fontWeight:700,color:gc,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:4}}>{genre}</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.08em',marginBottom:8}}>{gd.description}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            {[
              {l:'BPM',v:`${gd.bpm[0]}–${gd.bpm[1]}`},
              {l:'CURRENT',v:bpm},
              {l:'MODE',v:modeName},
              {l:'ARP',v:arpeMode},
              {l:'DENSITY',v:`${Math.round(gd.density*100)}%`},
              {l:'CHAOS',v:`${Math.round(gd.chaos*100)}%`},
              {l:'NOISE',v:gd.noiseColor},
              {l:'BASS',v:gd.bassMode},
            ].map(({l,v})=>(
              <div key={l}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em',textTransform:'uppercase'}}>{l}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',fontFamily:'Space Mono,monospace'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Arc control */}
        <button onClick={songActive?stopSongArc:startSongArc} style={{
          padding:'12px',borderRadius:6,border:`1px solid ${songActive?'#ff2244':gc}`,
          background:songActive?'rgba(255,34,68,0.12)':`${gc}18`,
          color:songActive?'#ff2244':gc,
          fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace',
          letterSpacing:'0.15em',textTransform:'uppercase',
          boxShadow:songActive?'0 0 16px rgba(255,34,68,0.3)':`0 0 16px ${gc}33`,
        }}>{songActive?'■ STOP ARC':'▶ START ARC'}</button>

        {songActive&&(
          <div style={{padding:10,borderRadius:6,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.02)'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em',marginBottom:6,textTransform:'uppercase'}}>ARC PROGRESS</div>
            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
              {songArc.map((s,i)=>{
                const sc=SECTION_COLORS[s]||'#ffffff';
                return(
                  <div key={i} style={{
                    padding:'4px 8px',borderRadius:3,
                    background:i===arcIdx?`${sc}33`:i<arcIdx?`${sc}11`:'rgba(255,255,255,0.03)',
                    border:`1px solid ${i===arcIdx?sc:i<arcIdx?`${sc}44`:'rgba(255,255,255,0.06)'}`,
                    color:i===arcIdx?sc:i<arcIdx?`${sc}88`:'rgba(255,255,255,0.95)',
                    fontSize:10,fontFamily:'Space Mono,monospace',fontWeight:700,
                    transition:'all 0.2s',
                  }}>{s}</div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preset arcs */}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.15em',textTransform:'uppercase',marginTop:4}}>PRESET ARCS</div>
        {SONG_ARCS.map((arc,i)=>(
          <button key={i} onClick={()=>{}} style={{
            padding:'8px 10px',borderRadius:4,border:'1px solid rgba(255,255,255,0.08)',
            background:'rgba(255,255,255,0.02)',color:'rgba(255,255,255,0.96)',
            fontSize:10,cursor:'pointer',fontFamily:'Space Mono,monospace',textAlign:'left',
            letterSpacing:'0.04em',lineHeight:1.4,
          }}>
            {arc.join(' → ')}
          </button>
        ))}
      </div>

      {/* RIGHT — Section library + direct trigger */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.2em',textTransform:'uppercase'}}>SECTION LIBRARY — CLICK TO TRIGGER</div>
        <div style={{display:'grid',gridTemplateColumns:phone?'repeat(2,1fr)':'repeat(4,1fr)',gap:6}}>
          {Object.entries(SECTIONS).map(([name,data])=>{
            const sc=SECTION_COLORS[name]||'#ffffff';
            const isActive=currentSectionName===name;
            return(
              <button key={name} onClick={()=>triggerSection(name)} style={{
                padding:'18px 12px',borderRadius:6,border:`1px solid ${isActive?sc:sc+'33'}`,
                background:isActive?`${sc}18`:`${sc}06`,
                color:isActive?sc:`${sc}88`,
                cursor:'pointer',fontFamily:'Space Mono,monospace',
                textAlign:'left',transition:'all 0.1s',
                boxShadow:isActive?`0 0 16px ${sc}44`:'none',
              }}>
                <div style={{fontSize:13,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',marginBottom:6}}>{name}</div>
                <div style={{fontSize:10,opacity:0.7,lineHeight:1.6}}>
                  {`k:${Math.round(data.kM*100)}% h:${Math.round(data.hM*100)}%`}<br/>
                  {`b:${Math.round(data.bM*100)}% sy:${Math.round(data.syM*100)}%`}<br/>
                  {`len:${data.lb}x vel:${data.vel}`}<br/>
                  {`${data.bars} bars`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Current section info */}
        <div style={{padding:12,borderRadius:6,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)',marginTop:4}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6}}>CURRENT SESSION</div>
          <div style={{display:'grid',gridTemplateColumns:phone?'repeat(2,1fr)':'repeat(5,1fr)',gap:8}}>
            {[
              {l:'GENRE',v:genre},{l:'SECTION',v:currentSectionName},{l:'MODE',v:modeName},
              {l:'ARP',v:arpeMode},{l:'STATUS',v:songActive?`arc[${arcIdx+1}/${songArc.length}]`:'manual'},
            ].map(({l,v})=>(
              <div key={l}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>{l}</div>
                <div style={{fontSize:10,color:gc,fontFamily:'Space Mono,monospace',fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
