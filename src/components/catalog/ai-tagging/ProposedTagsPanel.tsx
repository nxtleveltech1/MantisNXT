"use client";

import { useCallback, useEffect, useState, memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/utils/api-url";

interface LinkedProduct {
  supplier_product_id: string;
  confidence?: number;
  reasoning?: string;
  provider?: string;
  status?: string;
  updated_at?: string;
}

interface ProposedTag {
  tag_proposal_id: string;
  display_name: string;
  tag_type: string;
  status: string;
  status_reason?: string | null;
  suggestion_count: number;
  last_confidence?: number;
  last_provider?: string;
  created_at: string;
  updated_at: string;
  linked_products: LinkedProduct[];
}

export const ProposedTagsPanel = memo(function ProposedTagsPanel() {
  const [proposals, setProposals] = useState<ProposedTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/tag/ai-tagging/proposals"));
      const data = await res.json();
      if (data.success) {
        setProposals(data.proposals);
      }
    } catch (error) {
      console.error("Failed to fetch tag proposals", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleApprove = async (proposalId: string) => {
    setSubmitting(proposalId);
    try {
      const res = await fetch(buildApiUrl("/api/tag/ai-tagging/proposals/approve"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_proposal_id: proposalId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Approval failed");
      }
      toast({
        title: "Tag proposal approved",
        description: `${data.affected_products} products updated`,
      });
      fetchProposals();
    } catch (error) {
      console.error(error);
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    const confirmReject = window.confirm("Reject this proposed tag? Products will return to pending.");
    if (!confirmReject) return;
    setSubmitting(proposalId);
    try {
      const res = await fetch(buildApiUrl("/api/tag/ai-tagging/proposals/reject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_proposal_id: proposalId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Rejection failed");
      }
      toast({
        title: "Tag proposal rejected",
        description: `${data.affected_products} products reset to pending`,
      });
      fetchProposals();
    } catch (error) {
      console.error(error);
      toast({
        title: "Rejection failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Proposed Tags</CardTitle>
        <CardDescription>
          Review and approve or reject tags suggested by the AI when no existing tag matched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading proposals…</p>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending tag proposals.</p>
        ) : (
          <div className="space-y-3">
            {proposals.map(proposal => (
              <div
                key={proposal.tag_proposal_id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{proposal.display_name}</span>
                      <Badge variant="secondary">{proposal.tag_type}</Badge>
                      <Badge variant="outline">
                        {proposal.suggestion_count} suggestion
                        {proposal.suggestion_count === 1 ? "" : "s"}
                      </Badge>
                      {proposal.last_confidence != null && (
                        <Badge variant="outline">
                          {(proposal.last_confidence * 100).toFixed(1)}% confidence
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {proposal.linked_products.length} product
                      {proposal.linked_products.length === 1 ? "" : "s"} linked • Updated{" "}
                      {new Date(proposal.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(proposal.tag_proposal_id)}
                      disabled={submitting === proposal.tag_proposal_id}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(proposal.tag_proposal_id)}
                      disabled={submitting === proposal.tag_proposal_id}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
                {proposal.linked_products.length > 0 && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Suggested products
                    </p>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {proposal.linked_products.map(product => (
                        <div
                          key={product.supplier_product_id}
                          className="rounded border bg-background p-2 text-xs space-y-1"
                        >
                          <div className="font-mono truncate">
                            {product.supplier_product_id}
                          </div>
                          {product.confidence != null && (
                            <div>
                              Confidence: {(product.confidence * 100).toFixed(1)}%
                            </div>
                          )}
                          {product.provider && (
                            <div className="text-muted-foreground">Provider: {product.provider}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
})









