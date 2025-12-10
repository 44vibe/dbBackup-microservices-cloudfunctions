"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

export function BackupTriggers() {
  const { mutate: triggerPostgresBackup, isPending: isPGLoading } = useMutation({
    mutationFn: api.backup.triggerPostgresBackup,
    onSuccess: (data) => {
      toast.success(data.message || "PostgreSQL backup triggered successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: triggerMongoBackup, isPending: isMongoLoading } = useMutation({
    mutationFn: api.backup.triggerMongoDBBackup,
    onSuccess: (data) => {
      toast.success(data.message || "MongoDB backup triggered successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Triggers</CardTitle>
        <CardDescription>Trigger an immediate backup for your databases.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button onClick={() => triggerPostgresBackup()} disabled={isPGLoading}>
          {isPGLoading ? "Triggering..." : "Trigger PostgreSQL Backup"}
        </Button>
        <Button onClick={() => triggerMongoBackup()} disabled={isMongoLoading}>
          {isMongoLoading ? "Triggering..." : "Trigger MongoDB Backup"}
        </Button>
      </CardContent>
    </Card>
  );
}
