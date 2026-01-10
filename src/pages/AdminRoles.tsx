import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

type AppRole = "guest" | "host" | "staff" | "admin";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

type RoleRow = {
  user_id: string;
  role: AppRole;
  created_at: string;
};

const fetchProfiles = async (): Promise<ProfileRow[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProfileRow[];
};

const fetchRoles = async (): Promise<RoleRow[]> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RoleRow[];
};

export default function AdminRoles() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");

  const {
    data: profiles = [],
    isLoading: profilesLoading,
    isError: profilesError,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ["profiles", "admin-roles"],
    queryFn: fetchProfiles,
  });

  const {
    data: roleRows = [],
    isLoading: rolesLoading,
    isError: rolesError,
    refetch: refetchRoles,
  } = useQuery({
    queryKey: ["user_roles", "admin-roles"],
    queryFn: fetchRoles,
  });

  const rolesByUserId = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const r of roleRows) {
      const list = map.get(r.user_id) ?? [];
      list.push(r.role);
      map.set(r.user_id, list);
    }
    return map;
  }, [roleRows]);

  const combined = useMemo(() => {
    const lower = search.trim().toLowerCase();

    return profiles
      .map((p) => ({
        ...p,
        roles: (rolesByUserId.get(p.user_id) ?? []).sort(),
      }))
      .filter((p) => {
        if (!lower) return true;
        return (
          (p.full_name ?? "").toLowerCase().includes(lower) ||
          (p.phone ?? "").toLowerCase().includes(lower) ||
          p.user_id.toLowerCase().includes(lower)
        );
      });
  }, [profiles, rolesByUserId, search]);

  const assignRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;

      toast({ title: "Role assigned", description: `${role} added.` });
      await refetchRoles();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn’t assign role",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const ok = window.confirm(`Remove role '${role}' from this user?`);
      if (!ok) return;

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      toast({ title: "Role removed", description: `${role} removed.` });
      await refetchRoles();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn’t remove role",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      toast({ title: t("actions.copied"), description: t("actions.copiedUserId") });
    } catch {
      toast({
        variant: "destructive",
        title: t("actions.couldNotCopy"),
        description: t("actions.clipboardBlocked"),
      });
    }
  };

  const loading = profilesLoading || rolesLoading;
  const isError = profilesError || rolesError;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Manage Roles</h1>
            <p className="text-muted-foreground">
              Assign or remove roles by user id. (Email lookup is not available on the client.)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await refetchProfiles();
              await refetchRoles();
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Users</h2>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, or user id"
                className="md:max-w-sm"
              />
            </div>

            {loading ? (
              <div className="py-10 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : isError ? (
              <p className="text-muted-foreground">Couldn’t load users/roles (check RLS policies).</p>
            ) : combined.length === 0 ? (
              <p className="text-muted-foreground">No users found.</p>
            ) : (
              <div className="space-y-3">
                {combined.map((p) => (
                  <div
                    key={p.user_id}
                    className="rounded-lg border border-border p-4 flex flex-col gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{p.full_name || "(no name)"}</p>
                          <p className="text-sm text-muted-foreground break-all">user: {p.user_id}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => copyUserId(p.user_id)}>
                          {t("actions.copyUserId")}
                        </Button>
                      </div>
                      {p.phone ? (
                        <p className="text-sm text-muted-foreground">phone: {p.phone}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(p.roles.length ? p.roles : ["guest"]).map((r) => (
                        <span
                          key={`${p.user_id}-${r}`}
                          className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => assignRole(p.user_id, "host")}
                        disabled={p.roles.includes("host")}
                      >
                        Add host
                      </Button>
                      <Button variant="outline" onClick={() => assignRole(p.user_id, "staff")}
                        disabled={p.roles.includes("staff")}
                      >
                        Add staff
                      </Button>
                      <Button variant="outline" onClick={() => assignRole(p.user_id, "admin")}
                        disabled={p.roles.includes("admin")}
                      >
                        Add admin
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => removeRole(p.user_id, "host")}
                        disabled={!p.roles.includes("host")}
                      >
                        Remove host
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => removeRole(p.user_id, "staff")}
                        disabled={!p.roles.includes("staff")}
                      >
                        Remove staff
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => removeRole(p.user_id, "admin")}
                        disabled={!p.roles.includes("admin")}
                      >
                        Remove admin
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
