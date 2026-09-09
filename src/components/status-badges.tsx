export const COSIGNER_STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  documents_pending: "Documents pending",
  signature_pending: "Signature pending",
  verified: "Verified",
};

const COSIGNER_STATUS_CLASS: Record<string, string> = {
  invited: "border-border text-muted-foreground",
  documents_pending: "border-signal/50 text-signal",
  signature_pending: "border-accent/50 text-accent",
  verified: "border-emerald-500/40 text-emerald-400",
};

export const DOC_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  voided: "Voided",
};

const DOC_STATUS_CLASS: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  sent: "border-border text-foreground",
  viewed: "border-accent/50 text-accent",
  signed: "border-emerald-500/40 text-emerald-400",
  declined: "border-destructive/50 text-destructive",
  voided: "border-border text-muted-foreground",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.14em] ${className}`}
    >
      <span className="status-dot" />
      {label}
    </span>
  );
}

export function CosignerBadge({ status }: { status: string }) {
  return (
    <Badge
      label={COSIGNER_STATUS_LABEL[status] ?? status}
      className={COSIGNER_STATUS_CLASS[status] ?? "border-border text-muted-foreground"}
    />
  );
}

export function DocBadge({ status }: { status: string }) {
  return (
    <Badge
      label={DOC_STATUS_LABEL[status] ?? status}
      className={DOC_STATUS_CLASS[status] ?? "border-border text-muted-foreground"}
    />
  );
}
