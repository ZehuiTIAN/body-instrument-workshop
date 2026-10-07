// sound/effects.js — 效果链：filter → reverb → 扬声器
//
// 效果器是信号路上的"站"。想加新效果（delay / distortion / chorus），
// 在 Tone.js 文档里找一个效果器，new 出来，加进 chain 就行。

export function createEffects(config) {
  const { filterMinHz, filterMaxHz, reverbMaxWet, reverbDecay } = config.effectAmounts;

  const filter = new Tone.Filter(1000, "lowpass");
  const reverb = new Tone.Reverb({ decay: reverbDecay, wet: 0 });
  filter.chain(reverb, Tone.Destination);

  return {
    input: filter, // 合成器接到这里

    /** 等混响准备好（在 Start Audio 按钮里 await 一次） */
    async ready() {
      await reverb.ready;
    },

    /** amount: 0~1（左手 X 之类），映射到 filterMinHz~filterMaxHz */
    setFilter(amount) {
      const hz = filterMinHz * Math.pow(filterMaxHz / filterMinHz, Math.min(Math.max(amount, 0), 1));
      filter.frequency.rampTo(hz, 0.1);
    },

    /** amount: 0~1（两手距离之类），映射到 0 ~ reverbMaxWet */
    setReverb(amount) {
      reverb.wet.rampTo(Math.min(Math.max(amount, 0), 1) * reverbMaxWet, 0.1);
    },
  };
}
