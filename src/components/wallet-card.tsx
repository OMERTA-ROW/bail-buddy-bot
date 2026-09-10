import { useEffect, useState } from "react";
import QRCode from "qrcode";

export type WalletCardData = {
  holderName: string;
  activationCode: string;
  callInNumber: string | null;
  activationUrl: string;
};

export function useCardQr(url: string, dark = "#000000", light = "#ffffff") {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { margin: 0, width: 320, color: { dark, light } })
      .then((d) => { if (alive) setSrc(d); })
      .catch(() => { if (alive) setSrc(null); });
    return () => { alive = false; };
  }, [url, dark, light]);
  return src;
}

const BACK_TEXT =
  "If detained, call this number and give your activation code to start your bond payout process.";

/** Front face — brand, holder, code, call-in number, QR. */
export function CardFront({
  data,
  qr,
  print = false,
}: {
  data: WalletCardData;
  qr: string | null;
  print?: boolean;
}) {
  return (
    <div className={faceClass(print)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="font-serif text-[1.05em] leading-none tracking-tight">Bail Buddy</span>
        </div>
        <span className="eyebrow text-[0.5em]">Activation card</span>
      </div>

      <div className="mt-auto">
        <p className="eyebrow text-[0.5em]">Call to activate</p>
        <p className="font-serif text-[1.5em] leading-tight">
          {data.callInNumber ?? "Number pending"}
        </p>
      </div>

      <div className="mt-[0.6em] flex items-end justify-between gap-[0.8em]">
        <div className="min-w-0">
          <p className="eyebrow text-[0.5em]">Member</p>
          <p className="truncate text-[0.78em] leading-snug">{data.holderName}</p>
          <p className="eyebrow mt-[0.5em] text-[0.5em]">Activation code</p>
          <p className="font-mono text-[0.9em] tracking-[0.18em]">{data.activationCode}</p>
        </div>
        {qr && (
          <img
            src={qr}
            alt="QR code to the activation page"
            className="h-[3.6em] w-[3.6em] shrink-0 rounded-[2px] bg-white p-[0.15em]"
          />
        )}
      </div>
    </div>
  );
}

/** Back face — instructions. */
export function CardBack({ data, print = false }: { data: WalletCardData; print?: boolean }) {
  return (
    <div className={faceClass(print)}>
      <div className="flex items-center justify-between">
        <span className="eyebrow text-[0.5em]">If you are detained</span>
        <span className="font-serif text-[0.8em] leading-none">Bail Buddy</span>
      </div>

      <p className="mt-[0.7em] text-[0.62em] leading-relaxed text-foreground/90">{BACK_TEXT}</p>

      <ol className="mt-[0.6em] space-y-[0.25em] text-[0.55em] leading-relaxed text-muted-foreground">
        <li>1. Call {data.callInNumber ?? "the activation line"}.</li>
        <li>2. Read out your activation code.</li>
        <li>3. Enter your 6-digit PIN to confirm it is you.</li>
      </ol>

      <div className="mt-auto flex items-end justify-between gap-[0.6em] border-t border-border pt-[0.5em]">
        <div className="min-w-0">
          <p className="eyebrow text-[0.45em]">Code</p>
          <p className="font-mono text-[0.7em] tracking-[0.16em]">{data.activationCode}</p>
        </div>
        <p className="text-right text-[0.45em] leading-tight text-muted-foreground">
          Bail Buddy is a tracking and referral service, not a bail bond agency.
          Bonds are posted by state-licensed agents.
        </p>
      </div>
    </div>
  );
}

function faceClass(print: boolean) {
  return [
    "flex h-full w-full flex-col rounded-[0.5em] border border-border p-[0.9em]",
    print ? "bg-white text-black print-face" : "bg-card text-card-foreground",
  ].join(" ");
}

/** Interactive flippable card at exact 3.375 x 2.125in proportions. */
export function FlipCard({ data }: { data: WalletCardData }) {
  const [flipped, setFlipped] = useState(false);
  const qr = useCardQr(data.activationUrl);

  return (
    <div className="space-y-3">
      <div
        className="wallet-card-shell"
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label="Flip membership card"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
        }}
      >
        <div className={`wallet-card-inner ${flipped ? "is-flipped" : ""}`}>
          <div className="wallet-card-face">
            <CardFront data={data} qr={qr} />
          </div>
          <div className="wallet-card-face wallet-card-face-back">
            <CardBack data={data} />
          </div>
        </div>
      </div>
      <button onClick={() => setFlipped((f) => !f)} className="btn-quiet">
        {flipped ? "Show front" : "Show back"}
      </button>
    </div>
  );
}

/** Hidden print sheet: exact card dimensions with crop marks. */
export function PrintSheet({ data }: { data: WalletCardData }) {
  const qr = useCardQr(data.activationUrl, "#000000", "#ffffff");
  return (
    <div className="print-sheet" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="print-card">
          <span className="crop crop-tl" />
          <span className="crop crop-tr" />
          <span className="crop crop-bl" />
          <span className="crop crop-br" />
          {i === 0 ? <CardFront data={data} qr={qr} print /> : <CardBack data={data} print />}
        </div>
      ))}
    </div>
  );
}
