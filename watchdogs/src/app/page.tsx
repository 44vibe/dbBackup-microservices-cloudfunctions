import { BackupTriggers } from "@/components/backup-triggers";
import { ScheduledBackups } from "@/components/scheduled-backups";
import { BackupManagement } from "@/components/backup-management";
import { ModeToggle } from "@/components/theme-toggle";
import { DatabaseZap } from "lucide-react";

export default function Home() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* <aside className="w-64 border-r p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-8 w-8" />
          <h2 className="text-lg font-semibold">Watchdogs</h2>
        </div>
        <nav>
          <ul className="space-y-2">
            <li><a href="#backup-triggers" className="block p-2 hover:bg-muted rounded-md">Backup Triggers</a></li>
            <li><a href="#scheduled-backups" className="block p-2 hover:bg-muted rounded-md">Scheduled Backups</a></li>
            <li><a href="#backup-management" className="block p-2 hover:bg-muted rounded-md">Backup Management</a></li>
          </ul>
        </nav>
      </aside> */}
      <main className="flex-1 w-full p-2 flex flex-col overflow-hidden">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-6 w-6" />
            <h2 className="text-base font-semibold">Watchdogs</h2>
          </div>
          <ModeToggle />
        </header>
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div id="backup-triggers" className="overflow-hidden shrink-0">
            <BackupTriggers />
          </div>
          <div id="scheduled-backups" className="overflow-hidden" style={{ flex: '0.7', minHeight: 0 }}>
            <ScheduledBackups />
          </div>
          <div id="backup-management" className="overflow-hidden" style={{ flex: '1.3', minHeight: 0 }}>
            <BackupManagement />
          </div>
        </div>
      </main>
    </div>
  );
}
