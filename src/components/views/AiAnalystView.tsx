import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Copy, FileText, Send, Sparkles, User } from 'lucide-react';
import { useTwin } from '../../context/TwinContext';
import { askAiAnalyst, TwinContextSummary } from '../../services/aiAnalystService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'gemini' | 'analytical';
}

const SUGGESTED_PROMPTS = [
  'Why is the Core Banking DB at risk?',
  'What should I patch first?',
  'Explain this path to the board',
  'Compare ransomware vs APT risk',
];

export const AiAnalystView: React.FC = () => {
  const {
    currentOverall,
    attackerProfile,
    selectedEntry,
    selectedTarget,
    activePath,
    attackPaths,
    chokePoints,
    cveImpacts,
    optimalPlan,
    patchedCveIds,
    blockedEdgeIds,
    cyberRiskUsd,
    nodeMap,
    vulns,
  } = useTwin();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'AtlasTwin AI Security Analyst ready. Ask about crown-jewel exposure, patch prioritization, threat-actor trade-offs, or generate an executive board briefing.',
      source: 'analytical',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedText, setRevealedText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const twinContext = useMemo<TwinContextSummary>(() => {
    const entryLabel = nodeMap.get(selectedEntry)?.label ?? selectedEntry;
    const targetLabel = nodeMap.get(selectedTarget)?.label ?? selectedTarget;
    return {
      overallRiskScore: currentOverall.overallRisk,
      exposedPathsCount: currentOverall.totalExposedPaths,
      attackerProfile: attackerProfile.name,
      selectedEntry: entryLabel,
      selectedTarget: targetLabel,
      topPath: activePath
        ? {
            chain: activePath.nodes.map((id) => nodeMap.get(id)?.shortLabel ?? id),
            hops: activePath.hops,
            likelihoodPct: Math.round(activePath.likelihood * 1000) / 10,
            riskScore: Math.round(activePath.riskScore * 10) / 10,
            weakestLinkCve: activePath.weakestLinkCve,
            weakestLinkNode:
              nodeMap.get(activePath.weakestLinkNode)?.shortLabel ??
              activePath.weakestLinkNode,
          }
        : null,
      topChokePoints: chokePoints.map((cp) => ({
        label: nodeMap.get(cp.nodeId)?.shortLabel ?? cp.nodeId,
        pathCount: cp.pathCount,
      })),
      topRecommendedPatches: cveImpacts.slice(0, 5).map((c) => ({
        cveId: c.cveId,
        reductionPts: c.riskReduction,
        effort: c.effort,
      })),
      patchedCount: patchedCveIds.size,
      blockedEdgesCount: blockedEdgeIds.size,
      expectedAnnualLossUsd: cyberRiskUsd.expectedUsd,
    };
  }, [
    currentOverall,
    attackerProfile.name,
    selectedEntry,
    selectedTarget,
    activePath,
    chokePoints,
    cveImpacts,
    patchedCveIds.size,
    blockedEdgeIds.size,
    cyberRiskUsd.expectedUsd,
    nodeMap,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading, revealedText]);

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    const res = await askAiAnalyst(
      trimmed,
      nextHistory.map((m) => ({ role: m.role, content: m.content })),
      twinContext,
      nodeMap,
      vulns,
      attackPaths,
      cveImpacts,
      optimalPlan,
      attackerProfile,
      cyberRiskUsd
    );

    const assistantId = `a-${Date.now()}`;
    setLoading(false);

    // Smooth progressive typing reveal
    const full = res.answer;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: full, source: res.source },
    ]);
    setRevealedText('');
    let cursor = 0;
    const step = Math.max(8, Math.ceil(full.length / 26));
    const timer = window.setInterval(() => {
      cursor += step;
      if (cursor >= full.length) {
        window.clearInterval(timer);
        setRevealedText(null);
      } else {
        setRevealedText(full.slice(0, cursor));
      }
    }, 18);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <div className="max-w-[1260px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
      <div className="bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#E6D49A]">
            Live Telemetry Reasoning
          </div>
          <h1 className="font-display text-2xl font-bold mt-0.5">
            AI Security Analyst
          </h1>
          <p className="text-xs text-[#FAF7F0]/75 mt-1">
            Answers are grounded in your live digital twin risk score ({currentOverall.overallRisk.toFixed(1)}/100), active patches, and {attackerProfile.shortName} path topology.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            sendPrompt(
              'Generate an executive board summary of our current bank cyber risk, top crown-jewel path, and prioritized remediation ROI.'
            )
          }
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-[#0B1F3A] text-xs font-semibold hover:bg-[#d8b43b] disabled:opacity-50 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Generate board summary</span>
        </button>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0B1F3A]/65 mr-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
          Suggested:
        </span>
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => sendPrompt(p)}
            className="px-3 py-1.5 rounded-lg bg-[#F1ECDD] border border-[#E6D49A] hover:border-[#0B1F3A] text-xs font-medium text-[#0B1F3A] transition-colors cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Stream */}
      <div
        ref={scrollRef}
        className="bg-[#F1ECDD] border border-[#E6D49A] rounded-xl p-4 sm:p-5 space-y-4 min-h-[380px] max-h-[500px] overflow-y-auto"
      >
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isLastAssistant =
            !isUser && idx === messages.length - 1 && revealedText !== null;
          const displayBody = isLastAssistant ? revealedText : m.content;

          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-[#0B1F3A] border border-[#C9A227] text-[#C9A227] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" aria-hidden="true" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-[#FAF7F0] text-[#0B1F3A] border border-[#E6D49A]'
                    : 'bg-[#0B1F3A] text-[#FAF7F0] border border-[#C9A227]/45'
                }`}
              >
                <div className="whitespace-pre-line">{displayBody}</div>

                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-[#C9A227]/20 flex items-center justify-between gap-4 text-[10px] font-mono text-[#E6D49A]/80">
                    <span>
                      {m.source === 'gemini' ? 'Gemini AI Engine' : 'Analytical Twin Model'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.content)}
                      className="inline-flex items-center gap-1 hover:text-[#FAF7F0] cursor-pointer"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#9ED1A2]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-[#C9A227] text-[#0B1F3A] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" aria-hidden="true" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0B1F3A] border border-[#C9A227] text-[#C9A227] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="bg-[#0B1F3A] text-[#E6D49A] border border-[#C9A227]/45 rounded-xl px-4 py-3 text-xs font-mono">
              Analyzing digital twin attack graph...
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt(input);
        }}
        className="flex items-center gap-2.5 bg-[#FAF7F0] border border-[#C9A227] rounded-xl p-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about crown-jewel exposure, choke points, segmentation, or board impact..."
          className="flex-1 px-3 py-2 bg-transparent text-xs text-[#0B1F3A] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1F3A] text-[#FAF7F0] text-xs font-semibold hover:bg-[#1B3358] disabled:opacity-45 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-[#C9A227]" aria-hidden="true" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
