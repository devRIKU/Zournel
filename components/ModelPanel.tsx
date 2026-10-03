import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Zap, Lightbulb, Compass, Key, CheckCircle, AlertCircle, Sparkles } from './Icons';
import { AppSettings, ModelSlot, ModelTier } from '../types';
import { TIERS, DEFAULT_TIERS, DEFAULT_DECISION_MODEL, modelsFor, hasKey } from '../services/modelConfig';
import { getDecisionTarget } from '../services/jevService';
import { DraggableSegmentedToggle } from './ui/DraggableToggle';
import { press, springSoft } from '../utils/uiSprings';

interface ModelPanelProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onBack: () => void;
}

const TIER_ICON: Record<ModelTier, typeof Zap> = { ember: Zap, lantern: Lightbulb, beacon: Compass };

const PROVIDER_LABEL: Record<ModelSlot['provider'], string> = { gemini: 'Gemini', openrouter: 'OpenRouter' };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } }
};

const cardIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSoft }
};

/**
 * The model half of Preferences: three named tiers, each mapped to a provider +
 * model, plus the decision (SystemOne) model that answers mood / priority / intent.
 */
export const ModelPanel: React.FC<ModelPanelProps> = ({ settings, onUpdate, onBack }) => {
  const tiers = settings.modelTiers || DEFAULT_TIERS;
  const activeTier = settings.activeTier || 'lantern';
  const decision = getDecisionTarget(settings);
  const decisionProvider = decision.provider;

  const setSlot = (tier: ModelTier, patch: Partial<ModelSlot>) =>
    onUpdate({ ...settings, modelTiers: { ...tiers, [tier]: { ...tiers[tier], ...patch } } });

  const switchProvider = (tier: ModelTier, provider: ModelSlot['provider']) =>
    setSlot(tier, { provider, model: modelsFor(provider)[0].id });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col min-h-0 h-full">
      <div className="px-5 sm:px-7 py-3 border-b border-surface-highlight shrink-0">
        <motion.button
          type="button"
          {...press}
          onClick={onBack}
          className="-ml-2 px-2 py-1.5 rounded-full flex items-center gap-1 text-accent text-sm font-medium hover:bg-surface-highlight/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Preferences
        </motion.button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-5 no-scrollbar overscroll-contain">

        {TIERS.map((tier) => {
          const Icon = TIER_ICON[tier.id];
          const slot = tiers[tier.id] || DEFAULT_TIERS[tier.id];
          const isActive = activeTier === tier.id;
          const keyed = hasKey(slot.provider, settings);

          return (
            <motion.div
              key={tier.id}
              variants={cardIn}
              className={`p-4 rounded-2xl border ${
                isActive ? 'bg-surface border-accent/50 shadow-xs ring-1 ring-accent/20' : 'bg-surface-highlight/30 border-surface-highlight/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-accent/15 text-accent' : 'bg-surface-highlight/70 text-secondary'
                  }`}>
                    <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{tier.name}</span>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-secondary/70">{tier.tag}</span>
                    </div>
                    <p className="text-[11px] text-secondary/70 mt-0.5">{tier.desc}</p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  {...press}
                  onClick={() => onUpdate({ ...settings, activeTier: tier.id })}
                  className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-colors ${
                    isActive ? 'bg-accent text-accent-fg border-accent' : 'border-surface-highlight text-secondary hover:text-primary'
                  }`}
                >
                  {isActive ? 'Default' : 'Set default'}
                </motion.button>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Provider</span>
                <DraggableSegmentedToggle
                  options={[
                    { value: 'gemini', label: 'Gemini' },
                    { value: 'openrouter', label: 'OpenRouter' },
                  ]}
                  value={slot.provider}
                  onChange={(v) => switchProvider(tier.id, v as ModelSlot['provider'])}
                />
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Model</span>
                <input
                  type="text"
                  value={slot.model}
                  onChange={(e) => setSlot(tier.id, { model: e.target.value })}
                  list={`zournel-models-${tier.id}`}
                  placeholder="provider/model-name"
                  className="mt-1.5 w-full bg-surface-lowest border border-surface-highlight rounded-xl px-3 py-2.5 font-mono text-xs text-primary placeholder:text-secondary/40 focus:outline-none focus:border-accent transition-colors"
                />
                <datalist id={`zournel-models-${tier.id}`}>
                  {modelsFor(slot.provider).map((m) => <option key={m.id} value={m.id} />)}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {modelsFor(slot.provider).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSlot(tier.id, { model: m.id })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition active:scale-95 ${
                        slot.model === m.id
                          ? 'bg-accent/12 border-accent/35 text-accent'
                          : 'bg-surface/60 border-transparent text-secondary hover:text-primary'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`mt-3 flex items-center gap-1.5 text-[10px] font-mono ${keyed ? 'text-secondary/70' : 'text-amber-600 dark:text-amber-400'}`}>
                {keyed ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span className="truncate">
                  {keyed
                    ? `${PROVIDER_LABEL[slot.provider]} key set on this device`
                    : `No ${PROVIDER_LABEL[slot.provider]} key — add one in Preferences`}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Decision model — SystemOne, either on OpenCode Zen or OpenRouter */}
        <motion.div variants={cardIn} className="p-4 rounded-2xl bg-surface-highlight/30 border border-surface-highlight/50">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-highlight/70 text-secondary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-primary">Decision model</span>
              <p className="text-[11px] text-secondary/70 mt-0.5">
                Classifies mood, priority and intent. No text generation, near-instant, cached on device.
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Endpoint</span>
            <DraggableSegmentedToggle
              options={[
                { value: 'zen', label: 'OpenCode Zen' },
                { value: 'openrouter', label: 'OpenRouter' },
              ]}
              value={decisionProvider}
              onChange={(v) => onUpdate({ ...settings, decisionProvider: v as 'zen' | 'openrouter' })}
            />
          </div>

          <div className="mt-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary/70">Model</span>
            <input
              type="text"
              value={settings.decisionModel || DEFAULT_DECISION_MODEL}
              onChange={(e) => onUpdate({ ...settings, decisionModel: e.target.value })}
              placeholder={DEFAULT_DECISION_MODEL}
              className="mt-1.5 w-full bg-surface-lowest border border-surface-highlight rounded-xl px-3 py-2.5 font-mono text-xs text-primary placeholder:text-secondary/40 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="mt-3 space-y-1">
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${decision.apiKey ? 'text-secondary/70' : 'text-amber-600 dark:text-amber-400'}`}>
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{decision.endpoint}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-mono ${decision.apiKey ? 'text-secondary/70' : 'text-amber-600 dark:text-amber-400'}`}>
              {decision.apiKey ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>
                {decision.apiKey
                  ? `Live · ${decision.model}`
                  : `No key for ${decisionProvider === 'openrouter' ? 'OpenRouter' : 'OpenCode Zen'} — add one in Preferences`}
              </span>
            </div>
          </div>
        </motion.div>

        <p className="text-[10px] text-secondary/50 leading-relaxed px-1">
          Keys are entered under API Configuration. AI cover art always uses Gemini's image model — OpenRouter tiers handle text only.
        </p>
      </div>
    </motion.div>
  );
};
