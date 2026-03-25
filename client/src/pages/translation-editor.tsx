import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Loader2, Search, Check, X, History, Plus, ArrowLeftRight, Filter, Languages, ArrowLeft, FolderTree, List, Tag, ArrowUp, HelpCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { buildKeyTree, filterTree, getKeysInFolder } from "@/lib/keyTreeUtils";
import { KeyFolderView } from "@/components/KeyFolderTree";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTranslationKeySchema } from "@shared/schema";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import type {
  ProjectLanguage,
  TranslationKey,
  Translation,
  TranslationMemory,
  TranslationStatus,
} from "@shared/schema";
import { getNextStatuses } from "@shared/schema";

interface TranslationData {
  [keyId: string]: {
    [languageId: string]: {
      id?: string;
      value: string;
      status: string;
    };
  };
}

const statusColors = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  in_review: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  normal: "",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/30",
};

const priorityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  normal: "Normal",
  low: "Low",
};

function PriorityBadge({ priority }: { priority: string }) {
  if (!priority || priority === "normal") return null;
  return (
    <Badge
      variant="outline"
      className={priorityColors[priority] || ""}
      data-testid={`badge-priority-${priority}`}
    >
      {priorityLabels[priority] || priority}
    </Badge>
  );
}

function HighlightedText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(/(\{\{[^}]+\}\})/g); // Adjusted regex to capture the full placeholder including brackets

  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) { // Check the full placeholder token
          return (
            <Badge
              key={index}
              variant="outline"
              className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs font-mono px-1 py-0"
              data-testid={`badge-placeholder-${index}`}
            >
              {part}
            </Badge>
          );
        }
        return (
          <span key={index} className="text-sm">
            {part}
          </span>
        );
      })}
    </div>
  );
}

