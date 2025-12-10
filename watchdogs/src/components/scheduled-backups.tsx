"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Database</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task: ScheduledTask) => (
                <TableRow key={task.taskId}>
                  <TableCell className="font-mono text-sm">{task.taskId}</TableCell>
                  <TableCell className="capitalize">{task.database}</TableCell>
                  <TableCell>{new Date(task.scheduledFor).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      task.state === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {task.state}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <TaskActions taskId={task.taskId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : !isLoading && (
          <p className="text-center text-muted-foreground py-4">No scheduled backups found.</p>
        )}
      </CardContent>
    </Card>
  );
}
