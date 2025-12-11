"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { api } from "@/lib/api";

const scheduleBackupSchema = z.object({
  dbType: z.enum(["postgres", "mongodb", "questdb", "qdrantdb"]),
  delayMinutes: z.coerce.number().min(1, "Delay must be at least 1 minute").max(43200, "Delay cannot exceed 30 days (43200 minutes)"),
});

async function scheduleBackup(data: z.infer<typeof scheduleBackupSchema>) {
  if (data.dbType === "postgres") {
    return api.backup.schedulePostgresBackup(data.delayMinutes);
  } else if (data.dbType === "mongodb") {
    return api.backup.scheduleMongoDBBackup(data.delayMinutes);
  } else if (data.dbType === "questdb") {
    return api.backup.scheduleQuestDBBackup(data.delayMinutes);
  } else if (data.dbType === "qdrantdb") {
    return api.backup.scheduleQdrantDBBackup(data.delayMinutes);
  }
}

export function ScheduleBackupForm() {
  const queryClient = useQueryClient();
  const [dbType, setDbType] = useState<"postgres" | "mongodb" | "questdb" | "qdrantdb" | "">("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [errors, setErrors] = useState<{ dbType?: string; scheduleTime?: string }>({});
  const [isOpen, setIsOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: scheduleBackup,
    onSuccess: (data) => {
      toast.success(data?.message || "Backup scheduled successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsOpen(false);
      setDbType("");
      setScheduleTime("");
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    const now = new Date();

    if (!scheduleTime) {
      setErrors({ scheduleTime: "Time is required" });
      return;
    }

    const [hoursStr, minutesStr] = scheduleTime.split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      setErrors({ scheduleTime: "Enter a valid time in HH:MM (24-hour) format" });
      return;
    }

    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) {
      setErrors({ scheduleTime: "Time must be in the future" });
      return;
    }

    const delayMinutes = Math.ceil((target.getTime() - now.getTime()) / 60000);

    const result = scheduleBackupSchema.safeParse({
      dbType,
      delayMinutes,
    });

    if (!result.success) {
      const formattedErrors: { dbType?: string; scheduleTime?: string } = {};
      result.error.issues.forEach((err: any) => {
        if (err.path[0] === "dbType") {
          formattedErrors.dbType = err.message;
        }
        if (err.path[0] === "delayMinutes") {
          formattedErrors.scheduleTime = err.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    mutate(result.data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Schedule Backup</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a New Backup</DialogTitle>
          <DialogDescription>
            Choose the database and the delay in minutes for the backup.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select onValueChange={(value) => setDbType(value as any)} value={dbType}>
            <SelectTrigger>
              <SelectValue placeholder="Select a database" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="postgres">PostgreSQL</SelectItem>
              <SelectItem value="mongodb">MongoDB</SelectItem>
              <SelectItem value="questdb">QuestDB</SelectItem>
              <SelectItem value="qdrantdb">QdrantDB</SelectItem>
            </SelectContent>
          </Select>
          {errors.dbType && <p className="text-sm text-red-500">{errors.dbType}</p>}
          <p className="text-xs text-muted-foreground">Use 24 hour format (HH:MM)</p>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Time (HH:MM, 24-hour)"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          {errors.scheduleTime && (
            <p className="text-sm text-red-500">{errors.scheduleTime}</p>
          )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || !dbType || !scheduleTime}>
            {isPending ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
