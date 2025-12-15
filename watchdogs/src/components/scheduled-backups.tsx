"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScheduleBackupForm } from "./schedule-backup-form";
import { TaskActions } from "./task-actions";
import { api, type ScheduledTask } from "@/lib/api";

export function ScheduledBackups() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: api.task.listTasks,
  });

  const tasks = data?.data || [];

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Scheduled Backups</CardTitle>
          <CardDescription>
            Schedule and manage your database backups.
          </CardDescription>
        </div>
        <ScheduleBackupForm />
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading tasks...</p>}
        {error && <p className="text-red-500">{error.message}</p>}
        {tasks.length > 0 ? (
          <div className="max-h-[280px] overflow-y-auto border rounded-md relative">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm">Task ID</th>
                  <th className="px-4 py-3 text-left text-sm">Database</th>
                  <th className="px-4 py-3 text-left text-sm">Scheduled For</th>
                  <th className="px-4 py-3 text-left text-sm">State</th>
                  <th className="px-4 py-3 text-right text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task: ScheduledTask) => (
                  <tr key={task.taskId} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-sm">{task.taskId}</td>
                    <td className="px-4 py-3 capitalize">{task.database}</td>
                    <td className="px-4 py-3">
                      {new Date(task.scheduledFor).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          task.state === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {task.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TaskActions taskId={task.taskId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !isLoading && (
            <p className="text-center text-muted-foreground py-4">
              No scheduled backups found.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
