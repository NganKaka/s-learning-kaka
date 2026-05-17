import { useEffect, useRef, useState } from 'react';
import { profile } from '../../data/profile';

type TerminalRow = {
  prompt: string;
  output: string;
};

type RenderRow = {
  prompt: string;
  output: string;
  isPromptDone: boolean;
  isOutputDone: boolean;
};

type Shell = {
  id: string;
  label: string;
  promptColor: string;
  outputColor: string;
  buildRows: () => TerminalRow[];
};

// Faster timings
const PROMPT_SPEED = 18;
const OUTPUT_SPEED = 14;
const PROMPT_TO_OUTPUT_PAUSE = 250;
const PAUSE_BETWEEN = 600;

const shells: Shell[] = [
  {
    id: 'bash',
    label: 'bash',
    promptColor: 'text-cyan-300/80',
    outputColor: 'text-green-300/80',
    buildRows: () => [
      { prompt: '$ whoami', output: profile.name },
      { prompt: '$ cat role.txt', output: profile.title },
      { prompt: '$ cat location.txt', output: profile.location },
      { prompt: '$ cat stack.txt', output: 'Python · React · TypeScript · PostgreSQL · Docker' },
    ],
  },
  {
    id: 'powershell',
    label: 'powershell',
    promptColor: 'text-blue-300/85',
    outputColor: 'text-amber-200/80',
    buildRows: () => [
      { prompt: 'PS> $env:USER', output: profile.name },
      { prompt: 'PS> Get-Content role.txt', output: profile.title },
      { prompt: 'PS> Get-Location', output: profile.location },
      { prompt: 'PS> Get-Module -ListAvailable', output: 'Python, React, TypeScript, PostgreSQL, Docker' },
    ],
  },
  {
    id: 'cmd',
    label: 'cmd',
    promptColor: 'text-white/75',
    outputColor: 'text-white/60',
    buildRows: () => [
      { prompt: 'C:\\> echo %USERNAME%', output: profile.name },
      { prompt: 'C:\\> type role.txt', output: profile.title },
      { prompt: 'C:\\> cd', output: profile.location },
      { prompt: 'C:\\> dir stack /b', output: 'Python  React  TypeScript  PostgreSQL  Docker' },
    ],
  },
  {
    id: 'wsl2',
    label: 'wsl2',
    promptColor: 'text-fuchsia-300/85',
    outputColor: 'text-emerald-300/80',
    buildRows: () => [
      { prompt: '~$ whoami && uname -r', output: `${profile.name} · 5.15-WSL2` },
      { prompt: '~$ cat role.txt', output: profile.title },
      { prompt: '~$ pwd', output: `/mnt/work/${profile.location.toLowerCase().replace(/\s+/g, '-')}` },
      { prompt: '~$ docker ps --format "{{.Image}}"', output: 'python · postgres · node · redis' },
    ],
  },
];

export default function TerminalBoot() {
  const [shellIndex, setShellIndex] = useState(0);
  const shell = shells[shellIndex];
  const [rows, setRows] = useState<TerminalRow[]>(() => shell.buildRows());
  const [displayed, setDisplayed] = useState<RenderRow[]>(() =>
    shell.buildRows().map(() => ({ prompt: '', output: '', isPromptDone: false, isOutputDone: false })),
  );
  const [done, setDone] = useState(false);

  const indexRef = useRef(0);
  const phaseRef = useRef<'prompt' | 'output'>('prompt');

  // Reset whenever the active shell changes
  useEffect(() => {
    const next = shells[shellIndex].buildRows();
    indexRef.current = 0;
    phaseRef.current = 'prompt';
    setRows(next);
    setDisplayed(next.map(() => ({ prompt: '', output: '', isPromptDone: false, isOutputDone: false })));
    setDone(false);
  }, [shellIndex]);

  useEffect(() => {
    if (done) return;

    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const i = indexRef.current;
      if (i >= rows.length) {
        setDone(true);
        return;
      }

      const row = rows[i];

      if (phaseRef.current === 'prompt') {
        setDisplayed((prev) => {
          const next = [...prev];
          const cur = next[i];

          if (cur.prompt.length >= row.prompt.length) {
            next[i] = { ...cur, isPromptDone: true };
            phaseRef.current = 'output';
            timer = setTimeout(tick, PROMPT_TO_OUTPUT_PAUSE);
            return next;
          }

          // Type 2 chars per tick when fast — keeps the keystroke feel without dragging
          const inc = 2;
          next[i] = { ...cur, prompt: row.prompt.substring(0, Math.min(row.prompt.length, cur.prompt.length + inc)) };
          timer = setTimeout(tick, PROMPT_SPEED);
          return next;
        });
        return;
      }

      setDisplayed((prev) => {
        const next = [...prev];
        const cur = next[i];

        if (cur.output.length >= row.output.length) {
          next[i] = { ...cur, isOutputDone: true };
          if (i + 1 < rows.length) {
            indexRef.current = i + 1;
            phaseRef.current = 'prompt';
            timer = setTimeout(tick, PAUSE_BETWEEN);
          } else {
            setDone(true);
          }
          return next;
        }

        const inc = 3;
        next[i] = { ...cur, output: row.output.substring(0, Math.min(row.output.length, cur.output.length + inc)) };
        timer = setTimeout(tick, OUTPUT_SPEED);
        return next;
      });
    }

    tick();

    return () => clearTimeout(timer);
  }, [done, rows]);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0e14] font-tech text-sm shadow-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          </div>
          <span className="text-[10px] text-white/40 ml-2 shrink-0">portfolio</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {shells.map((s, i) => {
            const active = i === shellIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setShellIndex(i)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? 'bg-white/10 text-cyan-100 border border-white/15'
                    : 'text-white/45 hover:text-white/80 border border-transparent'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-1.5 min-h-[240px]" aria-label="Terminal boot sequence">
        {displayed.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-x-2 leading-relaxed">
            <span className={`${shell.promptColor} shrink-0`}>{row.prompt || ' '}</span>
            {row.isPromptDone && (
              <span className={`${shell.outputColor} transition-opacity duration-150`}>
                {row.output}
                {!row.isOutputDone && <span className="animate-pulse ml-0.5">▊</span>}
              </span>
            )}
            {!row.isPromptDone && <span className={`animate-pulse ${shell.promptColor}`}>▊</span>}
          </div>
        ))}

        {done && (
          <div className="flex flex-wrap gap-x-2 leading-relaxed">
            <span className={`${shell.promptColor} shrink-0`}>{shell.id === 'cmd' ? 'C:\\>' : shell.id === 'powershell' ? 'PS>' : '$'}</span>
            <span className={shell.outputColor}>ready.</span>
            <span className={`animate-pulse ${shell.promptColor} ml-1`}>▊</span>
          </div>
        )}
      </div>
    </div>
  );
}