import React,{useCallback,useEffect,useRef,useState}from'react';
import {
  MAX_STEPS,PAGE,SCHED,LOOK,UNDO,clamp,rnd,pick,lerp,GENRES,GENRE_NAMES,MODES,CHORD_PROGS,SECTIONS,SONG_ARCS,GROOVE_MAPS,NOTE_FREQ,NOTE_MIDI,CHROMA,parseNoteName,transposeNote,mkSteps,mkNotes,chordNotes,voiceLead,arp,velCurve,buildMelodicLine,buildSection,buildSong,grooveAccent,LANE_CLR,GENRE_CLR,SOUND_PRESETS
} from '../engine/musicEngine';
import { PerformView, StudioView, SongView, PresetSelect } from '../components/views';

export default function App(){
  // ── Audio
  const audioRef=useRef(null);
  const analyserRef=useRef(null);
  const [isReady,setIsReady]=useState(false);

  // ── Transport
  const [isPlaying,setIsPlaying]=useState(false);
  const isPlayingRef=useRef(false);
  const schedulerRef=useRef(null);
  const nextNoteRef=useRef(0);
  const stepRef=useRef(0);
  const [step,setStep]=useState(0);
  const [bpm,setBpm]=useState(128);
  const bpmRef=useRef(128);
  useEffect(()=>{bpmRef.current=bpm;},[bpm]);

  // ── Song state
  const [genre,setGenre]=useState('techno');
  const [currentSectionName,setCurrentSectionName]=useState('groove');
  const [modeName,setModeName]=useState('minor');
  const [songArc,setSongArc]=useState([]);
  const [arcIdx,setArcIdx]=useState(0);
  const [songActive,setSongActive]=useState(false);
  const songActiveRef=useRef(false);
  const arcRef=useRef([]);
  const arcIdxRef=useRef(0);
  const barCountRef=useRef(0);// bars elapsed in current section

  // ── Patterns
  const [patterns,setPatterns]=useState({kick:mkSteps(),snare:mkSteps(),hat:mkSteps(),bass:mkSteps(),synth:mkSteps()});
  const patternsRef=useRef(patterns);
  useEffect(()=>{patternsRef.current=patterns;},[patterns]);
  const [bassLine,setBassLine]=useState(mkNotes('C2'));
  const bassRef=useRef(bassLine);
  useEffect(()=>{bassRef.current=bassLine;},[bassLine]);
  const [synthLine,setSynthLine]=useState(mkNotes('C4'));
  const synthRef=useRef(synthLine);
  useEffect(()=>{synthRef.current=synthLine;},[synthLine]);
  const [laneLen,setLaneLen]=useState({kick:16,snare:16,hat:32,bass:32,synth:32});
  const laneLenRef=useRef(laneLen);
  useEffect(()=>{laneLenRef.current=laneLen;},[laneLen]);

  // ── Parameters
  const [master,setMaster]=useState(0.85);
  const [swing,setSwing]=useState(0.03);
  const swingRef=useRef(0.03);
  useEffect(()=>{swingRef.current=swing;},[swing]);
  const [humanize,setHumanize]=useState(0.012);
  const humanizeRef=useRef(0.012);
  useEffect(()=>{humanizeRef.current=humanize;},[humanize]);
  const [grooveAmt,setGrooveAmt]=useState(0.65);
  const grooveRef=useRef(0.65);
  useEffect(()=>{grooveRef.current=grooveAmt;},[grooveAmt]);
  const [grooveProfile,setGrooveProfile]=useState('steady');
  const grooveProfileRef=useRef('steady');
  useEffect(()=>{grooveProfileRef.current=grooveProfile;},[grooveProfile]);
  const [space,setSpace]=useState(0.3);
  const [tone,setTone]=useState(0.7);
  const [noiseMix,setNoiseMix]=useState(0.2);
  const [drive,setDrive]=useState(0.1);
  const [compress,setCompress]=useState(0.3);
  const [bassFilter,setBassFilter]=useState(0.55);
  const [synthFilter,setSynthFilter]=useState(0.65);
  const [drumDecay,setDrumDecay]=useState(0.5);
  const [bassSubAmt,setBassSubAmt]=useState(0.5);
  const [fmIdx,setFmIdx]=useState(0.6);
  const fmIdxRef=useRef(0.6);
  useEffect(()=>{fmIdxRef.current=fmIdx;},[fmIdx]);
  const [polySynth,setPolySynth]=useState(true);
  const [bassStack,setBassStack]=useState(true);
  const [bassPreset,setBassPreset]=useState('sub_floor');
  const [synthPreset,setSynthPreset]=useState('velvet_pad');
  const [drumPreset,setDrumPreset]=useState('tight_punch');
  const [performancePreset,setPerformancePreset]=useState('club_night');

  // ── Autopilot
  const [autopilot,setAutopilot]=useState(false);
  const autopilotRef=useRef(false);
  useEffect(()=>{autopilotRef.current=autopilot;},[autopilot]);
  const autopilotTimerRef=useRef(null);
  const [autopilotIntensity,setAutopilotIntensity]=useState(0.5);

  // ── Composition seed for transformations
  const seedRef=useRef(null);
  const lastBassRef=useRef('C2');
  const progressionRef=useRef(CHORD_PROGS.minor[0]);
  const arpModeRef=useRef('up');
  const [arpMode,setArpMode]=useState('up');

  // ── UI state
  const [view,setView]=useState('perform');// 'perform' | 'studio' | 'song'
  const [activeTab,setActiveTab]=useState('mix');
  const [activeLane,setActiveLane]=useState('kick');
  const [laneVU,setLaneVU]=useState({kick:0,snare:0,hat:0,bass:0,synth:0});
  const vuTimers=useRef({});
  const [page,setPage]=useState(0);
  const [status,setStatus]=useState('Ready — press PLAY');
  const [recordings,setRecordings]=useState([]);
  const [recState,setRecState]=useState('idle');
  const recorderRef=useRef(null);
  const chunksRef=useRef([]);
  const [projectName,setProjectName]=useState('CESIRA SESSION');
  const [savedScenes,setSavedScenes]=useState([null,null,null,null,null,null]);
  const [midiOk,setMidiOk]=useState(false);
  const midiRef=useRef(null);
  const [tapTimes,setTapTimes]=useState([]);
  const undoStack=useRef([]);
  const [undoLen,setUndoLen]=useState(0);
  const [vizData,setVizData]=useState(new Uint8Array(64));

  // ── Active notes display
  const [activeNotes,setActiveNotes]=useState({bass:'—',synth:'—'});

  // ─── AUDIO ENGINE ─────────────────────────────────────────────────────────
  const driveCurve=(node,amt)=>{
    const k=2+clamp(amt,0,1)*60;const s=512;const c=new Float32Array(s);
    for(let i=0;i<s;i++){const x=(i*2)/s-1;c[i]=((1+k)*x)/(1+k*Math.abs(x));}
    node.curve=c;node.oversample='2x';
  };
  const identityCurve=node=>{const c=new Float32Array(512);for(let i=0;i<512;i++){c[i]=(i*2)/512-1;}node.curve=c;};
  const reverbIR=(ctx,dur=1.2,dec=2.6)=>{const sr=ctx.sampleRate,l=Math.floor(sr*dur);const b=ctx.createBuffer(2,l,sr);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<l;i++)d[i]=(rnd()*2-1)*Math.pow(1-i/l,dec);}return b;};

  const initAudio=async()=>{
    if(audioRef.current){await audioRef.current.ctx.resume();setIsReady(true);return;}
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    const ctx=new Ctx({sampleRate:44100,latencyHint:'interactive'});
    const bus=ctx.createGain();bus.gain.value=0.68;
    const preD=ctx.createWaveShaper();identityCurve(preD);
    const toneF=ctx.createBiquadFilter();toneF.type='lowpass';toneF.frequency.value=16000;toneF.Q.value=0.35;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-24;comp.knee.value=18;comp.ratio.value=3;comp.attack.value=0.008;comp.release.value=0.22;
    const lim=ctx.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=0.001;lim.release.value=0.04;
    const dry=ctx.createGain(),wet=ctx.createGain();dry.gain.value=1;wet.gain.value=0;
    const spl=ctx.createChannelSplitter(2),mrg=ctx.createChannelMerger(2);
    const lDly=ctx.createDelay(0.5),rDly=ctx.createDelay(0.5),fb=ctx.createGain(),dlyT=ctx.createBiquadFilter();
    dlyT.type='lowpass';dlyT.frequency.value=4500;fb.gain.value=0.15;
    const chorus=ctx.createGain();chorus.gain.value=0;
    const cD1=ctx.createDelay(0.025),cD2=ctx.createDelay(0.031);
    const rev=ctx.createConvolver();rev.buffer=reverbIR(ctx);
    const revW=ctx.createGain();revW.gain.value=0;
    const out=ctx.createGain();out.gain.value=0.88;
    const an=ctx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=0.8;
    const dest=ctx.createMediaStreamDestination();
    bus.connect(preD);preD.connect(toneF);toneF.connect(comp);
    comp.connect(dry);comp.connect(spl);comp.connect(cD1);comp.connect(cD2);comp.connect(rev);
    cD1.connect(chorus);cD2.connect(chorus);rev.connect(revW);
    spl.connect(lDly,0);spl.connect(rDly,1);rDly.connect(dlyT);dlyT.connect(fb);fb.connect(lDly);
    lDly.connect(mrg,0,0);rDly.connect(mrg,0,1);mrg.connect(wet);
    dry.connect(out);wet.connect(out);chorus.connect(out);revW.connect(out);
    out.connect(lim);lim.connect(an);lim.connect(ctx.destination);lim.connect(dest);
    audioRef.current={ctx,bus,preD,toneF,comp,lim,dry,wet,lDly,rDly,fb,chorus,revW,out,an,dest};
    analyserRef.current=an;
    setIsReady(true);setStatus('Audio online');
    applyFxNow();
  };

  const applyFxNow=()=>{
    const a=audioRef.current;if(!a)return;
    const now=a.ctx.currentTime;
    const gd=GENRES[genre];const fx=gd.fxProfile;
    driveCurve(a.preD,clamp(fx.drive*0.4+drive*0.1,0,0.38));
    a.toneF.frequency.linearRampToValueAtTime(clamp(1800+12000*fx.tone*tone,600,19000),now+0.08);
    a.lDly.delayTime.linearRampToValueAtTime(clamp(0.02+space*0.08,0.01,0.45),now+0.08);
    a.rDly.delayTime.linearRampToValueAtTime(clamp(0.03+space*0.1,0.01,0.45),now+0.08);
    a.fb.gain.linearRampToValueAtTime(clamp(0.06+space*0.2,0.03,0.4),now+0.08);
    a.wet.gain.linearRampToValueAtTime(clamp(space*0.18,0,0.25),now+0.08);
    a.dry.gain.linearRampToValueAtTime(clamp(0.95-space*0.08,0.72,0.97),now+0.08);
    a.chorus.gain.linearRampToValueAtTime(clamp(space*0.08,0,0.14),now+0.12);
    a.revW.gain.linearRampToValueAtTime(clamp(fx.space*space*0.22,0,0.28),now+0.14);
    a.out.gain.linearRampToValueAtTime(master,now+0.06);
    a.comp.threshold.value=clamp(-20-compress*12,-32,-6);
    a.comp.ratio.value=clamp(2+compress*5,1.5,8);
  };
  useEffect(()=>{if(audioRef.current)applyFxNow();},[space,tone,drive,compress,master,genre]);

  // Per-lane gain nodes
  const laneGains=useRef({});
  const getLaneGain=(lane)=>{
    const a=audioRef.current;if(!a)return null;
    if(!laneGains.current[lane]){const g=a.ctx.createGain();g.gain.value=1;g.connect(a.bus);laneGains.current[lane]=g;}
    return laneGains.current[lane];
  };

  const ss=(n,t)=>{try{n.start(t);}catch{}};
  const st=(n,t)=>{try{n.stop(t);}catch{}};
  const gc=(src,nodes,ms)=>{const fn=()=>[src,...nodes].forEach(n=>{try{n.disconnect();}catch{}});src.onended=fn;setTimeout(fn,ms);};
  const activeNodes=useRef(0);
  const nodeGuard=()=>activeNodes.current<90;
  const trackNode=ms=>{activeNodes.current++;setTimeout(()=>{activeNodes.current=Math.max(0,activeNodes.current-1);},ms+80);};

  const flashLane=useCallback((lane,level=1)=>{
    setLaneVU(p=>({...p,[lane]:Math.min(1,level)}));
    if(vuTimers.current[lane])clearInterval(vuTimers.current[lane]);
    vuTimers.current[lane]=setInterval(()=>setLaneVU(p=>{const nv=Math.max(0,p[lane]-0.2);if(nv<=0)clearInterval(vuTimers.current[lane]);return{...p,[lane]:nv};}),55);
  },[]);

  const noiseBuffer=(len=0.22,amt=1,color='white')=>{
    const a=audioRef.current;const sr=a.ctx.sampleRate;
    const b=a.ctx.createBuffer(1,Math.floor(sr*len),sr);const d=b.getChannelData(0);
    if(color==='white'){for(let i=0;i<d.length;i++)d[i]=(rnd()*2-1)*amt;return b;}
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0;
    for(let i=0;i<d.length;i++){
      const w=rnd()*2-1;
      if(color==='pink'){b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.969*b2+w*0.153852;b3=0.8665*b3+w*0.310486;b4=0.55*b4+w*0.532952;b5=-0.7616*b5-w*0.016898;d[i]=(b0+b1+b2+b3+b4+b5+w*0.5362)*amt*0.11;}
      else{b0=0.99*b0+w*0.01;d[i]=b0*amt*3;}
    }
    return b;
  };

  const stepSec=()=>(60/bpmRef.current)/4;

  // ─── DRUM SYNTHESIS ────────────────────────────────────────────────────────
  const playKick=(accent,t)=>{
    if(!nodeGuard())return;
    const a=audioRef.current;const gd=GENRES[genre];
    const kf=gd.kickFreq||90,ke=gd.kickEnd||35,et=0.08+drumDecay*0.12,dt=0.16+drumDecay*0.22;
    const body=a.ctx.createOscillator(),bG=a.ctx.createGain();
    const sub=a.ctx.createOscillator(),sG=a.ctx.createGain();
    const click=a.ctx.createBufferSource(),cG=a.ctx.createGain();
    const mG=a.ctx.createGain(),sh=a.ctx.createWaveShaper();
    body.type='sine';body.frequency.setValueAtTime(kf,t);body.frequency.exponentialRampToValueAtTime(Math.max(20,ke),t+et);
    sub.type='sine';sub.frequency.setValueAtTime(kf*0.5,t);sub.frequency.exponentialRampToValueAtTime(Math.max(18,ke*0.5),t+et);
    const cb=a.ctx.createBuffer(1,Math.floor(a.ctx.sampleRate*0.004),a.ctx.sampleRate);
    const cd=cb.getChannelData(0);for(let i=0;i<cd.length;i++)cd[i]=rnd()*2-1;
    click.buffer=cb;driveCurve(sh,0.05+noiseMix*0.08);
    bG.gain.setValueAtTime(0,t);bG.gain.linearRampToValueAtTime(0.82*accent,t+0.001);bG.gain.exponentialRampToValueAtTime(0.001,t+dt);
    sG.gain.setValueAtTime(0,t);sG.gain.linearRampToValueAtTime(0.5*accent*bassSubAmt,t+0.001);sG.gain.exponentialRampToValueAtTime(0.001,t+dt*1.2);
    cG.gain.setValueAtTime(0,t);cG.gain.linearRampToValueAtTime(0.3*accent,t+0.0005);cG.gain.exponentialRampToValueAtTime(0.001,t+0.006);
    body.connect(sh);sh.connect(bG);sub.connect(sG);click.connect(cG);
    bG.connect(mG);sG.connect(mG);cG.connect(mG);
    const dest=getLaneGain('kick')||a.bus;mG.connect(dest);
    const dur=(dt+0.1)*1000+200;trackNode(dur);
    gc(body,[sub,click,bG,sG,cG,mG,sh],dur);
    ss(body,t);ss(sub,t);ss(click,t);st(body,t+dt+0.05);st(sub,t+dt+0.08);st(click,t+0.008);
  };

  const playSnare=(accent,t)=>{
    if(!nodeGuard())return;
    const a=audioRef.current;const gd=GENRES[genre];
    const nb=noiseBuffer(0.18,0.24+noiseMix*0.5,gd.noiseColor||'white');
    const src=a.ctx.createBufferSource(),fil=a.ctx.createBiquadFilter(),g=a.ctx.createGain();
    src.buffer=nb;fil.type='bandpass';fil.frequency.value=1600+noiseMix*400;fil.Q.value=1.0+compress*0.4;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.55*accent,t+0.002);g.gain.exponentialRampToValueAtTime(0.001,t+0.055+drumDecay*0.12);
    src.connect(fil);fil.connect(g);const dest=getLaneGain('snare')||a.bus;g.connect(dest);
    gc(src,[fil,g],400);ss(src,t);st(src,t+0.2);
  };

  const playHat=(accent,t,open=false)=>{
    if(!nodeGuard())return;
    const a=audioRef.current;const gd=GENRES[genre];
    const nb=noiseBuffer(open?0.3:0.12,0.18+noiseMix*0.35,gd.noiseColor||'white');
    const src=a.ctx.createBufferSource(),fil=a.ctx.createBiquadFilter(),g=a.ctx.createGain();
    src.buffer=nb;fil.type='highpass';fil.frequency.value=open?7000:8500;
    const decay=open?0.08+drumDecay*0.25:0.008+drumDecay*0.04;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.3*accent,t+0.001);g.gain.exponentialRampToValueAtTime(0.001,t+decay);
    src.connect(fil);fil.connect(g);const dest=getLaneGain('hat')||a.bus;g.connect(dest);
    gc(src,[fil,g],600);ss(src,t);st(src,t+open?0.35:0.15);
  };


  const getVoiceNotes=(baseNote,lane='synth')=>{
    const mode=MODES[modeName]||MODES.minor;
    const pool=lane==='bass'?mode.b:mode.s;
    const idx=pool.indexOf(baseNote);
    if(lane==='bass'){
      if(!bassStack)return [baseNote];
      const fifth=idx>-1?pool[Math.min(idx+4,pool.length-1)]:transposeNote(baseNote,7);
      return [...new Set([baseNote,fifth])];
    }
    if(!polySynth)return [baseNote];
    if(idx===-1)return [...new Set([baseNote,transposeNote(baseNote,4),transposeNote(baseNote,7)])];
    return [...new Set([pool[idx],pool[Math.min(idx+2,pool.length-1)],pool[Math.min(idx+4,pool.length-1)]])];
  };

  // ─── BASS SYNTHESIS ────────────────────────────────────────────────────────
  const playBassVoice=(note,accent,t,lenSteps=1)=>{
    if(!nodeGuard())return;
    const a=audioRef.current;
    const f=NOTE_FREQ[note]||110;
    const dur=clamp(stepSec()*lenSteps*0.92,0.04,6);
    const atk=Math.min(0.008,dur*0.05);
    const rel=Math.max(0.04,dur*0.88);
    const mode=GENRES[genre].bassMode||'sub';
    const g=a.ctx.createGain(),fil=a.ctx.createBiquadFilter();
    fil.type='lowpass';fil.frequency.setValueAtTime(60+bassFilter*3500+tone*600,t);fil.Q.value=0.5+compress*3;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.58*accent,t+atk);g.gain.setValueAtTime(0.58*accent,t+rel*0.3);g.gain.exponentialRampToValueAtTime(0.0001,t+rel);
    const cleanMs=(rel+0.3)*1000;

    if(mode==='fm'||mode==='bit'){
      const idx=fmIdxRef.current*(mode==='bit'?3:1.5);
      const car=a.ctx.createOscillator(),mod=a.ctx.createOscillator(),mg=a.ctx.createGain();
      car.type='sine';car.frequency.value=f;mod.type='sine';mod.frequency.value=f*(mode==='fm'?2:3);mg.gain.value=f*idx;
      const sub=a.ctx.createOscillator(),sg=a.ctx.createGain();
      sub.type='sine';sub.frequency.value=f*0.5;sg.gain.value=bassSubAmt*0.4;
      mod.connect(mg);mg.connect(car.frequency);car.connect(fil);sub.connect(sg);sg.connect(fil);fil.connect(g);
      const dest=getLaneGain('bass')||a.bus;g.connect(dest);trackNode(cleanMs);
      gc(car,[mod,mg,sub,sg,fil,g],cleanMs);
      ss(car,t);ss(mod,t);ss(sub,t);st(car,t+rel+0.05);st(mod,t+rel+0.05);st(sub,t+rel+0.05);
    } else if(mode==='fold'||mode==='wet'){
      const car=a.ctx.createOscillator(),ring=a.ctx.createOscillator(),rm=a.ctx.createGain();
      car.type='sawtooth';car.frequency.value=f;ring.type='sine';ring.frequency.value=f*(mode==='fold'?1.5:0.75);
      rm.gain.value=0.5;const rg=a.ctx.createGain();rg.gain.value=0;ring.connect(rg);rg.connect(rm.gain);
      car.connect(rm);rm.connect(fil);
      const sub=a.ctx.createOscillator(),sg=a.ctx.createGain();
      sub.type='sine';sub.frequency.value=f*0.5;sg.gain.value=bassSubAmt*0.5;
      sub.connect(sg);sg.connect(fil);fil.connect(g);
      const dest=getLaneGain('bass')||a.bus;g.connect(dest);trackNode(cleanMs);
      gc(car,[ring,rm,rg,sub,sg,fil,g],cleanMs);
      ss(car,t);ss(ring,t);ss(sub,t);st(car,t+rel+0.05);st(ring,t+rel+0.05);st(sub,t+rel+0.05);
    } else {
      const o1=a.ctx.createOscillator(),o2=a.ctx.createOscillator();
      const types={sub:'sine',grit:'sawtooth',drone:'sawtooth',saw:'sawtooth',pulse:'square'};
      o1.type=types[mode]||'sawtooth';o2.type='sine';
      o1.frequency.value=f;o2.frequency.value=f*1.005;
      const sg=a.ctx.createGain();sg.gain.value=bassSubAmt*(mode==='sub'?0.85:0.3);
      const lfo=a.ctx.createOscillator(),lg=a.ctx.createGain();
      lfo.frequency.value=0.5;lg.gain.value=mode==='drone'?30:5;
      lfo.connect(lg);lg.connect(fil.frequency);
      o1.connect(fil);o2.connect(sg);sg.connect(fil);fil.connect(g);
      const dest=getLaneGain('bass')||a.bus;g.connect(dest);trackNode(cleanMs);
      gc(o1,[o2,lfo,sg,fil,g,lg],cleanMs);
      ss(o1,t);ss(o2,t);ss(lfo,t);st(o1,t+rel+0.05);st(o2,t+rel+0.05);st(lfo,t+rel+0.05);
    }
    if(midiRef.current){const out=[...midiRef.current.outputs.values()][0];if(out){const v=Math.round(clamp(accent,0,1)*127);out.send([0x93,NOTE_MIDI[note]||48,v]);setTimeout(()=>out.send([0x83,NOTE_MIDI[note]||48,0]),rel*1000);}}
  };
  const playBass=(note,accent,t,lenSteps=1)=>{
    const notes=Array.isArray(note)?note:getVoiceNotes(note,'bass');
    const voiceAccent=accent/Math.sqrt(Math.max(1,notes.length));
    notes.forEach((voice,idx)=>playBassVoice(voice,voiceAccent,t+idx*0.002,lenSteps));
    setActiveNotes(p=>({...p,bass:notes.join(' · ')}));
  };

  // ─── SYNTH SYNTHESIS — extended with richer voices ───────────────────────
  const playSynthVoice=(note,accent,t,lenSteps=1)=>{
    if(!nodeGuard())return;
    const a=audioRef.current;
    const f=NOTE_FREQ[note]||440;
    const dur=clamp(stepSec()*lenSteps*0.92,0.04,6);
    const mode=GENRES[genre].synthMode||'lead';
    const cleanMs=(dur+1.5)*1000;

    if(mode==='glass'||mode==='bell'){
      const atk=0.001,rel=Math.max(0.3,dur*1.2+synthFilter*2);
      const nb=noiseBuffer(0.04,1,'white');
      const src=a.ctx.createBufferSource();src.buffer=nb;
      const dly=a.ctx.createDelay(0.05);dly.delayTime.value=1/f;
      const fbk=a.ctx.createGain();fbk.gain.value=0.97-synthFilter*0.15;
      const lpf=a.ctx.createBiquadFilter();lpf.type='lowpass';lpf.frequency.value=2000+synthFilter*6000;
      const amp=a.ctx.createGain();
      amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(0.55*accent,t+atk);amp.gain.exponentialRampToValueAtTime(0.001,t+rel);
      src.connect(dly);dly.connect(lpf);lpf.connect(fbk);fbk.connect(dly);lpf.connect(amp);
      const dest=getLaneGain('synth')||a.bus;amp.connect(dest);trackNode(cleanMs);
      gc(src,[dly,lpf,fbk,amp],cleanMs);
      ss(src,t);st(src,t+0.04);
      return;
    }

    if(mode==='pad'||mode==='choir'||mode==='mist'){
      const atk=0.06+dur*0.08,rel=Math.max(atk+0.1,dur*0.9+space*0.5);
      const o1=a.ctx.createOscillator(),o2=a.ctx.createOscillator(),o3=a.ctx.createOscillator();
      o1.type='sawtooth';o2.type='sawtooth';o3.type='sine';
      o1.frequency.value=f;o2.frequency.value=f*1.012;o3.frequency.value=f*0.995;
      const mix=a.ctx.createGain();mix.gain.value=0.33;
      const fil=a.ctx.createBiquadFilter();fil.type='lowpass';
      fil.frequency.setValueAtTime(300+synthFilter*2000,t);
      fil.frequency.linearRampToValueAtTime(800+synthFilter*5000,t+atk*2);
      fil.Q.value=0.4+compress*1.5;
      const amp=a.ctx.createGain();
      amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(0.38*accent,t+atk);
      amp.gain.setValueAtTime(0.38*accent,t+Math.max(atk+0.01,dur*0.6));
      amp.gain.exponentialRampToValueAtTime(0.001,t+rel);
      o1.connect(mix);o2.connect(mix);o3.connect(mix);mix.connect(fil);fil.connect(amp);
      const dest=getLaneGain('synth')||a.bus;amp.connect(dest);trackNode(cleanMs);
      gc(o1,[o2,o3,mix,fil,amp],cleanMs);
      ss(o1,t);ss(o2,t);ss(o3,t);st(o1,t+rel+0.1);st(o2,t+rel+0.1);st(o3,t+rel+0.1);
      return;
    }

    if(mode==='organ'||mode==='air'){
      const atk=0.005,rel=Math.max(0.05,dur*0.95);
      const c1=a.ctx.createOscillator(),c2=a.ctx.createOscillator();
      const m1=a.ctx.createOscillator(),m2=a.ctx.createOscillator();
      const mg1=a.ctx.createGain(),mg2=a.ctx.createGain();
      c1.type='sine';c2.type='sine';m1.type='sine';m2.type='sine';
      c1.frequency.value=f;c2.frequency.value=f*2;m1.frequency.value=f*1;m2.frequency.value=f*3;
      mg1.gain.value=f*fmIdxRef.current*0.8;mg2.gain.value=f*fmIdxRef.current*0.4;
      m1.connect(mg1);mg1.connect(c1.frequency);
      m2.connect(mg2);mg2.connect(c2.frequency);
      const mix=a.ctx.createGain();mix.gain.value=0.5;
      const amp=a.ctx.createGain();
      amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(0.4*accent,t+atk);
      amp.gain.setValueAtTime(0.4*accent,t+Math.max(atk+0.01,dur*0.85));
      amp.gain.exponentialRampToValueAtTime(0.001,t+rel);
      c1.connect(mix);c2.connect(mix);mix.connect(amp);
      const dest=getLaneGain('synth')||a.bus;amp.connect(dest);trackNode(cleanMs);
      gc(c1,[c2,m1,m2,mg1,mg2,mix,amp],cleanMs);
      ss(c1,t);ss(c2,t);ss(m1,t);ss(m2,t);st(c1,t+rel+0.1);st(c2,t+rel+0.1);st(m1,t+rel+0.1);st(m2,t+rel+0.1);
      return;
    }

    if(mode==='strings'||mode==='star'){
      const atk=0.08+dur*0.06,rel=Math.max(atk+0.1,dur*0.92+space*0.4);
      const o1=a.ctx.createOscillator(),o2=a.ctx.createOscillator();
      const vib=a.ctx.createOscillator(),vg=a.ctx.createGain();
      o1.type='sawtooth';o2.type='sawtooth';
      o1.frequency.value=f;o2.frequency.value=f*1.006;
      vib.frequency.value=5.2+rnd()*0.6;vg.gain.value=2+synthFilter*6;
      vib.connect(vg);vg.connect(o1.frequency);vg.connect(o2.frequency);
      const fil=a.ctx.createBiquadFilter();fil.type='lowpass';fil.frequency.value=400+synthFilter*5000;fil.Q.value=0.3;
      const amp=a.ctx.createGain();
      amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(0.36*accent,t+atk);
      amp.gain.setValueAtTime(0.36*accent,t+Math.max(atk+0.01,dur*0.7));
      amp.gain.exponentialRampToValueAtTime(0.001,t+rel);
      o1.connect(fil);o2.connect(fil);fil.connect(amp);
      const dest=getLaneGain('synth')||a.bus;amp.connect(dest);trackNode(cleanMs);
      gc(o1,[o2,vib,vg,fil,amp],cleanMs);
      ss(o1,t);ss(o2,t);ss(vib,t);st(o1,t+rel+0.1);st(o2,t+rel+0.1);st(vib,t+rel+0.1);
      return;
    }

    const atk=0.005,rel=Math.max(0.05,dur*0.9);
    const o1=a.ctx.createOscillator(),o2=a.ctx.createOscillator();
    const tmap={lead:'square',mist:'sawtooth',choir:'sine',star:'sine',glass:'sine',organ:'sine'};
    o1.type=tmap[mode]||'sawtooth';o2.type='triangle';
    o1.frequency.value=f;o2.frequency.value=f*1.008;
    const vib=a.ctx.createOscillator(),vg=a.ctx.createGain();
    vib.frequency.value=5.5;vg.gain.value=clamp(mode==='lead'?8:3,0,15);
    vib.connect(vg);vg.connect(o1.frequency);
    const fil=a.ctx.createBiquadFilter();fil.type='lowpass';fil.frequency.value=200+synthFilter*7000+tone*1200;fil.Q.value=0.5+compress*3;
    const amp=a.ctx.createGain();
    amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(0.38*accent,t+atk);
    amp.gain.setValueAtTime(0.38*accent,t+Math.max(atk+0.01,dur*0.65));
    amp.gain.exponentialRampToValueAtTime(0.001,t+rel);
    const mix=a.ctx.createGain();mix.gain.value=0.5;
    o1.connect(mix);o2.connect(mix);mix.connect(fil);fil.connect(amp);
    const dest=getLaneGain('synth')||a.bus;amp.connect(dest);trackNode(cleanMs);
    gc(o1,[o2,vib,vg,mix,fil,amp],cleanMs);
    ss(o1,t);ss(o2,t);ss(vib,t);st(o1,t+rel+0.1);st(o2,t+rel+0.1);st(vib,t+rel+0.1);
    if(midiRef.current){const out=[...midiRef.current.outputs.values()][0];if(out){const v=Math.round(clamp(accent,0,1)*127);out.send([0x94,NOTE_MIDI[note]||60,v]);setTimeout(()=>out.send([0x84,NOTE_MIDI[note]||60,0]),rel*1000);}}
  };
  const playSynth=(note,accent,t,lenSteps=1)=>{
    const notes=Array.isArray(note)?note:getVoiceNotes(note,'synth');
    const voiceAccent=accent/Math.sqrt(Math.max(1,notes.length));
    notes.forEach((voice,idx)=>playSynthVoice(voice,voiceAccent,t+idx*0.003,lenSteps));
    setActiveNotes(p=>({...p,synth:notes.join(' · ')}));
  };

  // ─── SCHEDULER ────────────────────────────────────────────────────────────
  const scheduleNote=(si,t)=>{
    const lp=patternsRef.current,ll=laneLenRef.current;
    const accent=si%4===0?1:0.85;
    for(const lane of['kick','snare','hat','bass','synth']){
      const len=ll[lane]||16;
      const li=si%len;
      const sd=lp[lane][li];
      if(!sd||!sd.on)continue;
      if(sd.tied)continue; // skip tied (held) steps — note is already sounding
      if(sd.p<1&&rnd()>sd.p)continue;
      const jit=(rnd()-0.5)*humanizeRef.current*0.02;
      const noteT=t+Math.max(0,jit);
      const ga=grooveAccent(grooveProfileRef.current,lane,li,grooveRef.current);
      const fa=clamp(accent*ga*(sd.v||1),0.1,1.15);
      if(lane==='kick')playKick(fa,noteT);
      else if(lane==='snare')playSnare(fa,noteT);
      else if(lane==='hat')playHat(fa,noteT,si%32===0&&rnd()<0.12);
      else if(lane==='bass')playBass(bassRef.current[li]||'C2',fa,noteT,sd.l||1);
      else if(lane==='synth')playSynth(synthRef.current[li]||'C4',fa,noteT,sd.l||1);
      const delay=Math.max(0,(noteT-audioRef.current.ctx.currentTime)*1000);
      setTimeout(()=>flashLane(lane,fa),delay);
    }
    // Song arc — advance section every N bars
    if(si===0&&songActiveRef.current){
      barCountRef.current++;
      const arc=arcRef.current;
      if(arc.length>0){
        const sec=SECTIONS[arc[arcIdxRef.current]]||SECTIONS.groove;
        if(barCountRef.current>=sec.bars){
          barCountRef.current=0;
          const nextIdx=(arcIdxRef.current+1)%arc.length;
          arcIdxRef.current=nextIdx;
          setArcIdx(nextIdx);
          const nextSec=arc[nextIdx];
          setCurrentSectionName(nextSec);
          regenerateSection(nextSec,false);
        }
      }
    }
  };

  const stepInterval=si=>{
    const ms=(60/bpmRef.current)*1000/4;
    const sw=si%2===1?ms*swingRef.current:-ms*swingRef.current*0.5;
    return Math.max(0.028,(ms+sw)/1000);
  };

  const runScheduler=()=>{
    const a=audioRef.current;if(!a||!isPlayingRef.current)return;
    const now=a.ctx.currentTime;
    while(nextNoteRef.current<now+SCHED){
      const si=stepRef.current;
      scheduleNote(si,nextNoteRef.current);
      const delay=Math.max(0,(nextNoteRef.current-now)*1000);
      setTimeout(()=>{setStep(si);setPage(Math.floor(si/PAGE));},delay);
      nextNoteRef.current+=stepInterval(si);
      stepRef.current=(si+1)%MAX_STEPS;
    }
  };

  // ─── TRANSPORT ────────────────────────────────────────────────────────────
  const startClock=()=>{
    const a=audioRef.current;if(!a)return;
    nextNoteRef.current=a.ctx.currentTime+0.06;
    stepRef.current=0;isPlayingRef.current=true;
    schedulerRef.current=setInterval(runScheduler,LOOK);
  };
  const stopClock=()=>{
    if(schedulerRef.current){clearInterval(schedulerRef.current);schedulerRef.current=null;}
    isPlayingRef.current=false;setIsPlaying(false);setStep(0);
  };
  const togglePlay=async()=>{
    await initAudio();if(!audioRef.current)return;
    if(isPlayingRef.current){stopClock();setStatus('Stopped');return;}
    if(audioRef.current.ctx.state==='suspended')await audioRef.current.ctx.resume();
    startClock();setIsPlaying(true);setStatus(`Playing — ${genre} · ${currentSectionName}`);
  };

  // ─── GENERATION ───────────────────────────────────────────────────────────
  const regenerateSection=(sectionName,pushUndo_=true)=>{
    const gd=GENRES[genre];
    const mName=modeName;
    const prog=progressionRef.current;
    const aMode=arpModeRef.current;
    const lb=lastBassRef.current;
    const result=buildSection(genre,sectionName||currentSectionName,mName,prog,aMode,lb);
    if(pushUndo_)pushUndo();
    setPatterns(result.patterns);
    setBassLine(result.bassLine);
    setSynthLine(result.synthLine);
    setLaneLen(result.laneLen);
    lastBassRef.current=result.lastBass;
    patternsRef.current=result.patterns;
    bassRef.current=result.bassLine;
    synthRef.current=result.synthLine;
    laneLenRef.current=result.laneLen;
    const gp=gd.density>0.65&&gd.chaos>0.4?'bunker':gd.chaos>0.6?'broken':gd.density<0.4?'float':'steady';
    setGrooveProfile(gp);grooveProfileRef.current=gp;
    setStatus(`${genre} · ${sectionName||currentSectionName} · ${mName}`);
  };

  const newGenreSession=(g)=>{
    const gd=GENRES[g];
    const mName=pick(gd.modes);
    const pp=CHORD_PROGS[mName]||CHORD_PROGS.minor;
    const prog=pick(pp);
    const aMode=pick(['up','down','updown','outside']);
    setGenre(g);setModeName(mName);setArpMode(aMode);
    progressionRef.current=prog;arpModeRef.current=aMode;
    setBpm(Math.round(gd.bpm[0]+rnd()*(gd.bpm[1]-gd.bpm[0])));
    bpmRef.current=Math.round(gd.bpm[0]+rnd()*(gd.bpm[1]-gd.bpm[0]));
    setSpace(gd.fxProfile.space);setTone(gd.fxProfile.tone);setDrive(gd.fxProfile.drive*2);
    setNoiseMix(gd.chaos*0.4);setCompress(gd.density*0.4);
    const sec=pick(Object.keys(SECTIONS));
    setCurrentSectionName(sec);
    lastBassRef.current='C2';
    const result=buildSection(g,sec,mName,prog,aMode,'C2');
    setPatterns(result.patterns);setBassLine(result.bassLine);setSynthLine(result.synthLine);setLaneLen(result.laneLen);
    patternsRef.current=result.patterns;bassRef.current=result.bassLine;synthRef.current=result.synthLine;laneLenRef.current=result.laneLen;
    lastBassRef.current=result.lastBass;
    const gp=gd.density>0.65&&gd.chaos>0.4?'bunker':gd.chaos>0.6?'broken':gd.density<0.4?'float':'steady';
    setGrooveProfile(gp);grooveProfileRef.current=gp;
    applyFxNow();
    setStatus(`${g} loaded — ${sec} · ${mName}`);
  };

  // Section jump trigger
  const triggerSection=(sec)=>{
    setCurrentSectionName(sec);regenerateSection(sec);
  };

  // Live performance actions
  const perfActions={
    drop:()=>triggerSection('drop'),
    break:()=>triggerSection('break'),
    build:()=>triggerSection('build'),
    groove:()=>triggerSection('groove'),
    tension:()=>triggerSection('tension'),
    fill:()=>triggerSection('fill'),
    intro:()=>triggerSection('intro'),
    outro:()=>triggerSection('outro'),
    reharmonize:()=>{
      const pp=CHORD_PROGS[modeName]||CHORD_PROGS.minor;
      progressionRef.current=pick(pp);
      regenerateSection(currentSectionName);
      setStatus('Reharmonized');
    },
    mutate:()=>{
      pushUndo();
      const np={...patternsRef.current};
      ['kick','snare','hat','bass','synth'].forEach(ln=>{
        const ll=laneLenRef.current[ln]||16;
        const flips=Math.max(2,Math.floor(ll*0.08));
        np[ln]=np[ln].map(s=>({...s}));
        for(let i=0;i<flips;i++){const pos=Math.floor(rnd()*ll);if(pos%4!==0||ln!=='kick')np[ln][pos].on=!np[ln][pos].on;}
      });
      setPatterns(np);patternsRef.current=np;
      setStatus('Pattern mutated');
    },
    thinOut:()=>{
      pushUndo();
      const np={...patternsRef.current};
      ['hat','synth','bass'].forEach(ln=>{
        const ll=laneLenRef.current[ln]||16;
        np[ln]=np[ln].map((s,i)=>({...s,on:s.on&&(i%4===0||rnd()>0.45)}));
      });
      setPatterns(np);patternsRef.current=np;
      setStatus('Thinned out');
    },
    thicken:()=>{
      pushUndo();
      const np={...patternsRef.current};
      ['hat','kick'].forEach(ln=>{
        const ll=laneLenRef.current[ln]||16;
        np[ln]=np[ln].map((s,i)=>({...s,on:s.on||(rnd()<0.22),v:s.v||0.65,p:s.p||0.7}));
      });
      setPatterns(np);patternsRef.current=np;
      setStatus('Thickened');
    },
    randomizeNotes:()=>{
      // Randomize synth line within current mode's scale
      const mode=MODES[modeName]||MODES.minor;
      const sp=mode.s;
      pushUndo();
      setSynthLine(prev=>{const n=prev.map((v,i)=>patterns.synth[i]?.on?pick(sp):v);synthRef.current=n;return n;});
      setStatus('Synth notes randomized');
    },
    randomizeBass:()=>{
      const mode=MODES[modeName]||MODES.minor;
      const bp=mode.b;
      pushUndo();
      setBassLine(prev=>{const n=prev.map((v,i)=>patterns.bass[i]?.on?pick(bp):v);bassRef.current=n;return n;});
      setStatus('Bass notes randomized');
    },
    shiftNotesUp:()=>{
      const mode=MODES[modeName]||MODES.minor;
      ['bass','synth'].forEach(lane=>{
        const pool=lane==='bass'?mode.b:mode.s;
        if(lane==='bass')setBassLine(prev=>{const n=prev.map((v,i)=>{if(!patterns[lane][i]?.on)return v;const idx=pool.indexOf(v);return pool[Math.min(idx+1,pool.length-1)];});bassRef.current=n;return n;});
        else setSynthLine(prev=>{const n=prev.map((v,i)=>{if(!patterns[lane][i]?.on)return v;const idx=pool.indexOf(v);return pool[Math.min(idx+1,pool.length-1)];});synthRef.current=n;return n;});
      });
      setStatus('Notes shifted up');
    },
    shiftNotesDown:()=>{
      const mode=MODES[modeName]||MODES.minor;
      ['bass','synth'].forEach(lane=>{
        const pool=lane==='bass'?mode.b:mode.s;
        if(lane==='bass')setBassLine(prev=>{const n=prev.map((v,i)=>{if(!patterns[lane][i]?.on)return v;const idx=pool.indexOf(v);return pool[Math.max(idx-1,0)];});bassRef.current=n;return n;});
        else setSynthLine(prev=>{const n=prev.map((v,i)=>{if(!patterns[lane][i]?.on)return v;const idx=pool.indexOf(v);return pool[Math.max(idx-1,0)];});synthRef.current=n;return n;});
      });
      setStatus('Notes shifted down');
    },
    shiftArp:()=>{
      const modes=['up','down','updown','outside'];
      const next=modes[(modes.indexOf(arpModeRef.current)+1)%modes.length];
      setArpMode(next);arpModeRef.current=next;
      regenerateSection(currentSectionName);
      setStatus(`Arp → ${next}`);
    },
    clear:()=>clearPattern(),
  };

  // ─── AUTOPILOT ────────────────────────────────────────────────────────────
  const runAutopilot=useCallback(()=>{
    if(!autopilotRef.current)return;
    const intensity=autopilotIntensity;
    const actions=Object.keys(perfActions);
    const r=rnd();
    if(r<0.25*intensity)perfActions.mutate();
    else if(r<0.4*intensity)perfActions.shiftArp();
    else if(r<0.55)regenerateSection(currentSectionName);
    else if(r<0.65*intensity)perfActions.thinOut();
    else if(r<0.75*intensity)perfActions.thicken();
    else if(r<0.82)perfActions.reharmonize();
    // Section changes with lower probability
    if(rnd()<0.15*intensity){
      const sections=Object.keys(SECTIONS);
      triggerSection(pick(sections));
    }
    const nextDelay=(8+rnd()*16)*(1-intensity*0.4)*1000*(240/bpm);
    autopilotTimerRef.current=setTimeout(runAutopilot,nextDelay);
  },[autopilotIntensity,currentSectionName,genre,bpm]);

  useEffect(()=>{
    if(autopilot){
      setStatus('Autopilot engaged');
      const delay=(4+rnd()*8)*1000*(240/bpm);
      autopilotTimerRef.current=setTimeout(runAutopilot,delay);
    } else {
      if(autopilotTimerRef.current)clearTimeout(autopilotTimerRef.current);
      setStatus('Autopilot off');
    }
    return()=>{if(autopilotTimerRef.current)clearTimeout(autopilotTimerRef.current);};
  },[autopilot,runAutopilot]);

  // ─── SONG ARC ─────────────────────────────────────────────────────────────
  const startSongArc=()=>{
    const arc=pick(SONG_ARCS);
    setSongArc(arc);arcRef.current=arc;
    setArcIdx(0);arcIdxRef.current=0;
    barCountRef.current=0;
    setSongActive(true);songActiveRef.current=true;
    setCurrentSectionName(arc[0]);
    regenerateSection(arc[0]);
    setStatus(`Song arc started: ${arc.join(' → ')}`);
  };
  const stopSongArc=()=>{
    setSongActive(false);songActiveRef.current=false;
    setStatus('Song arc stopped');
  };

  // ─── UNDO/REDO ────────────────────────────────────────────────────────────
  const pushUndo=()=>{
    const snap={patterns:{...patternsRef.current},bassLine:[...bassRef.current],synthLine:[...synthRef.current]};
    undoStack.current=[snap,...undoStack.current.slice(0,UNDO-1)];
    setUndoLen(undoStack.current.length);
  };
  const undo=()=>{
    if(!undoStack.current.length)return;
    const snap=undoStack.current.shift();setUndoLen(undoStack.current.length);
    setPatterns(snap.patterns);setBassLine(snap.bassLine);setSynthLine(snap.synthLine);
    patternsRef.current=snap.patterns;bassRef.current=snap.bassLine;synthRef.current=snap.synthLine;
    setStatus('Undo');
  };

  // ─── SAVE/LOAD ────────────────────────────────────────────────────────────
  const serialize=()=>({
    v:2,genre,modeName,bpm,currentSectionName,grooveProfile,arpMode:arpModeRef.current,
    space,tone,noiseMix,drive,compress,bassFilter,synthFilter,drumDecay,bassSubAmt,fmIdx,
    master,swing,humanize,grooveAmt,projectName,polySynth,bassStack,bassPreset,synthPreset,drumPreset,performancePreset,
    patterns,bassLine,synthLine,laneLen,
  });
  const applySnap=(snap)=>{
    if(!snap||snap.v!==2)return;
    stopClock();
    setGenre(snap.genre||'techno');setModeName(snap.modeName||'minor');setBpm(snap.bpm||128);bpmRef.current=snap.bpm||128;
    setCurrentSectionName(snap.currentSectionName||'groove');setGrooveProfile(snap.grooveProfile||'steady');
    setArpMode(snap.arpMode||'up');arpModeRef.current=snap.arpMode||'up';
    setSpace(snap.space??0.3);setTone(snap.tone??0.7);setNoiseMix(snap.noiseMix??0.2);setDrive(snap.drive??0.1);
    setCompress(snap.compress??0.3);setBassFilter(snap.bassFilter??0.55);setSynthFilter(snap.synthFilter??0.65);
    setDrumDecay(snap.drumDecay??0.5);setBassSubAmt(snap.bassSubAmt??0.5);setFmIdx(snap.fmIdx??0.6);
    setMaster(snap.master??0.85);setSwing(snap.swing??0.03);setHumanize(snap.humanize??0.012);setGrooveAmt(snap.grooveAmt??0.65);setPolySynth(snap.polySynth??true);setBassStack(snap.bassStack??true);setBassPreset(snap.bassPreset??'sub_floor');setSynthPreset(snap.synthPreset??'velvet_pad');setDrumPreset(snap.drumPreset??'tight_punch');setPerformancePreset(snap.performancePreset??'club_night');
    if(snap.projectName)setProjectName(snap.projectName);
    if(snap.patterns){setPatterns(snap.patterns);patternsRef.current=snap.patterns;}
    if(snap.bassLine){setBassLine(snap.bassLine);bassRef.current=snap.bassLine;}
    if(snap.synthLine){setSynthLine(snap.synthLine);synthRef.current=snap.synthLine;}
    if(snap.laneLen){setLaneLen(snap.laneLen);laneLenRef.current=snap.laneLen;}
    setStatus('Scene loaded');
  };
  const saveScene=slot=>{setSavedScenes(p=>p.map((v,i)=>i===slot?{...serialize(),label:`S${slot+1} ${new Date().toLocaleTimeString()}`}:v));setStatus(`Scene ${slot+1} saved`);};
  const loadScene=slot=>{if(savedScenes[slot])applySnap(savedScenes[slot]);};
  const exportJSON=()=>{const b=new Blob([JSON.stringify(serialize(),null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`${projectName.replace(/\s+/g,'-').toLowerCase()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),500);setStatus('Exported');};
  const importRef=useRef(null);
  const importJSON=async e=>{const f=e.target.files?.[0];if(!f)return;try{const t=await f.text();applySnap(JSON.parse(t));}catch{setStatus('Import failed');}finally{e.target.value='';}};

  // ─── RECORDING ────────────────────────────────────────────────────────────
  const startRec=async()=>{
    await initAudio();const a=audioRef.current;if(!a||recState==='recording')return;
    const mimes=['audio/webm;codecs=opus','audio/webm','audio/mp4'];
    const mime=mimes.find(m=>MediaRecorder.isTypeSupported?.(m))||'';
    chunksRef.current=[];
    const rec=mime?new MediaRecorder(a.dest.stream,{mimeType:mime}):new MediaRecorder(a.dest.stream);
    recorderRef.current=rec;
    rec.ondataavailable=e=>{if(e.data?.size>0)chunksRef.current.push(e.data);};
    rec.onstop=()=>{
      const ft=mime||rec.mimeType||'audio/webm';const ext=ft.includes('mp4')?'m4a':'webm';
      const blob=new Blob(chunksRef.current,{type:ft});
      const url=URL.createObjectURL(blob);
      setRecordings(p=>[{url,name:`${projectName.replace(/\s+/g,'-')}-take-${p.length+1}.${ext}`,time:new Date().toLocaleTimeString()},...p.slice(0,7)]);
      setRecState('idle');setStatus('Take saved');
    };
    rec.start();setRecState('recording');setStatus('● REC');
  };
  const stopRec=()=>{if(recorderRef.current&&recState==='recording'){recorderRef.current.stop();setRecState('stopping');}};

  // ─── TAP TEMPO ────────────────────────────────────────────────────────────
  const tapTempo=()=>{
    const now=Date.now();
    setTapTimes(prev=>{
      const next=[...prev.filter(t=>now-t<3000),now];
      if(next.length>=2){const intervals=next.slice(1).map((t,i)=>t-next[i]);const avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;const nb=clamp(Math.round(60000/avg),40,250);setBpm(nb);bpmRef.current=nb;setStatus(`TAP → ${nb} BPM`);}
      return next.slice(-6);
    });
  };

  const applyPartialPreset=(preset)=>{
    if(!preset)return;
    if(preset.genre&&preset.genre!==genre)newGenreSession(preset.genre);
    if(preset.bassMode){
      const next={...GENRES[genre],bassMode:preset.bassMode};
      GENRES[genre]=next;
    }
    if(preset.synthMode){
      const next={...GENRES[genre],synthMode:preset.synthMode};
      GENRES[genre]=next;
    }
    if(preset.space!==undefined)setSpace(preset.space);
    if(preset.tone!==undefined)setTone(preset.tone);
    if(preset.drive!==undefined)setDrive(preset.drive);
    if(preset.compress!==undefined)setCompress(preset.compress);
    if(preset.noiseMix!==undefined)setNoiseMix(preset.noiseMix);
    if(preset.drumDecay!==undefined)setDrumDecay(preset.drumDecay);
    if(preset.bassFilter!==undefined)setBassFilter(preset.bassFilter);
    if(preset.synthFilter!==undefined)setSynthFilter(preset.synthFilter);
    if(preset.bassSubAmt!==undefined)setBassSubAmt(preset.bassSubAmt);
    if(preset.fmIdx!==undefined){setFmIdx(preset.fmIdx);fmIdxRef.current=preset.fmIdx;}
    if(preset.polySynth!==undefined)setPolySynth(preset.polySynth);
    if(preset.bassStack!==undefined)setBassStack(preset.bassStack);
    if(preset.grooveAmt!==undefined){setGrooveAmt(preset.grooveAmt);grooveRef.current=preset.grooveAmt;}
    if(preset.swing!==undefined){setSwing(preset.swing);swingRef.current=preset.swing;}
  };

  const applyBassPreset=(key)=>{
    const preset=SOUND_PRESETS.bass[key];
    if(!preset)return;
    setBassPreset(key);
    applyPartialPreset({...preset});
    setStatus(`Bass preset — ${preset.label}`);
  };
  const applySynthPreset=(key)=>{
    const preset=SOUND_PRESETS.synth[key];
    if(!preset)return;
    setSynthPreset(key);
    applyPartialPreset({...preset});
    setStatus(`Synth preset — ${preset.label}`);
  };
  const applyDrumPreset=(key)=>{
    const preset=SOUND_PRESETS.drum[key];
    if(!preset)return;
    setDrumPreset(key);
    applyPartialPreset({...preset});
    setStatus(`Drum preset — ${preset.label}`);
  };
  const applyPerformancePreset=(key)=>{
    const preset=SOUND_PRESETS.performance[key];
    if(!preset)return;
    setPerformancePreset(key);
    applyPartialPreset({...preset});
    setStatus(`Performance preset — ${preset.label}`);
  };

  const clearPattern=()=>{
    pushUndo();
    const mode=MODES[modeName]||MODES.minor;
    const empty={kick:mkSteps(),snare:mkSteps(),hat:mkSteps(),bass:mkSteps(),synth:mkSteps()};
    setPatterns(empty);patternsRef.current=empty;
    const newBass=mkNotes(mode.b[0]||'C2');
    const newSynth=mkNotes(mode.s[0]||'C4');
    setBassLine(newBass);bassRef.current=newBass;
    setSynthLine(newSynth);synthRef.current=newSynth;
    setStatus('Pattern cleared');
  };

  // ─── STEP EDIT ────────────────────────────────────────────────────────────
  const toggleCell=(lane,idx)=>{
    pushUndo();
    setPatterns(p=>{const n={...p,[lane]:p[lane].map((s,i)=>i===idx?{...s,on:!s.on}:s)};patternsRef.current=n;return n;});
  };
  const setNote=(lane,idx,note)=>{
    if(lane==='bass')setBassLine(p=>{const n=[...p];n[idx]=note;bassRef.current=n;return n;});
    else setSynthLine(p=>{const n=[...p];n[idx]=note;synthRef.current=n;return n;});
  };

  // ─── MIDI ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!navigator.requestMIDIAccess)return;
    navigator.requestMIDIAccess().then(m=>{midiRef.current=m;setMidiOk(true);}).catch(()=>{});
  },[]);

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────
  useEffect(()=>{
    const onKey=e=>{
      if(e.target.tagName==='INPUT')return;
      if(e.code==='Space'){e.preventDefault();togglePlay();}
      else if(e.code==='KeyA')perfActions.drop();
      else if(e.code==='KeyS')perfActions.break();
      else if(e.code==='KeyD')perfActions.build();
      else if(e.code==='KeyF')perfActions.groove();
      else if(e.code==='KeyG')perfActions.tension();
      else if(e.code==='KeyH')perfActions.fill();
      else if(e.code==='KeyM')perfActions.mutate();
      else if(e.code==='KeyR')regenerateSection(currentSectionName);
      else if(e.code==='KeyP')setAutopilot(v=>!v);
      else if(e.code==='KeyZ'&&(e.metaKey||e.ctrlKey))undo();
      else if(e.code==='KeyT')tapTempo();
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[currentSectionName,genre]);

  // ─── VISUALIZER ───────────────────────────────────────────────────────────
  const vizRef=useRef(null);
  useEffect(()=>{
    let rafId;
    const draw=()=>{
      rafId=requestAnimationFrame(draw);
      const an=analyserRef.current;if(!an||!vizRef.current)return;
      const data=new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(data);setVizData(data);
      const canvas=vizRef.current;const ctx=canvas.getContext('2d');
      const W=canvas.width,H=canvas.height;
      ctx.clearRect(0,0,W,H);
      const gc=GENRE_CLR[genre]||'#ff4444';
      const barW=W/data.length;
      for(let i=0;i<data.length;i++){
        const v=(data[i]/255)*H;
        const alpha=0.3+v/H*0.7;
        ctx.fillStyle=`${gc}${Math.round(alpha*255).toString(16).padStart(2,'0')}`;
        ctx.fillRect(i*barW,H-v,barW-0.5,v);
      }
    };
    draw();
    return()=>cancelAnimationFrame(rafId);
  },[genre]);

  // ─── INIT ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    newGenreSession('techno');
    setTimeout(()=>{applyBassPreset('sub_floor');applySynthPreset('velvet_pad');applyDrumPreset('tight_punch');applyPerformancePreset('club_night');},0);
  },[]);

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────
  const gc_=GENRE_CLR[genre]||'#ff4444';
  const visibleSteps=Array.from({length:PAGE},(_,i)=>page*PAGE+i);
  const [viewportWidth,setViewportWidth]=useState(typeof window!=='undefined'?window.innerWidth:1280);
  useEffect(()=>{
    const onResize=()=>setViewportWidth(window.innerWidth);
    window.addEventListener('resize',onResize);
    return()=>window.removeEventListener('resize',onResize);
  },[]);
  const isCompact=viewportWidth<1180;
  const isPhone=viewportWidth<820;

  // ─── UI ───────────────────────────────────────────────────────────────────
  return(
    <div style={{
      width:'100vw',height:'100dvh',background:'#060608',color:'#e8e8e8',
      fontFamily:"'Space Mono',monospace",display:'flex',flexDirection:'column',
      overflow:'hidden',userSelect:'none',position:'relative',
      boxSizing:'border-box',minWidth:0,
    }}>

      {/* ── SCANLINE OVERLAY ── */}
      <div style={{position:'fixed',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)',pointerEvents:'none',zIndex:999}}/>

      {/* ── TOP BAR ── */}
      <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:6,padding:isPhone?'8px':'6px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,minHeight:36,background:'rgba(0,0,0,0.4)',overflow:'hidden'}}>
        {/* Logo */}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.22em',color:gc_,borderRadius:3,padding:'2px 6px',border:`1px solid ${gc_}44`,whiteSpace:'nowrap'}}>
          CESIRA V2
        </div>

        {/* Project name */}
        <input value={projectName} onChange={e=>setProjectName(e.target.value)}
          style={{background:'transparent',border:'none',outline:'none',color:'rgba(255,255,255,0.96)',fontSize:10,fontFamily:'Space Mono,monospace',letterSpacing:'0.08em',width:isPhone?'100%':110,flex:isPhone?1:'0 0 auto',minWidth:isPhone?160:110}}/>

        {/* Genre selector */}
        <div style={{display:'flex',gap:2,flexShrink:0,flexWrap:'wrap',maxWidth:isPhone?'100%':'none'}}>
          {GENRE_NAMES.map(g=>(
            <button key={g} onClick={()=>newGenreSession(g)} style={{
              padding:'2px 5px',borderRadius:2,border:`1px solid ${genre===g?GENRE_CLR[g]:'rgba(255,255,255,0.07)'}`,
              background:genre===g?`${GENRE_CLR[g]}18`:'transparent',
              color:genre===g?GENRE_CLR[g]:'rgba(255,255,255,0.95)',
              fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:'0.1em',
              fontFamily:'Space Mono,monospace',textTransform:'uppercase',
              transition:'all 0.1s',
            }}>{g}</button>
          ))}
        </div>

        <div style={{flex:1}}/>

        {/* Visualizer */}
        {!isPhone&&<canvas ref={vizRef} width={96} height={18} style={{opacity:0.65,borderRadius:2}}/>}

        {/* BPM — proper control with +/- and slider */}
        <div style={{display:'flex',alignItems:'center',gap:2,background:'rgba(255,255,255,0.05)',borderRadius:4,padding:'2px 4px',border:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={()=>{const v=clamp(bpm-5,40,250);setBpm(v);bpmRef.current=v;}} style={{width:16,height:16,borderRadius:2,border:'none',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Space Mono,monospace',lineHeight:1,flexShrink:0}}>−</button>
          <button onClick={()=>{const v=clamp(bpm-1,40,250);setBpm(v);bpmRef.current=v;}} style={{width:14,height:16,borderRadius:2,border:'none',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Space Mono,monospace',lineHeight:1,flexShrink:0}}>‹</button>
          <div style={{textAlign:'center',minWidth:32}}>
            <div style={{fontSize:13,fontWeight:700,color:gc_,fontFamily:'Space Mono,monospace',lineHeight:1}}>{bpm}</div>
            <div style={{fontSize:9.5,color:'rgba(255,255,255,0.96)',letterSpacing:'0.1em'}}>BPM</div>
          </div>
          <button onClick={()=>{const v=clamp(bpm+1,40,250);setBpm(v);bpmRef.current=v;}} style={{width:14,height:16,borderRadius:2,border:'none',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Space Mono,monospace',lineHeight:1,flexShrink:0}}>›</button>
          <button onClick={()=>{const v=clamp(bpm+5,40,250);setBpm(v);bpmRef.current=v;}} style={{width:16,height:16,borderRadius:2,border:'none',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.96)',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Space Mono,monospace',lineHeight:1,flexShrink:0}}>+</button>
          <button onClick={tapTempo} style={{padding:'1px 5px',borderRadius:2,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.96)',fontSize:9.5,cursor:'pointer',fontFamily:'Space Mono,monospace',marginLeft:2}}>TAP</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
          <button onClick={()=>setPolySynth(v=>!v)} style={{padding:'4px 7px',borderRadius:3,border:`1px solid ${polySynth?gc_:'rgba(255,255,255,0.1)'}`,background:polySynth?`${gc_}18`:'rgba(255,255,255,0.03)',color:polySynth?gc_:'rgba(255,255,255,0.97)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace'}}>SYNTH POLY</button>
          <button onClick={()=>setBassStack(v=>!v)} style={{padding:'4px 7px',borderRadius:3,border:`1px solid ${bassStack?'#22d3ee':'rgba(255,255,255,0.1)'}`,background:bassStack?'rgba(34,211,238,0.12)':'rgba(255,255,255,0.03)',color:bassStack?'#22d3ee':'rgba(255,255,255,0.97)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace'}}>BASS STACK</button>
          <button onClick={clearPattern} style={{padding:'4px 8px',borderRadius:3,border:'1px solid rgba(255,80,80,0.35)',background:'rgba(255,80,80,0.08)',color:'#ff8a8a',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Space Mono,monospace'}}>CLEAR</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap',minWidth:isPhone?'100%':'auto'}}>
          <PresetSelect label='BASS' value={bassPreset} options={SOUND_PRESETS.bass} onChange={applyBassPreset} accent='#22d3ee' />
          <PresetSelect label='SYNTH' value={synthPreset} options={SOUND_PRESETS.synth} onChange={applySynthPreset} accent={gc_} />
          <PresetSelect label='DRUM' value={drumPreset} options={SOUND_PRESETS.drum} onChange={applyDrumPreset} accent='#ffb347' />
          <PresetSelect label='PERF' value={performancePreset} options={SOUND_PRESETS.performance} onChange={applyPerformancePreset} accent='#7ee787' />
        </div>

        {/* Transport */}
        <button onClick={togglePlay} style={{
          padding:'4px 14px',borderRadius:3,border:'none',
          background:isPlaying?'#ff2244':'#00cc66',
          color:'#000',fontSize:10,fontWeight:700,cursor:'pointer',
          letterSpacing:'0.1em',fontFamily:'Space Mono,monospace',
          boxShadow:isPlaying?'0 0 12px #ff224466':'0 0 12px #00cc6666',
          transition:'all 0.1s',flexShrink:0,
        }}>{isPlaying?'■ STOP':'▶ PLAY'}</button>

        {/* Autopilot */}
        <button onClick={()=>setAutopilot(v=>!v)} style={{
          padding:'4px 8px',borderRadius:3,border:`1px solid ${autopilot?gc_:'rgba(255,255,255,0.1)'}`,
          background:autopilot?`${gc_}22`:'rgba(255,255,255,0.04)',
          color:autopilot?gc_:'rgba(255,255,255,0.38)',
          fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:'0.1em',fontFamily:'Space Mono,monospace',
          boxShadow:autopilot?`0 0 10px ${gc_}55`:'none',
          transition:'all 0.12s',flexShrink:0,
        }}>{autopilot?'◈ AUTO':'○ AUTO'}</button>

        {/* View toggle */}
        <div style={{display:'flex',gap:2,flexShrink:0}}>
          {['perform','studio','song'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{
              padding:'2px 6px',borderRadius:2,border:`1px solid ${view===v?gc_:'rgba(255,255,255,0.08)'}`,
              background:view===v?`${gc_}18`:'transparent',
              color:view===v?gc_:'rgba(255,255,255,0.96)',
              fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:'0.08em',fontFamily:'Space Mono,monospace',
              textTransform:'uppercase',
            }}>{v}</button>
          ))}
        </div>

        {/* Status */}
        <div style={{fontSize:10,color:'rgba(255,255,255,0.96)',maxWidth:isPhone?'100%':100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',letterSpacing:'0.05em',flex:isPhone?'1 1 100%':'0 1 auto'}}>
          {recState==='recording'&&<span style={{color:'#ff2244',marginRight:3}}>●</span>}{status}
        </div>
        <div style={{width:5,height:5,borderRadius:'50%',background:midiOk?'#00ff88':'rgba(255,255,255,0.12)',flexShrink:0}}/>
      </div>

      {/* ── CONTEXT BAR — always-visible musical state ── */}
      <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:8,padding:isPhone?'6px 10px':'3px 10px',background:'rgba(0,0,0,0.25)',borderBottom:'1px solid rgba(255,255,255,0.04)',flexShrink:0,minHeight:isPhone?40:20,overflow:'hidden'}}>
        <span style={{fontSize:9.5,color:'rgba(255,255,255,0.96)',letterSpacing:'0.12em',textTransform:'uppercase'}}>NOW PLAYING:</span>
        <span style={{fontSize:10,fontWeight:700,color:gc_,letterSpacing:'0.1em',textTransform:'uppercase'}}>{genre}</span>
        <span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.06em'}}>{currentSectionName}</span>
        <span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.06em'}}>{modeName}</span>
        <span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.06em'}}>arp:{arpMode}</span>
        <span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.06em'}}>poly:{polySynth?'3v':'mono'} / bass:{bassStack?'stack':'mono'}</span>
        <span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span>
        <span style={{fontSize:10,color:isPlaying?'#00ff88':'rgba(255,255,255,0.95)',letterSpacing:'0.06em'}}>{isPlaying?'▶ RUNNING':'■ STOPPED'}</span>
        {autopilot&&<><span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span><span style={{fontSize:10,color:gc_,letterSpacing:'0.06em'}}>◈ AUTOPILOT ON</span></>}
        {songActive&&<><span style={{color:'rgba(255,255,255,0.96)',fontSize:10}}>·</span><span style={{fontSize:10,color:'#ffaa00',letterSpacing:'0.06em'}}>ARC {arcIdx+1}/{songArc.length}</span></>}
        <div style={{flex:1}}/>
        {!isPhone&&<span style={{fontSize:10,color:'rgba(255,255,255,0.96)',letterSpacing:'0.08em'}}>SPACE=play · A=drop · S=break · D=build · F=groove · G=tension · M=mutate · R=regen · P=auto · T=tap</span>}
      </div>

      {/* ── VIEWS ── */}
      {view==='perform'&&<PerformView
        genre={genre} gc={gc_} isPlaying={isPlaying}
        currentSectionName={currentSectionName} laneVU={laneVU}
        patterns={patterns} bassLine={bassLine} synthLine={synthLine}
        laneLen={laneLen} step={step} page={page} setPage={setPage}
        activeNotes={activeNotes} arpeMode={arpMode} modeName={modeName}
        autopilot={autopilot} autopilotIntensity={autopilotIntensity}
        setAutopilotIntensity={setAutopilotIntensity}
        perfActions={perfActions} regenerateSection={regenerateSection}
        setNote={setNote}
        savedScenes={savedScenes} saveScene={saveScene} loadScene={loadScene}
        master={master} setMaster={setMaster}
        space={space} setSpace={setSpace}
        tone={tone} setTone={setTone}
        drive={drive} setDrive={setDrive}
        grooveAmt={grooveAmt} setGrooveAmt={setGrooveAmt}
        swing={swing} setSwing={setSwing}
        toggleCell={toggleCell}
        songArc={songArc} arcIdx={arcIdx} songActive={songActive}
        bassPreset={bassPreset} synthPreset={synthPreset} drumPreset={drumPreset} performancePreset={performancePreset}
        applyBassPreset={applyBassPreset} applySynthPreset={applySynthPreset} applyDrumPreset={applyDrumPreset} applyPerformancePreset={applyPerformancePreset}
        compact={isCompact} phone={isPhone}
      />}

      {view==='studio'&&<StudioView
        genre={genre} gc={gc_} patterns={patterns} bassLine={bassLine} synthLine={synthLine}
        laneLen={laneLen} step={step} page={page} setPage={setPage}
        toggleCell={toggleCell} setNote={setNote}
        modeName={modeName} laneVU={laneVU}
        space={space} setSpace={setSpace}
        tone={tone} setTone={setTone}
        noiseMix={noiseMix} setNoiseMix={setNoiseMix}
        drive={drive} setDrive={setDrive}
        compress={compress} setCompress={setCompress}
        bassFilter={bassFilter} setBassFilter={setBassFilter}
        synthFilter={synthFilter} setSynthFilter={setSynthFilter}
        drumDecay={drumDecay} setDrumDecay={setDrumDecay}
        bassSubAmt={bassSubAmt} setBassSubAmt={setBassSubAmt}
        fmIdx={fmIdx} setFmIdx={setFmIdx}
        master={master} setMaster={setMaster}
        swing={swing} setSwing={setSwing}
        humanize={humanize} setHumanize={setHumanize}
        grooveAmt={grooveAmt} setGrooveAmt={setGrooveAmt}
        grooveProfile={grooveProfile} setGrooveProfile={v=>{setGrooveProfile(v);grooveProfileRef.current=v;}}
        regenerateSection={regenerateSection}
        currentSectionName={currentSectionName}
        undoLen={undoLen} undo={undo}
        recState={recState} startRec={startRec} stopRec={stopRec}
        recordings={recordings}
        exportJSON={exportJSON} importRef={importRef} importJSON={importJSON}
        savedScenes={savedScenes} saveScene={saveScene} loadScene={loadScene}
        projectName={projectName} setProjectName={setProjectName}
        clearPattern={clearPattern} polySynth={polySynth} setPolySynth={setPolySynth} bassStack={bassStack} setBassStack={setBassStack}
        bassPreset={bassPreset} synthPreset={synthPreset} drumPreset={drumPreset} performancePreset={performancePreset}
        applyBassPreset={applyBassPreset} applySynthPreset={applySynthPreset} applyDrumPreset={applyDrumPreset} applyPerformancePreset={applyPerformancePreset}
        compact={isCompact} phone={isPhone}
      />}

      {view==='song'&&<SongView
        genre={genre} gc={gc_}
        songArc={songArc} arcIdx={arcIdx} songActive={songActive}
        startSongArc={startSongArc} stopSongArc={stopSongArc}
        currentSectionName={currentSectionName}
        SONG_ARCS={SONG_ARCS} SECTIONS={SECTIONS}
        triggerSection={triggerSection}
        modeName={modeName} arpeMode={arpMode}
        bpm={bpm}
        compact={isCompact} phone={isPhone}
      />}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORM VIEW — full-screen live performance interface
// ─────────────────────────────────────────────────────────────────────────────
