import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const statusBadge = {
  new: { label: "New", className: "bg-sky-100 text-sky-700" },
  contacted: { label: "Contacted", className: "bg-amber-100 text-amber-700" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-600" },
};

export default function DemoRequestsTable({ requests }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => {
            const badge = statusBadge[r.status] ?? statusBadge.new;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  {r.role && <div className="text-xs text-muted-foreground">{r.role}</div>}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell className="text-muted-foreground">{r.organization || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.created_date ? new Date(r.created_date).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}