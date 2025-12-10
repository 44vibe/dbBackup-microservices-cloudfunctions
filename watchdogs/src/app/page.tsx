import { BackupTriggers } from "@/components/backup-triggers";
import { ScheduledBackups } from "@/components/scheduled-backups";
import { BackupManagement } from "@/components/backup-management";
import { ModeToggle } from "@/components/theme-toggle";
import { DatabaseZap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4 flex flex-col gap-4">
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
      </aside>
      <main className="flex-1 p-4">
        <header className="flex items-center justify-between pb-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <ModeToggle />
        </header>
        <div className="space-y-4">
          <div id="backup-triggers">
            <BackupTriggers />
          </div>
          <div id="scheduled-backups">
            <ScheduledBackups />
          </div>
          <div id="backup-management">
            <BackupManagement />
          </div>
        </div>
      </main>
    </div>
  );
}
