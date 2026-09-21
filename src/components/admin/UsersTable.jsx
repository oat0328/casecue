import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const planBadge = {
  founding_teacher: { label: "Founding Teacher", className: "bg-emerald-100 text-emerald-700" },
  trial: { label: "Trial", className: "bg-amber-100 text-amber-700" },
  free: { label: "Free", className: "bg-gray-100 text-gray-600" },
};

export default function UsersTable({ users }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const badge = planBadge[u.plan] ?? planBadge.free;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.created_date ? new Date(u.created_date).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}