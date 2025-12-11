"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

export function TaskActions({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: taskDetails, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.task.getTaskDetails(taskId),
    enabled: isViewOpen,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.task.cancelTask(taskId),
    onSuccess: (data) => {
      toast.success(data.message || "Task cancelled successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex gap-2">
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            View
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              Details for task {taskId}
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p>Loading task details...</p>
          ) : taskDetails?.data ? (
            <div className="mt-2 space-y-2 w-auto">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold">Task ID:</div>
                <div className="font-mono">{taskDetails.data.taskId}</div>

                <div className="font-semibold">Database:</div>
                <div className="capitalize">{taskDetails.data.database}</div>

                <div className="font-semibold">Scheduled For:</div>
                <div>{new Date(taskDetails.data.scheduledFor).toLocaleString()}</div>

                <div className="font-semibold">State:</div>
                <div className="capitalize">{taskDetails.data.state}</div>

                <div className="font-semibold">Dispatch Count:</div>
                <div>{taskDetails.data.dispatchCount}</div>

                <div className="font-semibold">Response Count:</div>
                <div>{taskDetails.data.responseCount}</div>
              </div>
              {/* <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Raw JSON</summary>
                <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-auto">
                  <code className="text-white text-xs">{JSON.stringify(taskDetails.data, null, 2)}</code>
                </pre>
              </details> */}
            </div>
          ) : (
            <p className="text-red-500">Failed to load task details</p>
          )}
        </DialogContent>
      </Dialog>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => mutate()}
        disabled={isPending}
      >
        {isPending ? "Cancelling..." : "Cancel"}
      </Button>
    </div>
  );
}
