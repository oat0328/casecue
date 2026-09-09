import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusBadge = {
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-600" },
};

export default function PurchasesTable({ purchases }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Buyer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((p) => {
            const badge = statusBadge[p.status] ?? statusBadge.pending;
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.buyerEmail || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.productName || "Founding Teacher"}</TableCell>
                <TableCell>${Number(p.amount ?? 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(p.paidAt || p.created_date) ? new Date(p.paidAt || p.created_date).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}