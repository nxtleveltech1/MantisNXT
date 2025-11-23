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

interface LinkedProduct {
  supplier_product_id: string;
  confidence?: number;
  reasoning?: string;
  provider?: string;
  status?: string;
  updated_at?: string;
}

interface ProposedCategory {
  proposed_category_id: string;
  display_name: string;
  status: string;
  status_reason?: string;
  suggestion_count: number;
  last_confidence?: number;
  last_provider?: string;
  created_at: string;
  updated_at: string;
  linked_products: LinkedProduct[];
}

export const ProposedCategoriesPanel = memo(function ProposedCategoriesPanel() {
  const [proposals, setProposals] = useState<ProposedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/category/ai-categorization/proposals");
      const data = await res.json();
      if (data.success) {
        setProposals(data.proposals);
      }
    } catch (error) {
      console.error("Failed to fetch proposals", error);
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
      const res = await fetch("/api/category/ai-categorization/proposals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposed_category_id: proposalId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Approval failed");
      }
      toast({
        title: "Proposal approved",
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
    const confirm = window.confirm("Reject this proposed category? Products will return to pending.");
    if (!confirm) return;
    setSubmitting(proposalId);
    try {
      const res = await fetch("/api/category/ai-categorization/proposals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposed_category_id: proposalId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Rejection failed");
      }
      toast({
        title: "Proposal rejected",
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
        <CardTitle>AI Proposed Categories</CardTitle>
        <CardDescription>
          Review and approve or reject categories the AI suggested when no existing match was found.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading proposals…</p>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending proposals.</p>
        ) : (
          <div className="space-y-3">
            {proposals.map(proposal => (
              <div
                key={proposal.proposed_category_id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{proposal.display_name}</span>
                      <Badge variant="secondary">
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
                      onClick={() => handleReject(proposal.proposed_category_id)}
                      disabled={submitting === proposal.proposed_category_id}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(proposal.proposed_category_id)}
                      disabled={submitting === proposal.proposed_category_id}
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

