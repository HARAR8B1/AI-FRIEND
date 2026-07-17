import { useState, useEffect, useRef } from 'react';

const fw = ['female','woman','girl','zira','heera','priya','divya','nila','samantha','victoria','karen','moira','fiona','allison','ava','susan','alice','susan','rachel','amanda','jenny','meera','ananya'];

export function useSpeech(ttsEnabled) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const keepAliveRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const _ensureVoices = (cb) => {
    const vs = window.speechSynthesis.getVoices();
    if (vs.length) { cb(vs); return; }
    window.speechSynthesis.addEventListener('voiceschanged', () => cb(window.speechSynthesis.getVoices()), { once: true });
  };

  const _pickFemaleVoice = (voices, lang) => {
    const lb = (lang || 'en-IN').split('-')[0].toLowerCase();
    const preferredVoiceNames = {
      ta: ['priya', 'samantha', 'meera', 'ananya', 'tara'],
      en: ['samantha', 'susan', 'karen', 'fiona', 'victoria', 'allison'],
      hi: ['heera', 'zira', 'priya', 'karen', 'samantha']
    };

    const list = preferredVoiceNames[lb] || preferredVoiceNames.en;
    return (
      voices.find(v => v.lang.toLowerCase().startsWith(lb) && list.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => v.lang.toLowerCase().startsWith(lb) && fw.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => v.lang.toLowerCase().startsWith(lb)) ||
      voices.find(v => v.lang === 'en-IN' && list.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => v.lang === 'en-IN' && fw.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => list.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => fw.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
      voices[0] ||
      null
    );
  };

  const speakText = (text, voiceLang) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !ttsEnabled) return;
    cancelSpeech();

    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '').replace(/`[^`]*`/g, '')
      .replace(/\n{2,}/g, '. ').replace(/\n/g, ' ').trim();
    
    if (!clean) return;

    _ensureVoices(voices => {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = voiceLang || 'en-IN';
      u.rate = voiceLang?.startsWith('ta') ? 0.82 : 0.88;
      u.pitch = voiceLang?.startsWith('ta') ? 1.14 : 1.18;
      u.volume = 1.0;
      u.voice = _pickFemaleVoice(voices, u.lang);

      u.onstart = () => {
        setIsSpeaking(true);
      };

      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) { clearInterval(keepAliveRef.current); return; }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 12000);

      u.onend = u.onerror = () => {
        clearInterval(keepAliveRef.current);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(u);
    });
  };

  const cancelSpeech = () => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { isSpeaking, speakText, cancelSpeech };
}
