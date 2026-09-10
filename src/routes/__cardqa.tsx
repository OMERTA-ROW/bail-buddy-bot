import { createFileRoute } from "@tanstack/react-router";
import { FlipCard } from "@/components/wallet-card";

export const Route = createFileRoute("/__cardqa")({ component: QA });

function QA() {
  return (
    <div className="py-10">
      <FlipCard
        data={{
          holderName: "Marcus Delacroix-Whitfield",
          activationCode: "K7QX2M9B4D",
          callInNumber: "(844) 555-0182",
          activationUrl: "http://localhost:8080/activate?code=K7QX2M9B4D",
        }}
      />
    </div>
  );
}
