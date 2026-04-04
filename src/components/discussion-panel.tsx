"use client";

import { useState, useEffect } from "react";

interface DiscussionMessage {
  id: string;
  role: "user" | "claude" | "system";
  message: string;
  createdAt: string;
}

interface Props {
  runId: string;
  scoreId: string;
  criterionName: string;
  isOpen: boolean;
}

const ROLE_STYLES: Record<string, { label: string; color: string }> = {
  user: { label: "You", color: "text-blue-400" },
  claude: { label: "Claude", color: "text-purple-400" },
  system: { label: "System", color: "text-[var(--muted)]" },
};

export function DiscussionPanel({
  runId,
  scoreId,
  criterionName,
  isOpen,
}: Props) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchMessages();
  }, [isOpen, runId]);

  async function fetchMessages() {
    const res = await fetch(`/api/runs/${runId}/discuss`);
    if (!res.ok) return;
    const discussions: Array<{
      scoreId: string;
      messages: DiscussionMessage[];
    }> = await res.json();
    const forScore = discussions.find((d) => d.scoreId === scoreId);
    setMessages(forScore?.messages ?? []);
  }

  async function sendMessage(role: "user" | "claude") {
    if (!input.trim()) return;
    setSending(true);

    await fetch(`/api/runs/${runId}/discuss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scoreId, role, message: input.trim() }),
    });

    setInput("");
    await fetchMessages();
    setSending(false);
  }

  if (!isOpen) return null;

  return (
    <div className="mt-3 bg-[var(--background)] border border-[var(--border)] rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-[var(--surface-raised)] border-b border-[var(--border)]">
        <span className="text-xs font-medium text-[var(--accent-orange)]">
          Discussion: {criterionName}
        </span>
      </div>

      {/* Messages */}
      <div className="max-h-60 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--muted)]">
            Scores diverge beyond threshold. Discuss to resolve.
          </p>
        )}
        {messages.map((msg) => {
          const style = ROLE_STYLES[msg.role] ?? ROLE_STYLES.system;
          return (
            <div key={msg.id} className="text-xs">
              <span className={`font-medium ${style.color}`}>
                {style.label}:{" "}
              </span>
              <span className="text-[var(--foreground)]">{msg.message}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-[var(--border)]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage("user")}
          placeholder="Discuss this criterion..."
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5 text-xs placeholder:text-[var(--muted)]"
        />
        <button
          onClick={() => sendMessage("user")}
          disabled={!input.trim() || sending}
          className="bg-[#58A6FF] text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
