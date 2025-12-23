"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

// Helper function to format file size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function BackupTable({ db }: { db: "postgres" | "mongodb" | "questdb" | "qdrantdb" }) {
  const [mounted] = useState(true);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["backups", db],
    queryFn: () => db === "postgres" ? api.backup.listPostgresBackups() : db === "mongodb" ? api.backup.listMongoDBBackups() : db === "questdb" ? api.backup.listQuestDBBackups() : api.backup.listQdrantDBBackups(),
    staleTime: 1000 * 60 * 20, // 20 seconds
  });

  const { mutate: downloadMutate, isPending: isDownloading } = useMutation({
    mutationFn: (fileName: string) => api.backup.generateDownloadUrl(fileName, 10),
    onSuccess: (data) => {
      toast.success(`Download link generated! Expires at ${new Date(data.expiresAt).toLocaleTimeString()}`);
      window.open(data.signedUrl, "_blank");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const { mutate: deleteMutate, isPending: isDeleting } = useMutation({
    mutationFn: (fileName: string) => api.backup.deleteBackupFile(fileName),
    onSuccess: (data) => {
      toast.success(data.message || "Backup file deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) return <p>Loading backups...</p>;
  if (error) return <p className="text-red-500">{error.message}</p>;

  const files = data?.data || [];

  return (
    <div className="h-full overflow-y-auto overflow-x-auto border rounded-md relative bg-card">
      <table className="w-full border-collapse min-w-[640px]">
        <thead className="sticky top-0 z-10 bg-card border-b">
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium bg-card">File Name</th>
            <th className="px-2 py-1 text-left text-xs font-medium bg-card">Size</th>
            <th className="px-2 py-1 text-left text-xs font-medium bg-card">Last Modified</th>
            <th className="px-2 py-1 text-right text-xs font-medium bg-card">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground text-sm">
                No backups found
              </td>
            </tr>
          ) : (
            files.map((file) => (
              <tr key={file.name} className="border-b last:border-b-0 hover:bg-muted/50">
                <td className="px-2 py-1 font-mono text-xs break-all">{file.name}</td>
                <td className="px-2 py-1 whitespace-nowrap text-xs">{formatBytes(file.size)}</td>
                <td className="px-2 py-1 whitespace-nowrap text-xs">{mounted ? new Date(file.updated).toLocaleString() : new Date(file.updated).toISOString()}</td>
                <td className="px-2 py-1">
                  <div className="flex flex-row gap-1 justify-end">
                    <Button size="sm" onClick={() => downloadMutate(file.name)} disabled={isDownloading} className="cursor-pointer whitespace-nowrap">
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutate(file.name)}
                      disabled={isDeleting}
                      className="cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function BackupManagement() {
  return (
    <div className="h-full flex flex-col border rounded-lg bg-card">
      <div className="shrink-0 p-3 border-b">
        <h3 className="text-sm font-semibold">Backup Management</h3>
        <p className="text-xs text-muted-foreground">
          List and download your database backups.
        </p>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col p-3">
        <Tabs defaultValue="postgres" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 shrink-0 h-auto">
            <TabsTrigger value="postgres" className="text-xs">PostgreSQL</TabsTrigger>
            <TabsTrigger value="mongodb" className="text-xs">MongoDB</TabsTrigger>
            <TabsTrigger value="questdb" className="text-xs">QuestDB</TabsTrigger>
            <TabsTrigger value="qdrantdb" className="text-xs">QdrantDB</TabsTrigger>
          </TabsList>
          <TabsContent value="postgres" className="flex-1 overflow-hidden mt-2">
            <BackupTable db="postgres" />
          </TabsContent>
          <TabsContent value="mongodb" className="flex-1 overflow-hidden mt-2">
            <BackupTable db="mongodb" />
          </TabsContent>
          <TabsContent value="questdb" className="flex-1 overflow-hidden mt-2">
            <BackupTable db="questdb" />
          </TabsContent>
          <TabsContent value="qdrantdb" className="flex-1 overflow-hidden mt-2">
            <BackupTable db="qdrantdb" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
