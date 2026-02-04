import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, MessageSquare, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type TicketLog = {
  id: string;
  ticket_id: string;
  user_id: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

interface TicketActivityLogsProps {
  ticketId?: string;
  limit?: number;
  showTicketInfo?: boolean;
}

export function TicketActivityLogs({ ticketId, limit = 50, showTicketInfo = false }: TicketActivityLogsProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ticket_logs", ticketId],
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
        query = query.eq("ticket_id", ticketId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching ticket logs:", error);
        return [];
      }

      // Fetch user profiles for logs
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        return (data || []).map(log => ({
          ...log,
          user_profile: log.user_id ? profileMap.get(log.user_id) : null,
        })) as TicketLog[];
      }

      return (data || []) as TicketLog[];
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
        .eq("id", ticketId)
        .single();

      if (error) return null;
      return data;
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
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300";
      default:
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
    }
  };

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
              ? `Activity for ticket: ${ticketInfo.subject}`
              : "Recent ticket activity"
            : "All ticket activity across the system"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0">
                  <div className={`mt-1 p-2 rounded-full ${getActionColor(log.action_type)} flex items-center justify-center shrink-0`}>
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {log.message || log.action_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.user_profile?.full_name || log.user_profile?.email || "System"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {(log.old_value || log.new_value) && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {log.old_value && (
                          <Badge variant="outline" className="font-mono">
                            {log.old_value}
                          </Badge>
                        )}
                        {log.old_value && log.new_value && <span>→</span>}
                        {log.new_value && (
                          <Badge variant="outline" className="font-mono">
                            {log.new_value}
                          </Badge>
                        )}
                      </div>
                    )}
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
