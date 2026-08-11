"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mic, Square, Volume2, RotateCcw, Check } from "lucide-react";
import { chooseSupportedRecordingMimeType, stopMediaStreamTracks } from "@/lib/karaoke/timeline";

// The mascot has no canonical name anywhere in the codebase yet -- the mockup
// just says "[monster name]". Kept as a single constant so renaming it later
// is one edit, not a find-and-replace across the file.
const MASCOT_NAME = "Fox";

// Same cap as the correction modal's practice tab: after three misses we stop
// pushing and let the child move on, rather than looping on a sound they
// can't produce yet.
const MAX_ATTEMPTS = 3;

// Long enough for a single word without making the child wait for the stop
// button. They can also stop early.
const AUTO_STOP_MS = 4000;

const VOWELS = "aeiouy";
const isVowel = (c: string) => VOWELS.includes(c);

// Vowel pairs that spell a single sound, so they stay in one syllable.
const VOWEL_DIGRAPHS = new Set([
  "ai", "ay", "ea", "ee", "ie", "oa", "oe", "oo", "ue", "ui",
  "au", "aw", "ou", "ow", "oi", "oy", "ei", "ey"
]);

// Consonant pairs that spell a single sound -- a syllable break must never
// land between them, or the child is asked to sound out "wi-sh-ing".
const CONSONANT_DIGRAPHS = new Set(["th", "sh", "ch", "ph", "wh", "ck", "ng", "gh", "qu"]);

// Suffixes that reliably start their own syllable. "-er" and "-ly" are
// deliberately absent: peeling them strands the stem's final consonant
// ("wat|er" instead of "wa|ter"), and the normal V|CV rule already places
// those correctly on its own.
const SUFFIXES = ["ness", "less", "ment", "ing", "est", "ful", "ed"];

// Compound words split at their seam, not by vowel rules -- the rules alone
// give "pi|neap|ple" and "bir|thday" because they can't see the word
// boundary inside. Only common K-5 compounds are listed; anything not here
// falls through to the general algorithm.
const COMPOUND_SEAMS: Record<string, number> = {
  pineapple: 4, birthday: 5, butterfly: 6, sunshine: 3, rainbow: 4,
  strawberry: 5, cupcake: 3, bedroom: 3, football: 4, snowman: 4,
  starfish: 4, popcorn: 3, backyard: 4, playground: 4, notebook: 4,
  bathtub: 4, classroom: 5, doghouse: 3, raincoat: 4, sunflower: 3
};

/**
 * Splits a single word (no prefix/suffix/compound handling) into syllables
 * using the standard phonics rules: V|V, V|CV and VC|CV, plus silent final
 * e and consonant+le endings.
 */
function coreSplit(word: string): string[] {
  const ch = word.split("");
  const n = ch.length;
  if (n <= 3) return [word];

  // A leading y is a consonant ("yellow", "yes"), not a vowel.
  const vowelAt = (i: number) => (i === 0 && ch[0] === "y" ? false : isVowel(ch[i]));

  const groups: Array<[number, number]> = [];
  let i = 0;
  while (i < n) {
    if (vowelAt(i)) {
      let end = i;
      while (end + 1 < n && isVowel(ch[end + 1]) && VOWEL_DIGRAPHS.has(ch[end] + ch[end + 1])) {
        end += 1;
      }
      groups.push([i, end]);
      i = end + 1;
    } else {
      i += 1;
    }
  }
  if (groups.length <= 1) return [word];

  // "ap|ple", "ta|ble": consonant + le is its own syllable.
  let leTail: string | null = null;
  if (n >= 4 && word.endsWith("le") && !isVowel(ch[n - 3])) {
    leTail = word.slice(n - 3);
    if (groups[groups.length - 1][0] === n - 1) groups.pop();
  } else {
    // Silent final e ("cake", "stone") is not a syllable of its own.
    const last = groups[groups.length - 1];
    if (last[0] === n - 1 && ch[n - 1] === "e") groups.pop();
  }
  if (groups.length === 0) return [word];

  const limit = leTail ? n - 3 : n;
  const usable = groups.filter((g) => g[0] < limit);
  if (usable.length <= 1) return leTail ? [word.slice(0, limit), leTail] : [word];

  // A cut at index k separates ch[k-1] from ch[k].
  const splitsDigraph = (k: number) =>
    k > 0 && k < n && CONSONANT_DIGRAPHS.has(ch[k - 1] + ch[k]);

  const cuts: number[] = [];
  for (let g = 0; g < usable.length - 1; g += 1) {
    const vowelEnd = usable[g][1];
    const nextVowelStart = usable[g + 1][0];
    const consonants = nextVowelStart - vowelEnd - 1;

    let cut: number;
    if (consonants === 0) {
      cut = nextVowelStart; // V|V   -> "li|on"
    } else if (consonants === 1) {
      cut = nextVowelStart - 1; // V|CV  -> "wa|ter"
    } else {
      cut = vowelEnd + 1 + Math.floor(consonants / 2); // VC|CV -> "hap|py"
    }

    if (splitsDigraph(cut)) cut = cut - 1 > vowelEnd ? cut - 1 : cut + 1;
    if (cut > 0 && cut < limit) cuts.push(cut);
  }

  // Array.from rather than [...new Set(...)]: this project's tsconfig target
  // predates downlevelIteration, so spreading a Set doesn't compile.
  const ordered = Array.from(new Set(cuts)).sort((a, b) => a - b);
  const parts: string[] = [];
  let prev = 0;
  for (const cut of ordered) {
    if (cut > prev) {
      parts.push(word.slice(prev, cut));
      prev = cut;
    }
  }
  parts.push(word.slice(prev, limit));
  if (leTail) parts.push(leTail);

  return parts.filter(Boolean);
}

