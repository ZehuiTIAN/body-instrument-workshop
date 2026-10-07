// sound/synth.js — 发声体
//
// 一个单音合成器：noteOn(note) 按住，noteOff() 松开，setNote 滑到别的音。
// 输出接到 effects 链的入口（见 sound/effects.js）。

export function createSynth(config, effectsInput) {
  const synth = new Tone.Synth({
    oscillator: { type: config.oscillatorType },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
  });
  synth.connect(effectsInput);

  let playing = false;

  return {
    noteOn(note) {
      if (playing) return;
      synth.triggerAttack(note);
      playing = true;
    },
    noteOff() {
      if (!playing) return;
      synth.triggerRelease();
      playing = false;
    },
    /** 音还在响的时候换音高（滑音效果） */
    setNote(note) {
      if (playing) {
        synth.frequency.rampTo(Tone.Frequency(note).toFrequency(), 0.05);
      }
    },
    get isPlaying() {
      return playing;
    },
  };
}
