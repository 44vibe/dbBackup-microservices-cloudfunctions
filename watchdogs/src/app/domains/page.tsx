import { DomainVerification } from "@/components/domain-verification";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme-toggle";
import { DatabaseZap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DomainsPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Database
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-5 w-5" />
          <h2 className="text-base font-semibold">Watchdogs</h2>
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <DomainVerification />
      </main>
    </div>
  );
}
