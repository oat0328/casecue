import React, { useRef } from "react";
import { CalendarPlus, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  googleCalendarUrl,
  icsFileContent,
  meetingDetailsText,
} from "@/lib/calendarLinks";

// "Add to Calendar" — a manual, free alternative to automatic calendar sync.
const DUPLICATE_WINDOW_MS = 45000;

export default function AddToCalendar({ meeting, student, compact = false }) {
  const { toast } = useToast();
  const lastDownload = useRef({});

  const openGoogle = () => {
    window.open(googleCalendarUrl(meeting, student), "_blank");
  };

  const downloadIcs = () => {
    const content = icsFileContent(meeting, student);
    if (!content) {
      toast({ title: "No meeting date set", variant: "destructive" });
      return;
    }
    const last = lastDownload.current[meeting.id] || 0;
    if (Date.now() - last < DUPLICATE_WINDOW_MS) {
      toast({
        title: "Calendar file already downloaded",
        description: "The .ics file for this meeting was just saved — check your downloads folder.",
      });
      return;
    }
    lastDownload.current[meeting.id] = Date.now();
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "casecue-meeting.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(meetingDetailsText(meeting, student));
      toast({ title: "Meeting details copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary">
          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
          {!compact && "Add to Calendar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={openGoogle}>
          <CalendarPlus className="h-4 w-4 mr-2" /> Add to Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadIcs}>
          <Download className="h-4 w-4 mr-2" /> Download Calendar Event (.ics)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyDetails}>
          <Copy className="h-4 w-4 mr-2" /> Copy Meeting Details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}