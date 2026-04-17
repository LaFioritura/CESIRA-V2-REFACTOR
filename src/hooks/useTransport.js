import { useCallback, useRef, useState } from 'react';

export function useTransport({ audioRef, bpmRef, swingRef, initAudio, scheduleNote, setStatus, getPlayingStatus, maxSteps, pageSize, schedWindow, lookaheadMs }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(0);

  const isPlayingRef = useRef(false);
  const schedulerRef = useRef(null);
  const nextNoteRef = useRef(0);
  const stepRef = useRef(0);

  const stepInterval = useCallback((si) => {
    const ms = (60 / bpmRef.current) * 1000 / 4;
    const sw = si % 2 === 1 ? ms * swingRef.current : -ms * swingRef.current * 0.5;
    return Math.max(0.028, (ms + sw) / 1000);
  }, [bpmRef, swingRef]);

  const runScheduler = useCallback(() => {
    const a = audioRef.current;
    if (!a || !isPlayingRef.current) return;
    const now = a.ctx.currentTime;
    while (nextNoteRef.current < now + schedWindow) {
      const si = stepRef.current;
      scheduleNote(si, nextNoteRef.current);
      const delay = Math.max(0, (nextNoteRef.current - now) * 1000);
      setTimeout(() => {
        setStep(si);
        setPage(Math.floor(si / pageSize));
      }, delay);
      nextNoteRef.current += stepInterval(si);
      stepRef.current = (si + 1) % maxSteps;
    }
  }, [audioRef, maxSteps, pageSize, schedWindow, scheduleNote, stepInterval]);

  const startClock = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    nextNoteRef.current = a.ctx.currentTime + 0.06;
    stepRef.current = 0;
    isPlayingRef.current = true;
    schedulerRef.current = setInterval(runScheduler, lookaheadMs);
  }, [audioRef, lookaheadMs, runScheduler]);

  const stopClock = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setStep(0);
  }, []);

  const togglePlay = useCallback(async () => {
    await initAudio();
    if (!audioRef.current) return;
    if (isPlayingRef.current) {
      stopClock();
      setStatus('Stopped');
      return;
    }
    if (audioRef.current.ctx.state === 'suspended') await audioRef.current.ctx.resume();
    startClock();
    setIsPlaying(true);
    setStatus(getPlayingStatus());
  }, [audioRef, getPlayingStatus, initAudio, setStatus, startClock, stopClock]);

  return { isPlaying, step, page, setPage, togglePlay, stopClock, isPlayingRef };
}
