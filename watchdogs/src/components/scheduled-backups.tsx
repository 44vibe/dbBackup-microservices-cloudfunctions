"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ScheduleBackupForm } from "./schedule-backup-form";
import { TaskActions } from "./task-actions";
import { api, type ScheduledTask } from "@/lib/api";

export function ScheduledBackups() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: api.task.listTasks,
  });

  const tasks = data?.data || [];

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 p-3 border-b">
        <div>
          <h3 className="text-sm font-semibold">Scheduled Backups</h3>
          <p className="text-xs text-muted-foreground">
            Schedule and manage your database backups.
          </p>
        </div>
        <ScheduleBackupForm />
      </div>
      <div className="flex-1 overflow-hidden p-3">
        {isLoading && <p className="text-sm">Loading tasks...</p>}
        {error && <p className="text-red-500 text-sm">{error.message}</p>}
        {tasks.length > 0 ? (
          <div className="h-full overflow-y-auto overflow-x-auto border rounded-md relative bg-card">
            <table className="w-full border-collapse min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-card border-b">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium bg-card">Task ID</th>
                  <th className="px-2 py-1 text-left text-xs font-medium bg-card">Database</th>
                  <th className="px-2 py-1 text-left text-xs font-medium bg-card">Scheduled For</th>
                  <th className="px-2 py-1 text-left text-xs font-medium bg-card">State</th>
                  <th className="px-2 py-1 text-right text-xs font-medium bg-card">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task: ScheduledTask) => (
                  <tr key={task.taskId} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="px-2 py-1 font-mono text-xs">{task.taskId}</td>
                    <td className="px-2 py-1 capitalize text-xs">{task.database}</td>
                    <td className="px-2 py-1 text-xs whitespace-nowrap">
                      {mounted ? new Date(task.scheduledFor).toLocaleString() : new Date(task.scheduledFor).toISOString()}
                    </td>
                    <td className="px-2 py-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.state === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {task.state}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <TaskActions taskId={task.taskId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !isLoading && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No scheduled backups found.
            </p>
          )
        )}
      </div>
    </div>
  );
}