function TranslationCell({
  keyId,
  translationKey,
  language,
  translationData,
  sourceText,
  onUpdate,
  onSave,
  onAISuggest,
  onStatusChange,
  isDefault,
  isSaving,
  isSuggesting,
}: {
  keyId: string;
  translationKey: TranslationKey;
  language: ProjectLanguage;
  translationData: TranslationData;
  sourceText?: string;
  onUpdate: (keyId: string, languageId: string, value: string) => void;
  onSave: (keyId: string, languageId: string) => Promise<void>;
  onAISuggest: (keyId: string, languageId: string) => void;
  onStatusChange: (keyId: string, languageId: string, newStatus: TranslationStatus) => Promise<void>;
  isDefault: boolean;
  isSaving: boolean;
  isSuggesting: boolean;
}) {
  const { t } = useTranslation("editor");
  const { t: tc } = useTranslation("common");
  const [isEditing, setIsEditing] = useState(false);
  const [originalValue, setOriginalValue] = useState("");
  const [memorySuggestion, setMemorySuggestion] = useState<TranslationMemory | null>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const translationInfo = translationData[keyId]?.[language.id];
  const value = translationInfo?.value || "";
  const status = translationInfo?.status || "draft";
  const hasValue = value.trim().length > 0;

  const handleEditStart = async () => {
    setOriginalValue(value);
    setIsEditing(true);
    
    // Check for translation memory suggestion if not default language and has source text
    if (!isDefault && sourceText && sourceText.trim()) {
      setIsLoadingMemory(true);
      try {
        const params = new URLSearchParams({
          sourceText: sourceText,
          targetLanguageCode: language.languageCode,
        });
        const response = await fetch(`/api/translation-memory/suggest?${params}`);
        if (response.ok) {
          const suggestion = await response.json();
          if (suggestion) {
            setMemorySuggestion(suggestion);
          }
        }
      } catch (error) {
        console.error("Error fetching translation memory:", error);
      } finally {
        setIsLoadingMemory(false);
      }
    }
  };

  const handleApplyMemory = () => {
    if (memorySuggestion) {
      onUpdate(keyId, language.id, memorySuggestion.translatedText);
    }
  };

  const handleCancel = () => {
    onUpdate(keyId, language.id, originalValue);
    setIsEditing(false);
    setMemorySuggestion(null);
  };

  const handleSaveClick = async () => {
    await onSave(keyId, language.id);
    setIsEditing(false);
    setMemorySuggestion(null);
  };

  const maxLength = translationKey.maxLength;
  const currentLength = value.length;
  const charLimitRatio = maxLength ? currentLength / maxLength : 0;
  const isApproachingLimit = maxLength ? charLimitRatio > 0.8 && charLimitRatio <= 1 : false;
  const isExceedingLimit = maxLength ? charLimitRatio > 1 : false;

  const charCountColor = isExceedingLimit
    ? "text-destructive"
    : isApproachingLimit
      ? "text-yellow-500"
      : "text-muted-foreground";

  return (
    <div className="min-w-64">
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onUpdate(keyId, language.id, e.target.value)}
            placeholder={t("translationPlaceholder")}
            autoFocus
            rows={1}
            data-testid={`input-translation-${keyId}-${language.id}`}
          />
          {maxLength && (
            <div
              className={`text-xs font-mono ${charCountColor}`}
              data-testid={`char-count-${keyId}-${language.id}`}
            >
              {currentLength}/{maxLength}
            </div>
          )}
          {memorySuggestion && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-chart-1/10 border border-chart-1/30">
              <History className="h-3.5 w-3.5 text-chart-1" />
              <span className="text-xs text-muted-foreground flex-1">
                {t("translationMemory")} <span className="text-foreground">{memorySuggestion.translatedText}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleApplyMemory}
                data-testid={`button-apply-memory-${keyId}-${language.id}`}
              >
                {tc("actions.apply")}
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={statusColors[status as keyof typeof statusColors]}
            >
              {tc("status." + status)}
            </Badge>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              data-testid={`button-cancel-${keyId}-${language.id}`}
            >
              {tc("actions.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaving}
              data-testid={`button-save-${keyId}-${language.id}`}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-2" />
              )}
              {tc("actions.save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            onClick={handleEditStart}
            className="cursor-text min-h-12 flex items-center p-2 rounded-md hover-elevate"
            data-testid={`text-translation-${keyId}-${language.id}`}
          >
            {hasValue ? (
              <HighlightedText text={value} />
            ) : (
              <span className="text-sm text-destructive">Empty</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge
              variant="outline"
              className={statusColors[status as keyof typeof statusColors]}
              data-testid={`badge-status-${keyId}-${language.id}`}
            >
              {tc("status." + status)}
            </Badge>
            {hasValue && getNextStatuses(status).map((nextStatus) => (
              <Button
                key={nextStatus}
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => onStatusChange(keyId, language.id, nextStatus)}
                disabled={isSaving}
                data-testid={`button-transition-${nextStatus}-${keyId}-${language.id}`}
              >
                {tc("transition." + status + "-" + nextStatus)}
              </Button>
            ))}
            {maxLength && hasValue && (
              <span
                className={`text-xs font-mono ${charCountColor}`}
                data-testid={`char-count-${keyId}-${language.id}`}
              >
                {currentLength}/{maxLength}
              </span>
            )}
            <div className="flex-1" />
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAISuggest(keyId, language.id)}
                disabled={isSuggesting}
                data-testid={`button-ai-suggest-${keyId}-${language.id}`}
              >
                {isSuggesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowVisual() {
  const { t: tc } = useTranslation("common");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-workflow-help">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-5" align="end">
        <h4 className="font-semibold text-sm mb-1">Translation Workflow</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Each translation moves through these stages
        </p>

        {/* SVG workflow diagram */}
        <svg viewBox="0 0 380 170" className="w-full" aria-label="Workflow diagram">
          {/* Forward path arrows */}
          <line x1="95" y1="40" x2="135" y2="40" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="245" y1="40" x2="285" y2="40" stroke="currentColor" className="text-muted-foreground" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Return path: In Review -> Draft (curved below) */}
          <path d="M 170 58 C 170 90, 50 90, 50 58" fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#arrow-sm)" />

          {/* Return path: Approved -> Draft (curved further below) */}
          <path d="M 320 58 C 320 120, 50 120, 50 58" fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#arrow-sm)" />

          {/* State boxes */}
          <rect x="5" y="22" width="90" height="36" rx="8" className="fill-slate-500/10 stroke-slate-500/20" strokeWidth="1" />
          <text x="50" y="45" textAnchor="middle" className="fill-slate-400 text-[12px] font-semibold">{tc("status.draft")}</text>

          <rect x="140" y="22" width="100" height="36" rx="8" className="fill-chart-3/10 stroke-chart-3/20" strokeWidth="1" />
          <text x="190" y="45" textAnchor="middle" className="fill-chart-3 text-[12px] font-semibold">{tc("status.in_review")}</text>

          <rect x="290" y="22" width="85" height="36" rx="8" className="fill-chart-2/10 stroke-chart-2/20" strokeWidth="1" />
          <text x="332" y="45" textAnchor="middle" className="fill-chart-2 text-[12px] font-semibold">{tc("status.approved")}</text>

          {/* Forward labels */}
          <text x="115" y="33" textAnchor="middle" className="fill-muted-foreground text-[9px]">{tc("transition.draft-in_review")}</text>
          <text x="265" y="33" textAnchor="middle" className="fill-muted-foreground text-[9px]">{tc("transition.in_review-approved")}</text>

          {/* Return labels */}
          <text x="110" y="98" textAnchor="middle" className="fill-muted-foreground text-[9px]">{tc("transition.in_review-draft")}</text>
          <text x="185" y="128" textAnchor="middle" className="fill-muted-foreground text-[9px]">{tc("transition.approved-draft")}</text>

          {/* Arrow markers */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
            </marker>
            <marker id="arrow-sm" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
            </marker>
          </defs>
        </svg>

        {/* Descriptions */}
        <div className="border-t mt-3 pt-3 grid gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${statusColors.draft} text-[10px] shrink-0`}>{tc("status.draft")}</Badge>
            <span className="text-muted-foreground">Translation is being written or needs changes</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${statusColors.in_review} text-[10px] shrink-0`}>{tc("status.in_review")}</Badge>
            <span className="text-muted-foreground">Submitted and waiting for reviewer approval</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${statusColors.approved} text-[10px] shrink-0`}>{tc("status.approved")}</Badge>
            <span className="text-muted-foreground">Approved and ready for production use</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const addKeyFormSchema = insertTranslationKeySchema.extend({
  projectId: z.string(),
});

type AddKeyFormData = z.infer<typeof addKeyFormSchema>;

interface FindReplaceMatch {
  translationId: string;
  keyName: string;
  languageCode: string;
  oldValue: string;
  newValue: string;
}

function FindReplaceDialog({
  projectId,
  languages,
  onComplete,
}: {
  projectId: string;
  languages: ProjectLanguage[] | undefined;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const { t: tc } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [matches, setMatches] = useState<FindReplaceMatch[]>([]);
  const [hasPreview, setHasPreview] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const resetState = () => {
    setFindText("");
    setReplaceText("");
    setCaseSensitive(false);
    setLanguageFilter("all");
    setMatches([]);
    setHasPreview(false);
  };

  const handlePreview = async () => {
    if (!findText.trim()) return;
    setIsPreviewing(true);
    setHasPreview(false);
    try {
      const body: Record<string, unknown> = {
        find: findText,
        replace: replaceText,
        caseSensitive,
      };
      if (languageFilter !== "all") {
        body.languageId = languageFilter;
      }
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/find-preview`,
        body,
      );
      const data: FindReplaceMatch[] = await response.json();
      setMatches(data);
      setHasPreview(true);
    } catch (error) {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description:
          error instanceof Error
            ? error.message
            : "Failed to preview find & replace",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleReplace = async () => {
    if (!findText.trim()) return;
    setIsReplacing(true);
    try {
      const body: Record<string, unknown> = {
        find: findText,
        replace: replaceText,
        caseSensitive,
      };
      if (languageFilter !== "all") {
        body.languageId = languageFilter;
      }
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/find-replace`,
        body,
      );
      const data = await response.json();
      toast({
        title: "Find & Replace Complete",
        description: `${data.updated} translation(s) updated`,
      });
      onComplete();
      setOpen(false);
      resetState();
    } catch (error) {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description:
          error instanceof Error
            ? error.message
            : "Failed to execute find & replace",
        variant: "destructive",
      });
    } finally {
      setIsReplacing(false);
    }
  };

  const highlightMatch = (text: string, find: string, isCaseSensitive: boolean) => {
    if (!find) return <span>{text}</span>;
    const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedFind})`, isCaseSensitive ? "g" : "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = isCaseSensitive
            ? part === find
            : part.toLowerCase() === find.toLowerCase();
          return isMatch ? (
            <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-find-replace">
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Find & Replace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Find & Replace</DialogTitle>
          <DialogDescription>
            Search and replace text across all translations in this project
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="find-text">Find</Label>
              <Input
                id="find-text"
                placeholder="Text to find..."
                value={findText}
                onChange={(e) => {
                  setFindText(e.target.value);
                  setHasPreview(false);
                }}
                data-testid="input-find"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-text">Replace with</Label>
              <Input
                id="replace-text"
                placeholder="Replacement text..."
                value={replaceText}
                onChange={(e) => {
                  setReplaceText(e.target.value);
                  setHasPreview(false);
                }}
                data-testid="input-replace"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={(checked) => {
                  setCaseSensitive(checked === true);
                  setHasPreview(false);
                }}
                data-testid="checkbox-case-sensitive"
              />
              <Label htmlFor="case-sensitive" className="text-sm cursor-pointer">
                Case sensitive
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="language-filter" className="text-sm whitespace-nowrap">
                Language
              </Label>
              <Select
                value={languageFilter}
                onValueChange={(val) => {
                  setLanguageFilter(val);
                  setHasPreview(false);
                }}
              >
                <SelectTrigger className="w-48" data-testid="select-language-filter">
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {languages?.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.languageName} ({lang.languageCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePreview}
              disabled={!findText.trim() || isPreviewing}
              variant="secondary"
              data-testid="button-preview"
            >
              {isPreviewing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Preview
            </Button>
            <Button
              onClick={handleReplace}
              disabled={!hasPreview || matches.length === 0 || isReplacing}
              data-testid="button-replace-all"
            >
              {isReplacing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowLeftRight className="h-4 w-4 mr-2" />
              )}
              Replace All
            </Button>
            {hasPreview && (
              <span className="text-sm text-muted-foreground ml-2">
                {matches.length} match{matches.length !== 1 ? "es" : ""} found
                {matches.length >= 100 ? " (showing first 100)" : ""}
              </span>
            )}
          </div>
          {hasPreview && matches.length > 0 && (
            <ScrollArea className="flex-1 border rounded-md min-h-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Key</TableHead>
                    <TableHead className="w-20">Language</TableHead>
                    <TableHead>Old Value</TableHead>
                    <TableHead>New Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.translationId}>
                      <TableCell className="font-mono text-xs align-top">
                        {match.keyName}
                      </TableCell>
                      <TableCell className="font-mono text-xs align-top">
                        {match.languageCode}
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        {highlightMatch(match.oldValue, findText, caseSensitive)}
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        {match.newValue}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {hasPreview && matches.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No matches found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TranslationEditor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useTranslation("editor");
  const { t: tc } = useTranslation("common");
  const queryClient = useQueryClient();
  const [translationData, setTranslationData] = useState<TranslationData>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [suggestingStates, setSuggestingStates] = useState<
    Record<string, boolean>
  >({});
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [isAddKeyDialogOpen, setIsAddKeyDialogOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isPreTranslateDialogOpen, setIsPreTranslateDialogOpen] = useState(false);
  const [preTranslateLanguageId, setPreTranslateLanguageId] = useState<string>("");
  const [isPreTranslating, setIsPreTranslating] = useState(false);
  const [preTranslateProgress, setPreTranslateProgress] = useState<{ translated: number; skipped: number; errors: number } | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "folder">("folder");
  const [selectedKeyId, setSelectedKeyId] = useState<string | undefined>();
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | undefined>();
  const [visibleCount, setVisibleCount] = useState(500);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const onScroll = () => setShowScrollTop(main.scrollTop > 300);
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  const handleScrollToTop = useCallback(() => {
    const main = document.querySelector("main");
    main?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addKeyForm = useForm<AddKeyFormData>({
    resolver: zodResolver(addKeyFormSchema),
    defaultValues: {
      projectId: id,
      key: "",
      description: "",
      maxLength: undefined,
      priority: "normal",
    },
  });

  const { data: languages } = useQuery<ProjectLanguage[]>({
    queryKey: ["/api/projects", id, "languages"],
  });

  // Sort languages: default language first, then the rest
  const sortedLanguages = useMemo(() => {
    if (!languages) return undefined;
    return [...languages].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
  }, [languages]);

  const { data: keys, isLoading: keysLoading } = useQuery<TranslationKey[]>({
    queryKey: ["/api/projects", id, "keys"],
  });

  const { data: translations } = useQuery<Translation[]>({
    queryKey: ["/api/projects", id, "translations"],
    enabled: !!id,
  });

  useEffect(() => {
    if (translations) {
      const data: TranslationData = {};
      translations.forEach((t) => {
        if (!data[t.keyId]) data[t.keyId] = {};
        data[t.keyId][t.languageId] = {
          id: t.id,
          value: t.value,
          status: t.status,
        };
      });
      setTranslationData(data);
    }
  }, [translations]);

  const saveTranslation = useMutation({
    mutationFn: async (params: {
      keyId: string;
      languageId: string;
      value: string;
      status: string;
      translationId?: string;
    }) => {
      if (params.translationId) {
        return await apiRequest(
          "PATCH",
          `/api/translations/${params.translationId}`,
          {
            value: params.value,
            status: params.status,
          },
        );
      } else {
        return await apiRequest("POST", "/api/translations", {
          keyId: params.keyId,
          languageId: params.languageId,
          value: params.value,
          status: params.status,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "translations"],
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedSave"),
        variant: "destructive",
      });
    },
  });

  const suggestTranslation = useMutation({
    mutationFn: async (translationId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/translations/${translationId}/ai-suggest`,
        {},
      );
      return await response.json();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedSuggestion"),
        variant: "destructive",
      });
    },
  });

  const createKey = useMutation({
    mutationFn: async (data: AddKeyFormData) => {
      return await apiRequest("POST", "/api/translation-keys", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "keys"],
      });
      addKeyForm.reset();
      setIsAddKeyDialogOpen(false);
      toast({
        title: tc("toast.success"),
        description: t("toast.keyAdded"),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || t("toast.failedCreateKey"),
        variant: "destructive",
      });
    },
  });

  const handleAddKey = (data: AddKeyFormData) => {
    createKey.mutate(data);
  };

  const updateTranslation = (
    keyId: string,
    languageId: string,
    value: string,
  ) => {
    setTranslationData((prev) => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        [languageId]: {
          ...prev[keyId]?.[languageId],
          value,
        },
      },
    }));
  };

  const handleSave = async (keyId: string, languageId: string) => {
    const data = translationData[keyId]?.[languageId];
    const saveKey = `${keyId}-${languageId}`;
    setSavingStates((prev) => ({ ...prev, [saveKey]: true }));

    try {
      await saveTranslation.mutateAsync({
        keyId,
        languageId,
        value: data?.value || "",
        status: data?.status || "draft",
        translationId: data?.id,
      });
      toast({
        title: t("toast.saved"),
        description: t("toast.savedDesc"),
      });
    } finally {
      setSavingStates((prev) => ({ ...prev, [saveKey]: false }));
    }
  };

  const handleStatusChange = async (
    keyId: string,
    languageId: string,
    newStatus: TranslationStatus
  ) => {
    const data = translationData[keyId]?.[languageId];
    if (!data?.id) return;

    const saveKey = `${keyId}-${languageId}`;
    setSavingStates((prev) => ({ ...prev, [saveKey]: true }));

    try {
      await saveTranslation.mutateAsync({
        keyId,
        languageId,
        value: data.value,
        status: newStatus,
        translationId: data.id,
      });

      setTranslationData((prev) => ({
        ...prev,
        [keyId]: {
          ...prev[keyId],
          [languageId]: {
            ...prev[keyId]?.[languageId],
            status: newStatus,
          },
        },
      }));

      toast({
        title: t("toast.statusUpdated"),
        description: t("toast.statusUpdatedDesc", { status: tc("status." + newStatus) }),
      });
    } catch (error: any) {
      toast({
        title: t("toast.invalidTransition"),
        description: error?.message || t("toast.invalidTransitionDesc"),
        variant: "destructive",
      });
    } finally {
      setSavingStates((prev) => ({ ...prev, [saveKey]: false }));
    }
  };

  const handleAISuggest = async (keyId: string, languageId: string) => {
    const defaultLanguage = languages?.find((l) => l.isDefault);
    if (!defaultLanguage) {
      toast({
        title: tc("toast.error"),
        description: t("toast.noDefaultLanguage"),
        variant: "destructive",
      });
      return;
    }

    const sourceText = translationData[keyId]?.[defaultLanguage.id]?.value;
    if (!sourceText) {
      toast({
        title: t("toast.sourceRequired"),
        description: `Please add a translation in ${defaultLanguage.languageName} first`,
        variant: "destructive",
      });
      return;
    }

    const suggestKey = `${keyId}-${languageId}`;
    setSuggestingStates((prev) => ({ ...prev, [suggestKey]: true }));

    try {
      let translationId = translationData[keyId]?.[languageId]?.id;

      if (!translationId) {
        const response = await apiRequest("POST", "/api/translations", {
          keyId,
          languageId,
          value: "",
          status: "draft",
        });
        const newTranslation = await response.json();
        translationId = newTranslation.id;

        setTranslationData((prev) => ({
          ...prev,
          [keyId]: {
            ...prev[keyId],
            [languageId]: {
              id: translationId,
              value: "",
              status: "draft",
            },
          },
        }));
      }

      if (!translationId) {
        toast({
          title: tc("toast.error"),
          description: t("toast.failedCreateRecord"),
          variant: "destructive",
        });
        return;
      }

      const result = await suggestTranslation.mutateAsync(translationId);
      if (result.suggestion) {
        await saveTranslation.mutateAsync({
          keyId,
          languageId,
          value: result.suggestion,
          status: "in_review",
          translationId,
        });

        setTranslationData((prev) => ({
          ...prev,
          [keyId]: {
            ...prev[keyId],
            [languageId]: {
              ...prev[keyId]?.[languageId],
              value: result.suggestion,
              status: "in_review",
            },
          },
        }));

        toast({
          title: t("toast.aiApplied"),
          description: t("toast.aiAppliedDesc"),
        });
      }
    } catch (error) {
    } finally {
      setSuggestingStates((prev) => ({ ...prev, [suggestKey]: false }));
    }
  };

  const handleBulkTranslate = async () => {
    const defaultLanguage = languages?.find((l) => l.isDefault);
    if (!defaultLanguage) {
      toast({
        title: tc("toast.error"),
        description: t("toast.noDefaultLanguage"),
        variant: "destructive",
      });
      return;
    }

    const nonDefaultLanguages = languages?.filter((l) => !l.isDefault) || [];
    if (nonDefaultLanguages.length === 0) {
      toast({
        title: t("toast.noTargetLanguages"),
        description: t("toast.noTargetLanguagesDesc"),
        variant: "destructive",
      });
      return;
    }

    const selectedKeysList = Array.from(selectedKeys);
    const keysWithSource = selectedKeysList.filter((keyId) =>
      translationData[keyId]?.[defaultLanguage.id]?.value?.trim(),
    );

    if (keysWithSource.length === 0) {
      toast({
        title: t("toast.noSourceText"),
        description: `All selected keys need translations in ${defaultLanguage.languageName} first`,
        variant: "destructive",
      });
      return;
    }

    const totalTranslations =
      keysWithSource.length * nonDefaultLanguages.length;
    setIsBulkTranslating(true);
    setBulkProgress({ current: 0, total: totalTranslations });

    let completed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const keyId of keysWithSource) {
      for (const lang of nonDefaultLanguages) {
        try {
          const existingValue = translationData[keyId]?.[lang.id]?.value;

          if (existingValue && existingValue.trim()) {
            completed++;
            setBulkProgress({ current: completed, total: totalTranslations });
            continue;
          }

          let translationId = translationData[keyId]?.[lang.id]?.id;

          if (!translationId) {
            const response = await apiRequest("POST", "/api/translations", {
              keyId,
              languageId: lang.id,
              value: "",
              status: "draft",
            });
            const newTranslation = await response.json();
            translationId = newTranslation.id;

            setTranslationData((prev) => ({
              ...prev,
              [keyId]: {
                ...prev[keyId],
                [lang.id]: {
                  id: translationId,
                  value: "",
                  status: "draft",
                },
              },
            }));
          }

          if (translationId) {
            const result = await suggestTranslation.mutateAsync(translationId);
            if (result.suggestion) {
              await saveTranslation.mutateAsync({
                keyId,
                languageId: lang.id,
                value: result.suggestion,
                status: "in_review",
                translationId,
              });

              setTranslationData((prev) => ({
                ...prev,
                [keyId]: {
                  ...prev[keyId],
                  [lang.id]: {
                    ...prev[keyId]?.[lang.id],
                    value: result.suggestion,
                    status: "in_review",
                  },
                },
              }));

              succeeded++;
            }
          }
        } catch (error) {
          failed++;
        }

        completed++;
        setBulkProgress({ current: completed, total: totalTranslations });
      }
    }

    setIsBulkTranslating(false);
    setBulkProgress({ current: 0, total: 0 });

    queryClient.invalidateQueries({
      queryKey: ["/api/projects", id, "translations"],
    });

    toast({
      title: t("toast.bulkComplete"),
      description: `${succeeded} translations generated${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  };

  const handlePreTranslate = async () => {
    if (!preTranslateLanguageId) {
      toast({
        title: "Error",
        description: "Please select a target language",
        variant: "destructive",
      });
      return;
    }

    setIsPreTranslating(true);
    setPreTranslateProgress(null);

    try {
      const response = await apiRequest(
        "POST",
        `/api/projects/${id}/pre-translate`,
        { languageId: preTranslateLanguageId },
      );
      const result = await response.json();
      setPreTranslateProgress(result);

      queryClient.invalidateQueries({
        queryKey: ["/api/projects", id, "translations"],
      });

      toast({
        title: "Pre-translation Complete",
        description: `${result.translated} translated, ${result.skipped} skipped${result.errors > 0 ? `, ${result.errors} errors` : ""}`,
      });
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: tc("toast.unauthorized"),
          description: tc("toast.unauthorizedDesc"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: tc("toast.error"),
        description: error.message || "Failed to pre-translate",
        variant: "destructive",
      });
    } finally {
      setIsPreTranslating(false);
    }
  };

  const toggleKeySelection = (keyId: string) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const toggleAllKeys = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map((k) => k.id)));
    }
  };

  const filteredKeys =
    keys?.filter(
      (key) =>
        (key.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (priorityFilter === "all" || key.priority === priorityFilter),
    ) || [];

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(500);
  }, [searchQuery, priorityFilter]);

  // Build folder tree structure
  const keyTree = useMemo(() => {
    if (!keys) return [];
    const tree = buildKeyTree(keys);
    if (searchQuery.trim()) {
      return filterTree(tree, searchQuery);
    }
    return tree;
  }, [keys, searchQuery]);

  // Get selected key for folder view
  const selectedKey = useMemo(() => {
    if (!selectedKeyId || !keys) return undefined;
    return keys.find((k) => k.id === selectedKeyId);
  }, [selectedKeyId, keys]);

  // Get all keys in selected folder (recursively)
  const folderKeys = useMemo(() => {
    if (selectedFolderPath === undefined || !keyTree.length) return [];
    return getKeysInFolder(keyTree, selectedFolderPath);
  }, [selectedFolderPath, keyTree]);

  // Handle folder or key selection
  const handleNodeSelect = (
    nodeId: string,
    isFolder: boolean,
    folderPath?: string
  ) => {
    setVisibleCount(500);
    if (isFolder && folderPath !== undefined) {
      setSelectedFolderPath(folderPath);
      setSelectedKeyId(undefined);
    } else {
      setSelectedKeyId(nodeId);
      setSelectedFolderPath(undefined);
    }
  };

  const totalKeys = keys?.length || 0;
  const translatedKeys =
    keys?.filter((key) => {
      const hasAllTranslations = languages?.every((lang) =>
        translationData[key.id]?.[lang.id]?.value?.trim(),
      );
      return hasAllTranslations;
    }).length || 0;

  if (keysLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!keys || keys.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
          </div>
          <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-key">
                <Plus className="h-4 w-4 mr-2" />
                {tc("actions.addKey")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addKeyTitle")}</DialogTitle>
                <DialogDescription>
                  {t("addKeyDesc")}
                </DialogDescription>
              </DialogHeader>
              <Form {...addKeyForm}>
                <form onSubmit={addKeyForm.handleSubmit(handleAddKey)} className="space-y-4">
                  <FormField
                    control={addKeyForm.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tc("labels.key")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("keyPlaceholder")}
                            {...field}
                            data-testid="input-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addKeyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("descriptionOptional")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("descriptionPlaceholder")}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addKeyForm.control}
                    name="maxLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Length (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="e.g., 60"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? null : parseInt(val, 10));
                            }}
                            data-testid="input-max-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addKeyForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          value={field.value || "normal"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddKeyDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      {tc("actions.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createKey.isPending}
                      data-testid="button-submit-key"
                    >
                      {createKey.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {tc("actions.addKey")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="py-16 text-center">
          <p className="text-muted-foreground">{t("noKeys")}</p>
          <p className="text-sm text-muted-foreground mt-2">{t("noKeysDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle", { totalKeys, translatedKeys })}
            </p>
          </div>
          <WorkflowVisual />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-search"
            />
          </div>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "table" | "folder")}
          >
            <TabsList>
              <TabsTrigger value="folder" data-testid="tab-folder-view">
                <FolderTree className="h-4 w-4 mr-2" />
                {t("folderView")}
              </TabsTrigger>
              <TabsTrigger value="table" data-testid="tab-table-view">
                <List className="h-4 w-4 mr-2" />
                {t("tableView")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-44" data-testid="select-priority-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <FindReplaceDialog
            projectId={id!}
            languages={languages}
            onComplete={() => {
              queryClient.invalidateQueries({
                queryKey: ["/api/projects", id, "translations"],
              });
            }}
          />
          <Dialog open={isAddKeyDialogOpen} onOpenChange={setIsAddKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-key">
                <Plus className="h-4 w-4 mr-2" />
                {tc("actions.addKey")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addKeyTitle")}</DialogTitle>
                <DialogDescription>
                  {t("addKeyDesc")}
                </DialogDescription>
              </DialogHeader>
              <Form {...addKeyForm}>
                <form onSubmit={addKeyForm.handleSubmit(handleAddKey)} className="space-y-4">
                  <FormField
                    control={addKeyForm.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tc("labels.key")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("keyPlaceholder")}
                            {...field}
                            data-testid="input-key"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addKeyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("descriptionOptional")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("descriptionPlaceholder")}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addKeyForm.control}
                    name="maxLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Length (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="e.g., 60"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === "" ? null : parseInt(val, 10));
                            }}
                            data-testid="input-max-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addKeyForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          value={field.value || "normal"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddKeyDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      {tc("actions.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createKey.isPending}
                      data-testid="button-submit-key"
                    >
                      {createKey.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {tc("actions.addKey")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isPreTranslateDialogOpen}
            onOpenChange={(open) => {
              setIsPreTranslateDialogOpen(open);
              if (!open) {
                setPreTranslateLanguageId("");
                setPreTranslateProgress(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-pre-translate">
                <Languages className="h-4 w-4 mr-2" />
                Pre-translate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pre-translate</DialogTitle>
                <DialogDescription>
                  Automatically translate all empty translations for a selected language using AI. Translations will be saved as drafts for review.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Language</label>
                  <Select
                    value={preTranslateLanguageId}
                    onValueChange={setPreTranslateLanguageId}
                    disabled={isPreTranslating}
                  >
                    <SelectTrigger data-testid="select-pre-translate-language">
                      <SelectValue placeholder="Select a language..." />
                    </SelectTrigger>
                    <SelectContent>
                      {languages
                        ?.filter((l) => !l.isDefault)
                        .map((lang) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            <span className="font-mono mr-2">{lang.languageCode}</span>
                            {lang.languageName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {isPreTranslating && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Translating... This may take a while.</span>
                    </div>
                    <Progress value={undefined} className="h-2" />
                  </div>
                )}
                {preTranslateProgress && !isPreTranslating && (
                  <div className="space-y-1 text-sm">
                    <p className="text-chart-2">{preTranslateProgress.translated} translations created</p>
                    <p className="text-muted-foreground">{preTranslateProgress.skipped} skipped (already translated or no source)</p>
                    {preTranslateProgress.errors > 0 && (
                      <p className="text-destructive">{preTranslateProgress.errors} errors</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsPreTranslateDialogOpen(false)}
                  disabled={isPreTranslating}
                  data-testid="button-pre-translate-cancel"
                >
                  {preTranslateProgress ? "Close" : "Cancel"}
                </Button>
                {!preTranslateProgress && (
                  <Button
                    onClick={handlePreTranslate}
                    disabled={isPreTranslating || !preTranslateLanguageId}
                    data-testid="button-pre-translate-start"
                  >
                    {isPreTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4 mr-2" />
                        Start Pre-translation
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedKeys.size > 0 && viewMode === "table" && (
        <div className="flex items-center justify-between p-3 bg-accent/50 border rounded-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedKeys(new Set())}
              data-testid="button-clear-selection"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedKeys.size} {selectedKeys.size === 1 ? "key" : "keys"}{" "}
              selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isBulkTranslating ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Translating {bulkProgress.current} of {bulkProgress.total}...
                </span>
              </div>
            ) : (
              <Button
                onClick={handleBulkTranslate}
                disabled={isBulkTranslating}
                data-testid="button-bulk-translate"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Translate Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {viewMode === "folder" ? (
        <div className="grid grid-cols-[300px_1fr] gap-4">
          <div className="border rounded-lg overflow-auto max-h-[calc(100vh-300px)]">
            <KeyFolderView
              nodes={keyTree}
              selectedKeyId={selectedKeyId}
              selectedFolderPath={selectedFolderPath}
              onKeySelect={(keyId) => handleNodeSelect(keyId, false)}
              onFolderSelect={(folderPath) => handleNodeSelect("", true, folderPath)}
              searchQuery={searchQuery}
            />
          </div>
          <div className="border rounded-lg overflow-auto">
            {selectedFolderPath !== undefined && folderKeys.length > 0 ? (
              /* Folder content: show all keys in folder */
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedFolderPath ? `Folder: ${selectedFolderPath}` : t("allKeys")}
                  </h3>
                </div>
                <div className="space-y-6">
                  {folderKeys.slice(0, visibleCount).map((key) => {
                    const defaultLang = languages?.find((l) => l.isDefault);
                    const sourceText = defaultLang ? translationData[key.id]?.[defaultLang.id]?.value : undefined;
                    return (
                      <div key={key.id} className="border rounded-lg p-4 space-y-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold font-mono">{key.key}</h4>
                            <PriorityBadge priority={key.priority} />
                          </div>
                          {key.description && (
                            <p className="text-sm text-muted-foreground mt-1">{key.description}</p>
                          )}
                        </div>
                        <div className="space-y-3">
                          {sortedLanguages?.map((lang) => (
                            <div key={lang.id} className="border-b pb-3 last:border-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm font-medium">{lang.languageCode}</span>
                                <span className="text-sm text-muted-foreground">{lang.languageName}</span>
                                {lang.isDefault && (
                                  <Badge variant="outline" className="text-xs">{tc("labels.default")}</Badge>
                                )}
                              </div>
                              <TranslationCell
                                keyId={key.id}
                                translationKey={key}
                                language={lang}
                                translationData={translationData}
                                sourceText={sourceText}
                                onUpdate={updateTranslation}
                                onSave={handleSave}
                                onAISuggest={handleAISuggest}
                                onStatusChange={handleStatusChange}
                                isDefault={!!lang.isDefault}
                                isSaving={savingStates[`${key.id}-${lang.id}`] || false}
                                isSuggesting={suggestingStates[`${key.id}-${lang.id}`] || false}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {folderKeys.length > visibleCount && (
                  <div className="p-4 text-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((prev) => prev + 500)}
                      data-testid="button-load-more"
                    >
                      Load More ({folderKeys.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            ) : selectedKey ? (
              /* Single key selected */
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold font-mono">{selectedKey.key}</h3>
                    <PriorityBadge priority={selectedKey.priority} />
                  </div>
                  {selectedKey.description && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedKey.description}</p>
                  )}
                </div>
                <div className="space-y-4">
                  {sortedLanguages?.map((lang) => {
                    const defaultLang = languages.find((l) => l.isDefault);
                    const sourceText = defaultLang ? translationData[selectedKey.id]?.[defaultLang.id]?.value : undefined;
                    return (
                      <div key={lang.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-xs font-medium">{lang.languageCode}</span>
                          <span className="text-xs text-muted-foreground">{lang.languageName}</span>
                          {lang.isDefault && (
                            <Badge variant="outline" className="text-xs">{tc("labels.default")}</Badge>
                          )}
                        </div>
                        <TranslationCell
                          keyId={selectedKey.id}
                          translationKey={selectedKey}
                          language={lang}
                          translationData={translationData}
                          sourceText={sourceText}
                          onUpdate={updateTranslation}
                          onSave={handleSave}
                          onAISuggest={handleAISuggest}
                          onStatusChange={handleStatusChange}
                          isDefault={!!lang.isDefault}
                          isSaving={savingStates[`${selectedKey.id}-${lang.id}`] || false}
                          isSuggesting={suggestingStates[`${selectedKey.id}-${lang.id}`] || false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-16 text-center">
                <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a key from the folder tree to edit translations
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={
                      selectedKeys.size === filteredKeys.length &&
                      filteredKeys.length > 0
                    }
                    onCheckedChange={toggleAllKeys}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="min-w-48">Key</TableHead>
                <TableHead className="min-w-48">Translations</TableHead>
                {/* {languages?.map((lang) => (
                  <TableHead key={lang.id} className="min-w-64">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{lang.languageCode}</span>
                      <span className="text-muted-foreground font-normal">
                        {lang.languageName}
                      </span>
                      {lang.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                ))} */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.slice(0, visibleCount).map((key) => (
                <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                  <TableCell className="align-top">
                    <Checkbox
                      checked={selectedKeys.has(key.id)}
                      onCheckedChange={() => toggleKeySelection(key.id)}
                      data-testid={`checkbox-key-${key.id}`}
                    />
                  </TableCell>
                  <TableCell className="align-top max-w-60 text-wrap break-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{key.key}</span>
                        <PriorityBadge priority={key.priority} />
                      </div>
                      {key.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {key.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Table>
                      <TableBody>
                        {sortedLanguages?.map((lang) => {
                          // Get source text from default language
                          const defaultLang = languages.find(l => l.isDefault);
                          const sourceText = defaultLang
                            ? translationData[key.id]?.[defaultLang.id]?.value
                            : undefined;

                          return (
                            <TableRow key={lang.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground w-20">
                                {lang.languageCode}
                              </TableCell>
                              <TableCell className="align-top">
                                <TranslationCell
                                  keyId={key.id}
                                  translationKey={key}
                                  language={lang}
                                  translationData={translationData}
                                  sourceText={sourceText}
                                  onUpdate={updateTranslation}
                                  onSave={handleSave}
                                  onAISuggest={handleAISuggest}
                                  onStatusChange={handleStatusChange}
                                  isDefault={!!lang.isDefault}
                                  isSaving={
                                    savingStates[`${key.id}-${lang.id}`] || false
                                  }
                                  isSuggesting={
                                    suggestingStates[`${key.id}-${lang.id}`] ||
                                    false
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableCell>
                  {/* {languages?.map((lang) => (
                    <TableCell key={lang.id} className="align-top">
                      <TranslationCell
                        keyId={key.id}
                        translationKey={key}
                        language={lang}
                        translationData={translationData}
                        onUpdate={updateTranslation}
                        onSave={handleSave}
                        onAISuggest={handleAISuggest}
                        onStatusChange={handleStatusChange}
                        isDefault={!!lang.isDefault}
                        isSaving={savingStates[`${key.id}-${lang.id}`] || false}
                        isSuggesting={suggestingStates[`${key.id}-${lang.id}`] || false}
                      />
                    </TableCell>
                  ))} */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredKeys.length > visibleCount && (
            <div className="p-4 text-center border-t">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 500)}
                data-testid="button-load-more"
              >
                Load More ({filteredKeys.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {showScrollTop && (
        <button
          className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full shadow-lg border bg-background hover:bg-accent flex items-center justify-center transition-colors"
          onClick={handleScrollToTop}
          data-testid="button-scroll-top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