/**
 * Splits an English word into rough syllables for sounding out.
 *
 * Deliberately a local heuristic rather than an API call: the breakdown
 * updates on every keystroke, so a network round trip per character would be
 * slow and expensive. It's also not TeX hyphenation -- those patterns are
 * tuned for line breaking and skip valid breaks entirely ("happy" and
 * "table" come back undivided), which is useless for phonics.
 *
 * English syllabification has no exact rule set, so this won't match a
 * dictionary on every word. It aims to never break a single sound apart,
 * which is the failure that actually confuses a beginning reader.
 */
export function splitSyllables(raw: string): string[] {
  const word = raw.toLowerCase().replace(/[^a-z']/g, "");
  if (!word) return [];
  if (word.length <= 3) return [word];

  const seam = COMPOUND_SEAMS[word];
  if (seam) {
    return [...coreSplit(word.slice(0, seam)), ...coreSplit(word.slice(seam))];
  }

  // Peel a suffix first so the stem is split on its own ("read|ing", not
  // "rea|ding" -- the suffix's vowel otherwise pulls the cut into the stem).
  for (const suffix of SUFFIXES) {
    if (!word.endsWith(suffix)) continue;

    const stem = word.slice(0, word.length - suffix.length);
    if (stem.length < 3 || !stem.split("").some(isVowel)) break;

    // "-ed" is only its own syllable after t or d ("want|ed", "need|ed").
    // Elsewhere it's silent, and the whole word is one syllable more than
    // the stem is: "jumped" and "walked" don't split at all. Returning the
    // stem's split with "ed" reattached keeps that E from being treated as
    // a vowel nucleus by the general rules.
    if (suffix === "ed" && !/[td]$/.test(stem)) {
      const stemParts = coreSplit(stem);
      stemParts[stemParts.length - 1] += suffix;
      return stemParts;
    }

    return [...coreSplit(stem), suffix];
  }

  return coreSplit(word);
}

type ReadAloudState =
  | "idle"
  | "recording"
  | "checking"
  | "correct"
  | "almost"
  | "exhausted"
  | "error";

type ReadAloudClientProps = {
  childName: string;
};

export function ReadAloudClient({ childName }: ReadAloudClientProps) {
  const router = useRouter();

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const [word, setWord] = useState("");
  const [state, setState] = useState<ReadAloudState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const trimmedWord = word.trim();
  const syllables = splitSyllables(trimmedWord);

  // Typing a new word starts a clean slate -- otherwise the previous word's
  // result would sit under a word it doesn't describe.
  useEffect(() => {
    setState("idle");
    setMessage(null);
    setAttempts(0);
  }, [trimmedWord]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoStopRef.current !== null) window.clearTimeout(autoStopRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopMediaStreamTracks(streamRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const clearAutoStop = () => {
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  };

  /**
   * Speaks the word syllable by syllable, then the whole word once.
   *
   * Queuing separate utterances (rather than one string with dashes) is what
   * actually produces the pause between syllables -- speech synthesis reads
   * "grass" and "gra-ss" almost identically, but two queued utterances get a
   * real gap. Rate is slowed well below default so a beginning reader can
   * follow the individual sounds.
   */
  const speakWord = () => {
    if (typeof window === "undefined" || !window.speechSynthesis || !trimmedWord) return;

    window.speechSynthesis.cancel();

    if (syllables.length > 1) {
      syllables.forEach((syllable) => {
        const part = new SpeechSynthesisUtterance(syllable);
        part.rate = 0.5;
        part.lang = "en-US";
        window.speechSynthesis.speak(part);
      });
    }

    const whole = new SpeechSynthesisUtterance(trimmedWord);
    whole.rate = syllables.length > 1 ? 0.7 : 0.5;
    whole.lang = "en-US";
    window.speechSynthesis.speak(whole);
  };

  const handleRecordingStopped = async (mimeType: string, targetWord: string) => {
    clearAutoStop();
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;

    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    if (audioBlob.size === 0) {
      if (isMountedRef.current) {
        setState("error");
        setMessage("We didn't catch that. Try once more!");
      }
      return;
    }

    if (isMountedRef.current) {
      setState("checking");
      setMessage(null);
    }

    try {
      const formData = new FormData();
      formData.set("audio", audioBlob, "read-aloud-attempt.webm");
      formData.set("word", targetWord);

      const response = await fetch("/api/practice/check-pronunciation", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error?.message || "We couldn't check that one.");
      }

      if (!isMountedRef.current) return;

      if (data?.correct) {
        setState("correct");
        return;
      }

      setAttempts((prev) => {
        const next = prev + 1;
        setState(next >= MAX_ATTEMPTS ? "exhausted" : "almost");
        return next;
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      setState("error");
      setMessage(error instanceof Error ? error.message : "We couldn't check that one.");
    }
  };

  const startRecording = async () => {
    if (!trimmedWord) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setState("error");
      setMessage("This browser can't record audio. Try Chrome, Edge, or Safari 14.1+.");
      return;
    }

    const mimeType = chooseSupportedRecordingMimeType({
      isTypeSupported: window.MediaRecorder.isTypeSupported.bind(window.MediaRecorder)
    });

    if (!mimeType) {
      setState("error");
      setMessage("This browser can't record an audio format we can check.");
      return;
    }

    setMessage(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });

      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        clearAutoStop();
        stopMediaStreamTracks(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
        if (isMountedRef.current) {
          setState("error");
          setMessage("The microphone stopped. Let's try again!");
        }
      };

      recorder.onstop = () => {
        void handleRecordingStopped(mimeType, trimmedWord);
      };

      recorder.start();
      setState("recording");

      autoStopRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, AUTO_STOP_MS);
    } catch (error) {
      recorderRef.current = null;
      setState("error");
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "We need microphone permission to hear you. Turn it on and try again!"
          : "The microphone couldn't start. Try again!"
      );
    }
  };

  const stopRecording = () => {
    clearAutoStop();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const resetAttempt = () => {
    setState("idle");
    setMessage(null);
  };

  const isRecording = state === "recording";
  const isChecking = state === "checking";

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="/child" className="hover:text-[#2b2b2b]">Home</a>
            <a href="#" className="hover:text-[#2b2b2b]">Story Library</a>
            <a href="#" className="hover:text-[#2b2b2b]">Store</a>
            <a href="#" className="hover:text-[#2b2b2b]">Diagnostics</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300" />
            <span className="text-sm font-medium">{childName}</span>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main                                                             */}
      {/* ---------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-3xl px-6 py-12 flex-1">
        <a
          href="/child"
          className="flex items-center gap-2 text-[#a3352b] hover:text-[#c03d32] text-lg font-bold mb-6 transition"
        >
          <LogOut className="h-5 w-5 transform rotate-180" /> End Session
        </a>

        <h1 className="text-4xl font-serif font-bold text-[#a3352b]  tracking-tight sm:text-5xl">Read Aloud</h1>
        <p className="mt-2 text-lg text-[#8a8a8a]">Listen to the word, then say it yourself!</p>

        <div className="relative mt-8">
          <input
            type="text"
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="Type a word..."
            aria-label="Word to practice"
            className="w-full rounded-full border border-[#ecdfc9] bg-white px-6 py-4 pr-14 text-lg font-medium text-[#2b2b2b] placeholder:text-[#b5b5b5] shadow-sm outline-none focus:border-[#0F9C8E]"
          />
          {word ? (
            <button
              type="button"
              onClick={() => setWord("")}
              aria-label="Clear word"
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#8a8a8a] hover:text-[#2b2b2b]"
            >
              ✕
            </button>
          ) : null}
        </div>

        {trimmedWord ? (
          <>
            {/* Word card */}
            <div className="mt-8 rounded-[24px] border border-[#ecdfc9]/60 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#fdeceb]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mascot.svg" alt="WonderWord mascot" className="h-20 w-20" />
              </div>

              <p className="mt-4 text-sm font-semibold text-[#6f6f6f]">
                Tap to hear {MASCOT_NAME} say it!
              </p>

              <p className="mt-2 text-4xl font-black uppercase tracking-wide text-[#2b2b2b]">
                {trimmedWord}
              </p>

              {/* Syllable breakdown sits where a definition would normally go --
                  this screen is about sounding the word out, not defining it. */}
              <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[#8a8a8a]">
                Syllables
              </p>
              <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[#ecdfc9] bg-[#FDFAF5] px-4 py-3">
                {syllables.map((syllable, index) => (
                  <span key={`${syllable}-${index}`} className="flex items-center gap-2">
                    <span className="text-lg font-black text-[#0F9C8E]">{syllable}</span>
                    {index < syllables.length - 1 ? (
                      <span className="text-lg font-black text-[#c9c9c9]">·</span>
                    ) : null}
                  </span>
                ))}
              </div>
              {syllables.length === 1 ? (
                <p className="mt-2 text-xs font-semibold text-[#8a8a8a]">
                  One sound — say it in one go!
                </p>
              ) : null}
            </div>

            {/* Feedback */}
            {state === "correct" ? (
              <div className="mt-6 rounded-2xl bg-[#dff3e4] px-6 py-4 text-center">
                <p className="text-base font-black text-[#217a41]">
                  🎉 Great job! You said it perfectly!
                </p>
              </div>
            ) : null}

            {state === "almost" ? (
              <div className="mt-6 rounded-2xl bg-[#fbdcdc] px-6 py-4 text-center">
                <p className="text-base font-black text-[#a3352b]">
                  Almost! Listen one more time and try again!
                </p>
                <p className="mt-1 text-xs font-bold text-[#a3352b]/80">
                  {MAX_ATTEMPTS - attempts} {MAX_ATTEMPTS - attempts === 1 ? "try" : "tries"} left
                </p>
              </div>
            ) : null}

            {state === "exhausted" ? (
              <div className="mt-6 rounded-2xl bg-[#f0f0f0] px-6 py-4 text-center">
                <p className="text-base font-black text-[#4a4a4a]">
                  Nice trying! Let&apos;s come back to this word later.
                </p>
              </div>
            ) : null}

            {state === "error" && message ? (
              <div className="mt-6 rounded-2xl bg-[#fbdcdc] px-6 py-4 text-center">
                <p className="text-sm font-bold text-[#a3352b]">{message}</p>
              </div>
            ) : null}

            {isRecording ? (
              <p className="mt-6 text-center text-sm font-semibold text-[#8a8a8a]">
                Listening... say the word now!
              </p>
            ) : null}

            {isChecking ? (
              <p className="mt-6 text-center text-sm font-semibold text-[#8a8a8a]">
                Checking how you said it...
              </p>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {state === "correct" ? (
                <>
                  <button
                    type="button"
                    onClick={resetAttempt}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0F9C8E] px-8 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#0d8478]"
                  >
                    <RotateCcw className="h-5 w-5" /> Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/child")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ff6868] px-8 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#ef5353]"
                  >
                    <Check className="h-5 w-5" /> Finish
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={speakWord}
                    disabled={isChecking}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0F9C8E] px-8 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#0d8478] disabled:opacity-50"
                  >
                    <Volume2 className="h-5 w-5" /> Hear {MASCOT_NAME} say it
                  </button>

                  {state === "exhausted" ? (
                    <button
                      type="button"
                      onClick={() => router.push("/child")}
                      className="inline-flex items-center gap-2 rounded-full bg-[#ff6868] px-8 py-3 text-base font-black text-white shadow-sm transition hover:bg-[#ef5353]"
                    >
                      <Check className="h-5 w-5" /> Finish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isChecking}
                      className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-black text-white shadow-sm transition disabled:opacity-50 ${
                        isRecording ? "bg-[#E8604F] hover:bg-[#d4523f]" : "bg-[#ff6868] hover:bg-[#ef5353]"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-5 w-5" /> Stop recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-5 w-5" />
                          {state === "almost" ? "Try again" : "Try it!"}
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <p className="mt-12 text-center text-base font-semibold text-[#8a8a8a]">
            Type any word above to practice saying it out loud.
          </p>
        )}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-[#2b2b2b]">Privacy</a>
            <a href="/terms" className="hover:text-[#2b2b2b]">Terms</a>
            <a href="/help" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}