"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { api, type BackupFile } from "@/lib/api";

// Helper function to format file size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function BackupTable({ db }: { db: "postgres" | "mongodb" | "questdb" | "qdrantdb" }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["backups", db],
    queryFn: () => db === "postgres" ? api.backup.listPostgresBackups() : db === "mongodb" ? api.backup.listMongoDBBackups() : db === "questdb" ? api.backup.listQuestDBBackups() : api.backup.listQdrantDBBackups(),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (fileName: string) => api.backup.generateDownloadUrl(fileName, 10),
    onSuccess: (data) => {
      toast.success(`Download link generated! Expires at ${new Date(data.expiresAt).toLocaleTimeString()}`);
      window.open(data.signedUrl, "_blank");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) return <p>Loading backups...</p>;
  if (error) return <p className="text-red-500">{error.message}</p>;

  const files = data?.data || [];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Last Modified</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No backups found
            </TableCell>
          </TableRow>
        ) : (
          files.map((file) => (
            <TableRow key={file.name}>
              <TableCell className="font-mono text-sm">{file.name}</TableCell>
              <TableCell>{formatBytes(file.size)}</TableCell>
              <TableCell>{new Date(file.updated).toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => mutate(file.name)} disabled={isPending}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export function BackupManagement() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Backup Management</CardTitle>
        <CardDescription>
          List and download your database backups.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="postgres">
          <TabsList>
            <TabsTrigger value="postgres">PostgreSQL</TabsTrigger>
            <TabsTrigger value="mongodb">MongoDB</TabsTrigger>
            <TabsTrigger value="questdb">QuestDB</TabsTrigger>
            <TabsTrigger value="qdrantdb">QdrantDB</TabsTrigger>
          </TabsList>
          <TabsContent value="postgres">
            <BackupTable db="postgres" />
          </TabsContent>
          <TabsContent value="mongodb">
            <BackupTable db="mongodb" />
          </TabsContent>
          <TabsContent value="questdb">
            <BackupTable db="questdb" />
          </TabsContent>
          <TabsContent value="qdrantdb">
            <BackupTable db="qdrantdb" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
