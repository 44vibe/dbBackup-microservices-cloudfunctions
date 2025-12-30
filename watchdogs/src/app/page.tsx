import { BackupTriggers } from "@/components/backup-triggers";
import { ScheduledBackups } from "@/components/scheduled-backups";
import { BackupManagement } from "@/components/backup-management";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DatabaseZap, Globe } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <main className="flex-1 w-full p-2 flex flex-col overflow-hidden">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-6 w-6" />
            <h2 className="text-base font-semibold">Watchdogs - Database Backups</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/domains">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domains Management
              </Button>
            </Link>
            <ModeToggle />
          </div>
        </header>

        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="overflow-hidden shrink-0">
            <BackupTriggers />
          </div>
          <div className="overflow-hidden" style={{ flex: '0.7', minHeight: 0 }}>
            <ScheduledBackups />
          </div>
          <div className="overflow-hidden" style={{ flex: '1.3', minHeight: 0 }}>
            <BackupManagement />
          </div>
        </div>
      </main>
    </div>
  );
}
