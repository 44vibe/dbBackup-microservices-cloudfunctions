"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listCloudflareZones,
  listDnsRecords,
  createTxtRecord,
  removeDomainTxtRecord,
  type CloudflareZone,
  type DnsRecord,
  type CreateTxtRecordRequest,
} from "@/lib/api";
import {
  Globe,
  Search,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
} from "lucide-react";

export function DomainVerification() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<CloudflareZone | null>(null);
  const [showDnsModal, setShowDnsModal] = useState(false);

  // Form state
  const [txtName, setTxtName] = useState("@");
  const [txtContent, setTxtContent] = useState("");
  const [txtTtl, setTxtTtl] = useState("120");

  const queryClient = useQueryClient();

  // Fetch domains
  const { data: domainsData, isLoading: loadingDomains } = useQuery({
    queryKey: ["cloudflare-zones"],
    queryFn: listCloudflareZones,
    staleTime: 1000 * 60 * 5,
  });

  const zones = domainsData?.data || [];

  // Filter domains by search query
  const filteredZones = zones.filter((zone) =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch DNS records for selected domain
  const { data: dnsData, isLoading: loadingDns, refetch: refetchDns } = useQuery({
    queryKey: ["dns-records", selectedDomain?.name],
    queryFn: () => listDnsRecords(selectedDomain!.name, selectedDomain!.id),
    enabled: !!selectedDomain && showDnsModal,
    staleTime: 1000 * 60 * 2,
  });

  const dnsRecords = dnsData?.data || [];

  // Mutations
  const createTxt = useMutation({
    mutationFn: (request: CreateTxtRecordRequest) => createTxtRecord(request),
    onSuccess: () => {
      toast.success("TXT record created!");
      // Reset form
      setTxtName("@");
      setTxtContent("");
      setTxtTtl("120");
      // Refetch DNS records if modal is open
      if (showDnsModal) {
        refetchDns();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const removeTxt = useMutation({
    mutationFn: ({ domain, recordId }: { domain: string; recordId: string }) =>
      removeDomainTxtRecord(domain, recordId, selectedDomain?.id),
    onSuccess: () => {
      toast.success("TXT record deleted!");
      // Refetch DNS records
      if (showDnsModal) {
        refetchDns();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Handlers
  const handleDomainClick = (zone: CloudflareZone) => {
    setSelectedDomain(zone);
    setShowDnsModal(true);
  };

  const handleSelectForManagement = (zone: CloudflareZone) => {
    setSelectedDomain(zone);
    setTxtName("@");
    setTxtContent("");
    setTxtTtl("120");
  };

  const handleCreateTxtRecord = () => {
    if (!selectedDomain) return;

    if (!txtContent.trim()) {
      toast.error("Content is required");
      return;
    }

    createTxt.mutate({
      domain: selectedDomain.name,
      content: txtContent,
      name: txtName,
      ttl: parseInt(txtTtl) || 120,
      zoneId: selectedDomain.id,
    });
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!selectedDomain) return;

    if (confirm("Are you sure you want to delete this TXT record?")) {
      removeTxt.mutate({
        domain: selectedDomain.name,
        recordId,
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">TXT Record Manager</h2>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* LEFT COLUMN - Domain List */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Domain List */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="text-sm">
                Domains ({filteredZones.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingDomains ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Loading domains...
                </div>
              ) : filteredZones.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? "No domains found" : "No domains available"}
                </div>
              ) : (
                filteredZones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedDomain?.id === zone.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => handleSelectForManagement(zone)}
                            className="font-medium text-sm truncate hover:text-primary"
                          >
                            {zone.name}
                          </button>
                          <Badge
                            variant={zone.status === "active" ? "default" : "secondary"}
                            className="text-xs shrink-0"
                          >
                            {zone.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Created: {new Date(zone.createdOn).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDomainClick(zone)}
                        className="shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - TXT Record Form */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <Card className="flex-1 overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-sm">Create TXT Record</CardTitle>
              <CardDescription className="text-xs">
                {selectedDomain ? `Domain: ${selectedDomain.name}` : "Select a domain"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDomain ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Select a domain from the list to create TXT records
                </div>
              ) : (
                <>
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="txt-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="txt-name"
                      type="text"
                      placeholder="@ (root domain)"
                      value={txtName}
                      onChange={(e) => setTxtName(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use @ for root domain or enter subdomain (e.g., "www", "_dmarc")
                    </p>
                  </div>

                  {/* Content Field */}
                  <div className="space-y-2">
                    <Label htmlFor="txt-content" className="text-xs">
                      Content <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="txt-content"
                      type="text"
                      placeholder="Enter TXT record value"
                      value={txtContent}
                      onChange={(e) => setTxtContent(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      The TXT record value (e.g., verification code, SPF, DKIM)
                    </p>
                  </div>

                  {/* TTL Field */}
                  <div className="space-y-2">
                    <Label htmlFor="txt-ttl" className="text-xs">
                      TTL (seconds)
                    </Label>
                    <Input
                      id="txt-ttl"
                      type="number"
                      placeholder="120"
                      value={txtTtl}
                      onChange={(e) => setTxtTtl(e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values propagate faster (default: 120 = 2 minutes)
                    </p>
                  </div>

                  {/* Create Button */}
                  <Button
                    onClick={handleCreateTxtRecord}
                    disabled={createTxt.isPending || !txtContent.trim()}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    {createTxt.isPending ? "Creating..." : "Create TXT Record"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DNS Records Modal */}
      <Dialog open={showDnsModal} onOpenChange={setShowDnsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              DNS Records - {selectedDomain?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingDns ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading DNS records...
              </div>
            ) : dnsRecords.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No DNS records found
              </div>
            ) : (
              dnsRecords.map((record) => (
                <div key={record.id} className="p-3 bg-muted rounded space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge>{record.type}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        TTL: {record.ttl === 1 ? "Auto" : `${record.ttl}s`}
                      </span>
                      {record.type === "TXT" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="h-6 px-2"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground font-medium min-w-[60px]">
                        Name:
                      </span>
                      <span className="break-all">{record.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground font-medium min-w-[60px]">
                        Content:
                      </span>
                      <span className="break-all">{record.content}</span>
                    </div>
                    {record.proxied && (
                      <Badge variant="secondary" className="text-xs">
                        Proxied
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
