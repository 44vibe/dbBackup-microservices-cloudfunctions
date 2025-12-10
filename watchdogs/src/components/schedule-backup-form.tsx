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
  dbType: z.enum(["postgres", "mongodb"]),
  delayMinutes: z.coerce.number().min(1, "Delay must be at least 1 minute").max(43200, "Delay cannot exceed 30 days (43200 minutes)"),
});

async function scheduleBackup(data: z.infer<typeof scheduleBackupSchema>) {
  if (data.dbType === "postgres") {
    return api.backup.schedulePostgresBackup(data.delayMinutes);
  } else {
    return api.backup.scheduleMongoDBBackup(data.delayMinutes);
  }
}

export function ScheduleBackupForm() {
  const queryClient = useQueryClient();
  const [dbType, setDbType] = useState<"postgres" | "mongodb" | "">("");
  const [delayMinutes, setDelayMinutes] = useState("");
  const [errors, setErrors] = useState<{ dbType?: string; delayMinutes?: string }>({});
  const [isOpen, setIsOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: scheduleBackup,
    onSuccess: (data) => {
      toast.success(data.message || "Backup scheduled successfully!");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsOpen(false);
      setDbType("");
      setDelayMinutes("");
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    const result = scheduleBackupSchema.safeParse({
      dbType,
      delayMinutes,
    });

    if (!result.success) {
      const formattedErrors: { dbType?: string; delayMinutes?: string } = {};
      result.error.issues.forEach((err: any) => {
        if (err.path[0] === "dbType") {
          formattedErrors.dbType = err.message;
        }
        if (err.path[0] === "delayMinutes") {
          formattedErrors.delayMinutes = err.message;
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
            </SelectContent>
          </Select>
          {errors.dbType && <p className="text-sm text-red-500">{errors.dbType}</p>}
          <Input
            placeholder="Delay in minutes"
            type="number"
            value={delayMinutes}
            onChange={(e) => setDelayMinutes(e.target.value)}
          />
          {errors.delayMinutes && (
            <p className="text-sm text-red-500">{errors.delayMinutes}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
