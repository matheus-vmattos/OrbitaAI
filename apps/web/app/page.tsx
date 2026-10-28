"use client";

import { useEffect, useRef, useState } from "react";
import { ObligationSession, type Coverage } from "@orbita/shared/session";
import {
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  FileUp,
  Mic,
  Orbit,
  RotateCcw,
  Settings2,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { parseExport, prioritize, type Task } from "@orbita/shared";
import {
  exampleCommand,
  joaoTasks,
  replyTo,
  type Draft,
  type Reply,
} from "@orbita/shared/conversation";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

function DraftCard({
  draft,
  onCopy,
}: {
  draft: Draft;
  onCopy: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(draft.text);
  const [copied, setCopied] = useState(false);
  return (
    <article className="draft-card">
      <h3>{draft.recipient}</h3>
      <textarea
        aria-label={`Resposta para ${draft.recipient}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCopied(false);
        }}
        rows={4}
        maxLength={3000}
      />
      <div className="draft-actions">
        <button
          className="copy-button"
          onClick={async () => setCopied(await onCopy(text))}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copiado" : "Copiar resposta"}
        </button>
        <a
          href="https://web.whatsapp.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="Abre o WhatsApp Web; escolha o contato e cole o texto"
        >
          Abrir WhatsApp <ExternalLink size={13} />
        </a>
      </div>
    </article>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [tasks, setTasks] = useState<Task[]>(joaoTasks);
  const [demo, setDemo] = useState(true);
  const [voice, setVoice] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [panel, setPanel] = useState<"data" | "voice" | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [self, setSelf] = useState("Você");
  const [conversationName, setConversationName] = useState("");
  const session = useRef(new ObligationSession({ workspaceId: "local-tab" }));
  const [coverage, setCoverage] = useState<Coverage>("unknown");
  const [evidence, setEvidence] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  useEffect(
    () => () => {
      recognition.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  function silence() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  function speak(text: string) {
    silence();
    if (!("speechSynthesis" in window)) {
      setNotice("Leitura em voz indisponível. A resposta está na tela.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `${demo ? "No exemplo de demonstração. " : ""}${text}`,
    );
    utterance.lang = "pt-BR";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setNotice("Não foi possível ler em voz. A resposta está na tela.");
    };
    window.speechSynthesis.speak(utterance);
  }
  function submit(text: string) {
    if (!text.trim()) return;
    recognition.current?.abort();
    const answer = replyTo(text, demo, tasks, coverage);
    setLastQuery(text);
    setQuery("");
    setReply(answer);
    setNotice("");
    if (voice) speak(answer.text);
    else silence();
  }
  function startListening() {
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ??
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setNotice(
        "O ditado não está disponível neste navegador. Você pode digitar.",
      );
      composer.current?.focus();
      return;
    }
    silence();
    const current = new Constructor();
    recognition.current = current;
    current.lang = "pt-BR";
    current.continuous = false;
    current.interimResults = false;
    current.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript;
      if (text) submit(text);
    };
    current.onerror = (event) => {
      setListening(false);
      setNotice(
        event.error === "not-allowed"
          ? "Microfone não autorizado. Você pode digitar."
          : "Não consegui ouvir. Tente novamente ou digite.",
      );
    };
    current.onend = () => setListening(false);
    try {
      current.start();
      setListening(true);
      setNotice("");
    } catch {
      setListening(false);
      setNotice("Não foi possível iniciar o microfone. Você pode digitar.");
    }
  }
  function microphone() {
    if (listening) {
      recognition.current?.abort();
      setListening(false);
      return;
    }
    if (!consent) {
      setPanel("voice");
      return;
    }
    startListening();
  }
  function reset() {
    recognition.current?.abort();
    silence();
    setListening(false);
    setReply(null);
    setLastQuery("");
    setQuery("");
    setEvidence(null);
    setNotice("");
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      setNotice(
        "Não foi possível copiar automaticamente. Selecione o texto da resposta e copie.",
      );
      return false;
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".txt") || file.size > 1_000_000)
        throw new Error("Escolha um arquivo .txt de até 1 MB.");
      if (!self.trim())
        throw new Error("Informe seu nome como aparece no arquivo.");
      if (!conversationName.trim())
        throw new Error("Identifique o contato ou grupo da conversa.");
      const result = parseExport(await file.text());
      if (!result.messages.length)
        throw new Error(
          "Formato não reconhecido. Use uma exportação brasileira em UTC−3.",
        );
      const key = conversationName.trim().toLocaleLowerCase("pt-BR");
      session.current.ingest(
        result.messages.map((message) => ({
          conversationId: key,
          source: "export" as const,
          message,
          senderId: message.author,
          displayName: message.author,
          historical: true,
          fromMe:
            message.author.toLocaleLowerCase("pt-BR") ===
            self.trim().toLocaleLowerCase("pt-BR"),
        })),
        { self, conversationLabel: conversationName.trim() },
      );
      const snapshot = session.current.snapshot();
      reset();
      setTasks(snapshot.tasks);
      setCoverage(snapshot.coverage);
      setDemo(false);
      setNotice(
        `${result.messages.length} mensagens lidas; ${snapshot.tasks.length} obrigações conciliadas. ${result.ignored} linhas ignoradas. Histórico parcial.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Não foi possível importar.",
      );
    } finally {
      if (upload.current) upload.current.value = "";
    }
  }

  return (
    <div className={`space-app ${reply ? "has-reply" : ""}`}>
      <div className="starfield" aria-hidden="true">
        {Array.from({ length: 74 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37.17 + 3) % 100}%`,
              top: `${(i * 61.31 + 7) % 100}%`,
              opacity: 0.16 + (i % 5) * 0.09,
              width: i % 9 === 0 ? 2 : 1,
              height: i % 9 === 0 ? 2 : 1,
            }}
          />
        ))}
      </div>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          aria-label="OrbitAI início"
          onClick={(e) => {
            e.preventDefault();
            reset();
          }}
        >
          <Orbit size={25} strokeWidth={1.2} />
          <span>
            orbit<span>AI</span>
          </span>
        </a>
        <div className="header-actions">
          <button className="source-button" onClick={() => setPanel("data")}>
            {demo
              ? "Demonstração"
              : coverage === "unknown"
                ? "Sem dados"
                : "Histórico parcial"}
          </button>
          <button
            className="icon-button"
            aria-label={
              voice ? "Desativar respostas em voz" : "Ativar respostas em voz"
            }
            aria-pressed={voice}
            onClick={() => {
              setVoice(!voice);
              silence();
            }}
          >
            {voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="Conversas e privacidade"
            onClick={() => {
              recognition.current?.abort();
              setPanel("data");
            }}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      <main className="assistant-stage">
        {!reply ? (
          <section className="welcome">
            <div className="orb" aria-hidden="true">
              <div className="orb-ring" />
              <div className="orb-ring second" />
              <div className="orb-light" />
            </div>
            <h1>Iniciar Conexão</h1>
            <button
              className={`talk-button ${listening ? "listening" : ""}`}
              onClick={microphone}
            >
              {listening ? <Square size={19} /> : <Mic size={20} />}{" "}
              {listening ? "Parar de ouvir" : "Falar com a órbita"}
            </button>
            <button
              className="example-button"
              onClick={() => submit("Urgente Hoje")}
            >
              Urgente Hoje
            </button>
          </section>
        ) : (
          <section className="conversation" aria-label="Conversa com a órbita">
            <div className="your-query">{lastQuery}</div>
            <div className="answer-mark">
              <Orbit size={22} />
              <span>ÓRBITA</span>
              {speaking && (
                <span className="voice-state">Respondendo em voz</span>
              )}
            </div>
            <div className="spoken-answer" aria-live="polite">
              {reply.text}
            </div>
            <div className="answer-tools">
              <button
                onClick={() => (speaking ? silence() : speak(reply.text))}
              >
                {speaking ? <Square size={14} /> : <Volume2 size={15} />}{" "}
                {speaking ? "Parar leitura" : "Ouvir"}
              </button>
              <button onClick={() => setEvidence(evidence ? null : "all")}>
                Ver contexto
              </button>
              <button aria-label="Nova conversa" onClick={reset}>
                <RotateCcw size={14} />
              </button>
            </div>
            {evidence && (
              <div className="evidence">
                {demo ? (
                  <p>
                    Exemplo fictício do João. Nada foi lido do seu WhatsApp.
                  </p>
                ) : (
                  <p>
                    {coverage === "unknown"
                      ? "Não há cobertura de conversas confirmada."
                      : "Histórico parcial; possíveis ações identificadas por regras simples."}
                  </p>
                )}
                {tasks.map((task) => (
                  <details key={task.id}>
                    <summary>
                      {task.contactLabel ?? task.contact} ·{" "}
                      {
                        {
                          open: "Em aberto",
                          waiting_other: "Aguardando terceiro",
                          possibly_resolved: "Conferir conclusão",
                          resolved: "Concluída",
                        }[task.status]
                      }
                    </summary>
                    <blockquote>{task.evidence}</blockquote>
                    {task.requiresReview && <p>{task.reviewReason}</p>}
                    {task.evidenceIds && (
                      <p>{task.evidenceIds.length} evidências vinculadas</p>
                    )}
                    {prioritize(tasks).find((t) => t.id === task.id)
                      ?.priorityReason && (
                      <p>
                        {
                          prioritize(tasks).find((t) => t.id === task.id)
                            ?.priorityReason
                        }
                      </p>
                    )}
                    <button
                      onClick={() => {
                        const status =
                          task.status === "resolved" ? "open" : "resolved";
                        if (demo) {
                          setTasks((items) =>
                            items.map((t) =>
                              t.id === task.id ? { ...t, status } : t,
                            ),
                          );
                        } else {
                          session.current.setManualStatus(task.id, status);
                          setTasks(session.current.snapshot().tasks);
                        }
                      }}
                    >
                      {task.status === "resolved"
                        ? "Reabrir"
                        : "Marcar como concluída"}
                    </button>
                  </details>
                ))}
              </div>
            )}
            {reply.drafts && (
              <div className="drafts">
                {reply.drafts.map((draft, index) => (
                  <DraftCard
                    key={`${lastQuery}-${index}`}
                    draft={draft}
                    onCopy={copy}
                  />
                ))}
                <p className="draft-note">
                  Escolha o contato e cole no WhatsApp. Nada é enviado por aqui.
                </p>
              </div>
            )}
            {!reply.drafts && demo && /fornecedor X/.test(reply.text) && (
              <button
                className="example-button next-step"
                onClick={() => submit(exampleCommand)}
              >
                Experimentar preparar as duas respostas <ArrowUp size={13} />
              </button>
            )}
          </section>
        )}
      </main>
      <div className="composer-dock">
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
        >
          <input
            ref={composer}
            aria-label="Mensagem para a órbita"
            placeholder={listening ? "Ouvindo…" : "Ou escreva aqui…"}
            value={query}
            maxLength={2000}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className={`mic-button ${listening ? "listening" : ""}`}
            aria-label={listening ? "Parar microfone" : "Falar mensagem"}
            onClick={microphone}
          >
            {listening ? <Square size={17} /> : <Mic size={19} />}
          </button>
          <button
            type="submit"
            className="send-button"
            disabled={!query.trim()}
            aria-label="Enviar mensagem"
          >
            <ArrowUp size={20} />
          </button>
        </form>
        <p className="source-caption">
          {demo
            ? "Exemplo do João · sem WhatsApp conectado"
            : coverage === "unknown"
              ? "Sem conversas importadas"
              : "Exportação parcial · sem atualização automática"}
        </p>
      </div>
      <dialog
        ref={dialog}
        className="settings-dialog"
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
      >
        <button
          className="dialog-close icon-button"
          aria-label="Fechar configurações"
          onClick={() => setPanel(null)}
        >
          <X size={20} />
        </button>
        {panel === "voice" ? (
          <>
            <Mic className="dialog-symbol" />
            <h2>Falar com a órbita</h2>
            <p>
              O ditado usa o serviço de voz do seu navegador, que pode processar
              áudio externamente. Só escutamos quando você ativa o microfone.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                setConsent(true);
                setPanel(null);
                startListening();
              }}
            >
              Ativar ditado
            </button>
            <button
              className="text-button"
              onClick={() => {
                setPanel(null);
                composer.current?.focus();
              }}
            >
              Prefiro digitar
            </button>
          </>
        ) : (
          <>
            <Orbit className="dialog-symbol" />
            <h2>Conversas e privacidade</h2>
            <p>
              Este protótipo usa um roteiro local do João. Não há IA, conta real
              ou envio de mensagens.
            </p>
            <section>
              <h3>Instalar no celular</h3>
              <p>
                Android: abra o menu do Chrome e escolha “Instalar app” ou
                “Adicionar à tela inicial”. No iPhone: abra no Safari, toque em
                Compartilhar e em “Adicionar à Tela de Início”.
              </p>
            </section>
            <section>
              <h3>Importar conversa</h3>
              <label>
                Conversa (contato ou grupo)
                <input
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                Seu nome no arquivo
                <input
                  value={self}
                  onChange={(e) => setSelf(e.target.value)}
                  maxLength={100}
                />
              </label>
              <p className="fine-print">
                TXT brasileiro, UTC−3, até 1 MB. Use apenas conteúdo autorizado.
                Os dados ficam nesta aba e são descartados ao recarregar.
              </p>
              <button
                className="secondary-button"
                onClick={() => upload.current?.click()}
              >
                <FileUp size={16} /> Escolher .txt
              </button>
            </section>
            <section>
              <h3>Seus dados</h3>
              <button
                className="text-button"
                onClick={() => {
                  reset();
                  setTasks([]);
                  session.current.clear();
                  setCoverage("unknown");

                  setDemo(false);
                  setNotice("Dados desta aba removidos.");
                  setPanel(null);
                }}
              >
                Limpar dados desta aba
              </button>
              <button
                className="text-button"
                onClick={() => {
                  reset();
                  setTasks(joaoTasks);
                  session.current.clear();
                  setCoverage("unknown");

                  setDemo(true);
                  setPanel(null);
                }}
              >
                Restaurar exemplo do João
              </button>
            </section>
          </>
        )}
      </dialog>
      <input
        type="file"
        ref={upload}
        hidden
        accept=".txt,text/plain"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
    </div>
  );
}
