import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Project } from "@shared/schema";

type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  } | null;
};

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("translator");

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", id, "members"],
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      // This is a simplified version - in production, you'd look up the user by email first
      return await apiRequest("POST", `/api/projects/${id}/members`, {
        userId: data.email, // Placeholder - should be actual user ID
        role: data.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "members"] });
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      setEmail("");
      setRole("translator");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "members"] });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-primary text-primary-foreground";
      case "developer":
        return "bg-chart-1 text-white";
      case "translator":
        return "bg-chart-3 text-white";
      case "reviewer":
        return "bg-chart-4 text-white";
      default:
        return "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Project Settings</h1>
        <p className="text-muted-foreground">{project?.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Manage who has access to this project and their roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Member Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-medium">Add Team Member</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-member-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" data-testid="select-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="translator">Translator</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => addMemberMutation.mutate({ email, role })}
              disabled={!email || addMemberMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-add-member"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="font-medium">Current Members</h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.user?.profileImageUrl} />
                      <AvatarFallback>
                        {member.user?.firstName?.[0] || member.user?.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.firstName && member.user?.lastName
                          ? `${member.user.firstName} ${member.user.lastName}`
                          : member.user?.email || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={getRoleBadgeColor(member.role)}
                      data-testid={`badge-role-${member.id}`}
                    >
                      {member.role}
                    </Badge>
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No team members yet. Add your first team member above.
                </p>
              )}
            </div>
          </div>

          {/* Role Descriptions */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-medium">Role Permissions</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Developer</span>
                <span>Full access to keys and translations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Translator</span>
                <span>Can create and edit translations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviewer</span>
                <span>View-only access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
