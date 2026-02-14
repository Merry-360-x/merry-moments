import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, User, MessageSquare, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type TicketLog = {
  id: string;
  ticket_id: string;
  user_id: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
  ticket?: {
    id: string;
    subject: string;
    category: string | null;
    status: string;
  } | null;
};

type TicketLogRow = Omit<TicketLog, "user_profile" | "ticket">;
type ProfileRow = { user_id: string; full_name: string | null; email: string | null };
type TicketSummary = { id: string; subject: string; category: string | null; status: string };
type TicketInfo = { id: string; subject: string; status: string };
type ActivityFilter = "all" | "status" | "priority" | "responses";

const ACTIVITY_FILTER_STORAGE_KEY = "ticket_activity_filter";

function isActivityFilter(value: string | null): value is ActivityFilter {
  return value === "all" || value === "status" || value === "priority" || value === "responses";
}

interface TicketActivityLogsProps {
  ticketId?: string;
  limit?: number;
  showTicketInfo?: boolean;
  filterStorageKey?: string;
}

export function TicketActivityLogs({
  ticketId,
  limit = 50,
  showTicketInfo = false,
  filterStorageKey = ACTIVITY_FILTER_STORAGE_KEY,
}: TicketActivityLogsProps) {
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(() => {
    if (typeof window === "undefined") return "all";
    const stored = window.localStorage.getItem(filterStorageKey);
    return isActivityFilter(stored) ? stored : "all";
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ticket_logs", ticketId, limit],
    queryFn: async () => {
      let query = supabase
        .from("support_ticket_logs")
        .select(`
          id,
          ticket_id,
          user_id,
          action_type,
          old_value,
          new_value,
          message,
          metadata,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (ticketId) {
        query = query.filter("ticket_id", "eq", ticketId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching ticket logs:", error);
        return [];
      }

      const entries = ((data || []) as unknown) as TicketLogRow[];

      // Fetch user profiles for logs
      const userIds = [...new Set(entries.map(log => log.user_id).filter(Boolean))];
      const ticketIds = [...new Set(entries.map(log => log.ticket_id).filter(Boolean))];

      let profileMap = new Map<string, ProfileRow>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds as never);

        const safeProfiles = ((profiles || []) as unknown) as ProfileRow[];
        profileMap = new Map(safeProfiles.map((profile) => [profile.user_id, profile]));
      }

      let ticketMap = new Map<string, TicketSummary>();

      if (ticketIds.length > 0) {
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("id, subject, category, status")
          .in("id", ticketIds as never);

        const safeTickets = ((tickets || []) as unknown) as TicketSummary[];
        ticketMap = new Map(safeTickets.map((ticket) => [ticket.id, ticket]));
      }

      return entries.map((log) => ({
        ...log,
        user_profile: log.user_id ? profileMap.get(log.user_id) : null,
        ticket: ticketMap.get(log.ticket_id) || null,
      })) as TicketLog[];
    },
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch ticket info if needed
  const { data: ticketInfo } = useQuery({
    queryKey: ["ticket_info", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, status")
        .filter("id", "eq", ticketId)
        .single();

      if (error) return null;
      return (data as unknown) as TicketInfo;
    },
    enabled: showTicketInfo && !!ticketId,
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "created":
        return <MessageSquare className="h-4 w-4" />;
      case "status_changed":
        return <AlertCircle className="h-4 w-4" />;
      case "response_added":
        return <User className="h-4 w-4" />;
      case "priority_changed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "created":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
      case "status_changed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
      case "response_added":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
      case "priority_changed":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300";
      default:
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
    }
  };

  const humanizeValue = (value: string | null | undefined) => {
    if (!value) return "Not set";
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getActionTitle = (log: TicketLog) => {
    switch (log.action_type) {
      case "created":
        return "Ticket Created";
      case "status_changed":
        return `Status Updated: ${humanizeValue(log.old_value)} → ${humanizeValue(log.new_value)}`;
      case "priority_changed":
        return `Priority Updated: ${humanizeValue(log.old_value)} → ${humanizeValue(log.new_value)}`;
      case "response_added":
        return "Staff Response Added";
      case "message_added":
        return "New Message Added";
      case "assigned":
        return "Ticket Assignment Updated";
      case "closed":
        return "Ticket Closed";
      case "reopened":
        return "Ticket Reopened";
      default:
        return humanizeValue(log.action_type);
    }
  };

  const getActionDetails = (log: TicketLog) => {
    if (log.message) return log.message;

    if (log.action_type === "status_changed") {
      return `Status changed from ${humanizeValue(log.old_value)} to ${humanizeValue(log.new_value)}.`;
    }

    if (log.action_type === "priority_changed") {
      return `Priority changed from ${humanizeValue(log.old_value)} to ${humanizeValue(log.new_value)}.`;
    }

    return "Activity recorded.";
  };

  const getActorLabel = (log: TicketLog) => {
    if (log.user_profile?.full_name) return log.user_profile.full_name;
    if (log.user_profile?.email) return log.user_profile.email;
    if (log.user_id) return `User ${log.user_id.slice(0, 8)}...`;
    return "System";
  };

  const filteredLogs = useMemo(() => {
    if (activityFilter === "all") return logs;

    if (activityFilter === "status") {
      return logs.filter((log) => ["status_changed", "closed", "reopened"].includes(log.action_type));
    }

    if (activityFilter === "priority") {
      return logs.filter((log) => log.action_type === "priority_changed");
    }

    return logs.filter((log) => ["response_added", "message_added"].includes(log.action_type));
  }, [logs, activityFilter]);

  const filterCounts = useMemo(
    () => ({
      all: logs.length,
      status: logs.filter((log) => ["status_changed", "closed", "reopened"].includes(log.action_type)).length,
      priority: logs.filter((log) => log.action_type === "priority_changed").length,
      responses: logs.filter((log) => ["response_added", "message_added"].includes(log.action_type)).length,
    }),
    [logs]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(filterStorageKey);
    if (isActivityFilter(stored)) {
      setActivityFilter(stored);
      return;
    }
    setActivityFilter("all");
  }, [filterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(filterStorageKey, activityFilter);
  }, [activityFilter, filterStorageKey]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Loading ticket activity...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          {ticketId 
            ? showTicketInfo && ticketInfo 
              ? `Detailed timeline for ticket: ${ticketInfo.subject}`
              : "Detailed timeline for recent ticket activity"
            : "Detailed timeline of support ticket activity across the system"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant={activityFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("all")}>All ({filterCounts.all})</Button>
          <Button variant={activityFilter === "status" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("status")}>Status ({filterCounts.status})</Button>
          <Button variant={activityFilter === "priority" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("priority")}>Priority ({filterCounts.priority})</Button>
          <Button variant={activityFilter === "responses" ? "default" : "outline"} size="sm" onClick={() => setActivityFilter("responses")}>Responses ({filterCounts.responses})</Button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity recorded yet</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No logs match this filter</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0">
                  <div className={`mt-1 p-2 rounded-full ${getActionColor(log.action_type)} flex items-center justify-center shrink-0`}>
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{getActionTitle(log)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getActionDetails(log)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {getActorLabel(log)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {!ticketId && log.ticket && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{log.ticket.subject}</Badge>
                        {log.ticket.category && <Badge variant="outline">{humanizeValue(log.ticket.category)}</Badge>}
                        <Badge variant="outline">Current Status: {humanizeValue(log.ticket.status)}</Badge>
                      </div>
                    )}

                    {(log.old_value || log.new_value) && (
                      <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                        {log.old_value && (
                          <Badge variant="outline">
                            Before: {humanizeValue(log.old_value)}
                          </Badge>
                        )}
                        {log.old_value && log.new_value && <span>→</span>}
                        {log.new_value && (
                          <Badge variant="outline">
                            After: {humanizeValue(log.new_value)}
                          </Badge>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground mt-2">
                      {format(new Date(log.created_at), "PPpp")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
