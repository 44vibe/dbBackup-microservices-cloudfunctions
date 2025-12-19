"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function BackupTriggers() {
  
  const queryClient = useQueryClient();


  const { mutate: triggerPostgresBackup, isPending: isPGLoading } = useMutation({
    mutationFn: api.backup.triggerPostgresBackup,
    onSuccess: (data) => {
      toast.success(data.message || "PostgreSQL backup triggered successfully!");
      // Delay refetch by 15 seconds to allow Cloud Function to complete backup
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["backups", "postgres"] });
        queryClient.refetchQueries({ queryKey: ["backups", "postgres"] });
      }, 15000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: triggerMongoBackup, isPending: isMongoLoading } = useMutation({
    mutationFn: api.backup.triggerMongoDBBackup,
    onSuccess: (data) => {
      toast.success(data.message || "MongoDB backup triggered successfully!");
      // Delay refetch by 15 seconds to allow Cloud Function to complete backup
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["backups", "mongodb"] });
        queryClient.refetchQueries({ queryKey: ["backups", "mongodb"] });
      }, 15000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: triggerQuestDBBackup, isPending: isQuestDBLoading } = useMutation({
    mutationFn: api.backup.triggerQuestDBBackup,
    onSuccess: (data) => {
      toast.success(data.message || "QuestDB backup triggered successfully!");
      // Delay refetch by 15 seconds to allow Cloud Function to complete backup
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["backups", "questdb"] });
        queryClient.refetchQueries({ queryKey: ["backups", "questdb"] });
      }, 15000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: triggerQdrantDBBackup, isPending: isQdrantDBLoading } = useMutation({
    mutationFn: api.backup.triggerQdrantDBBackup,
    onSuccess: (data) => {
      toast.success(data.message || "QdrantDB backup triggered successfully!");
      // Delay refetch by 15 seconds to allow Cloud Function to complete backup
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["backups", "qdrantdb"] });
        queryClient.refetchQueries({ queryKey: ["backups", "qdrantdb"] });
      }, 15000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });


  return (
    <div className="h-full flex flex-col border rounded-lg bg-card">
      <div className="shrink-0 p-3 border-b">
        <h3 className="text-sm font-semibold">Backup Triggers</h3>
        <p className="text-xs text-muted-foreground">Trigger an immediate backup for your databases.</p>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 p-3">
        <Button onClick={() => triggerPostgresBackup()} disabled={isPGLoading} 
        className="cursor-pointer flex-1 sm:flex-none text-xs md:text-sm p-1 text-center" size="sm">
          {isPGLoading ? "Triggering..." : "PostgreSQL Backup"}
        </Button>
        <Button onClick={() => triggerMongoBackup()} disabled={isMongoLoading} 
        className="cursor-pointer flex-1 sm:flex-none text-xs md:text-sm p-1 text-center" size="sm">
          {isMongoLoading ? "Triggering..." : "MongoDB Backup"}
        </Button>
        <Button onClick={() => triggerQuestDBBackup()} disabled={isQuestDBLoading} className="cursor-pointer flex-1 sm:flex-none text-xs md:text-sm p-1 text-center" size="sm">
          {isQuestDBLoading ? "Triggering..." : "QuestDB Backup"}
        </Button>
        <Button onClick={() => triggerQdrantDBBackup()} disabled={isQdrantDBLoading} className="cursor-pointer flex-1 sm:flex-none text-xs md:text-sm p-1 text-center" size="sm">
          {isQdrantDBLoading ? "Triggering..." : "QdrantDB Backup"}
        </Button>
      </div>
    </div>
  );
}
