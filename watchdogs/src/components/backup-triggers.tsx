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
import { api, triggerQdrantDBBackup, triggerQuestDBBackup } from "@/lib/api";

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

  const { mutate: triggerQuestDBBackup, isPending: isQuestDBLoading } = useMutation({
    mutationFn: api.backup.triggerQuestDBBackup,
    onSuccess: (data) => {
      toast.success(data.message || "QuestDB backup triggered successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: triggerQdrantDBBackup, isPending: isQdrantDBLoading } = useMutation({
    mutationFn: api.backup.triggerQdrantDBBackup,
    onSuccess: (data) => {
      toast.success(data.message || "QdrantDB backup triggered successfully!");
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
        <Button onClick={() => triggerQuestDBBackup()} disabled={isQuestDBLoading}>
          {isQuestDBLoading ? "Triggering..." : "Trigger QuestDB Backup"}
        </Button>
        <Button onClick={() => triggerQdrantDBBackup()} disabled={isQdrantDBLoading}>
          {isQdrantDBLoading ? "Triggering..." : "Trigger QdrantDB Backup"}
        </Button>
      </CardContent>
    </Card>
  );
}
