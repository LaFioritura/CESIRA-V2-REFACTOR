import { useCallback } from 'react';
import { GENRES, SOUND_PRESETS } from '../engine/musicEngine';

export function usePresetManager(config) {
  const {
    genre,
    newGenreSession,
    setSpace,
    setTone,
    setDrive,
    setCompress,
    setNoiseMix,
    setDrumDecay,
    setBassFilter,
    setSynthFilter,
    setBassSubAmt,
    setFmIdx,
    fmIdxRef,
    setPolySynth,
    setBassStack,
    setGrooveAmt,
    grooveRef,
    setSwing,
    swingRef,
    setStatus,
    setBassPreset,
    setSynthPreset,
    setDrumPreset,
    setPerformancePreset,
  } = config;

  const applyPartialPreset = useCallback((preset) => {
    if (!preset) return;
    if (preset.genre && preset.genre !== genre) newGenreSession(preset.genre);
    if (preset.bassMode) GENRES[genre] = { ...GENRES[genre], bassMode: preset.bassMode };
    if (preset.synthMode) GENRES[genre] = { ...GENRES[genre], synthMode: preset.synthMode };
    if (preset.space !== undefined) setSpace(preset.space);
    if (preset.tone !== undefined) setTone(preset.tone);
    if (preset.drive !== undefined) setDrive(preset.drive);
    if (preset.compress !== undefined) setCompress(preset.compress);
    if (preset.noiseMix !== undefined) setNoiseMix(preset.noiseMix);
    if (preset.drumDecay !== undefined) setDrumDecay(preset.drumDecay);
    if (preset.bassFilter !== undefined) setBassFilter(preset.bassFilter);
    if (preset.synthFilter !== undefined) setSynthFilter(preset.synthFilter);
    if (preset.bassSubAmt !== undefined) setBassSubAmt(preset.bassSubAmt);
    if (preset.fmIdx !== undefined) {
      setFmIdx(preset.fmIdx);
      fmIdxRef.current = preset.fmIdx;
    }
    if (preset.polySynth !== undefined) setPolySynth(preset.polySynth);
    if (preset.bassStack !== undefined) setBassStack(preset.bassStack);
    if (preset.grooveAmt !== undefined) {
      setGrooveAmt(preset.grooveAmt);
      grooveRef.current = preset.grooveAmt;
    }
    if (preset.swing !== undefined) {
      setSwing(preset.swing);
      swingRef.current = preset.swing;
    }
  }, [fmIdxRef, genre, grooveRef, newGenreSession, setBassFilter, setBassStack, setBassSubAmt, setCompress, setDrive, setDrumDecay, setFmIdx, setGrooveAmt, setNoiseMix, setPolySynth, setSpace, setSwing, setSynthFilter, setTone, swingRef]);

  const applyBassPreset = useCallback((key) => {
    const preset = SOUND_PRESETS.bass[key];
    if (!preset) return;
    setBassPreset(key);
    applyPartialPreset({ ...preset });
    setStatus(`Bass preset — ${preset.label}`);
  }, [applyPartialPreset, setBassPreset, setStatus]);

  const applySynthPreset = useCallback((key) => {
    const preset = SOUND_PRESETS.synth[key];
    if (!preset) return;
    setSynthPreset(key);
    applyPartialPreset({ ...preset });
    setStatus(`Synth preset — ${preset.label}`);
  }, [applyPartialPreset, setStatus, setSynthPreset]);

  const applyDrumPreset = useCallback((key) => {
    const preset = SOUND_PRESETS.drum[key];
    if (!preset) return;
    setDrumPreset(key);
    applyPartialPreset({ ...preset });
    setStatus(`Drum preset — ${preset.label}`);
  }, [applyPartialPreset, setDrumPreset, setStatus]);

  const applyPerformancePreset = useCallback((key) => {
    const preset = SOUND_PRESETS.performance[key];
    if (!preset) return;
    setPerformancePreset(key);
    applyPartialPreset({ ...preset });
    setStatus(`Performance preset — ${preset.label}`);
  }, [applyPartialPreset, setPerformancePreset, setStatus]);

  return { applyBassPreset, applySynthPreset, applyDrumPreset, applyPerformancePreset };
}
