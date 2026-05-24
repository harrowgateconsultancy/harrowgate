import { useCreateApplication, useListClients, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

const schema = z.object({
  clientId: z.coerce.number().min(1, "Please select a client"),
  applicationType: z.string().min(1, "Please select an application type"),
  targetUniversity: z.string().optional(),
  targetProgram: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ApplicationNew() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefilledClientId = params.get("clientId");

  const queryClient = useQueryClient();
  const createApplication = useCreateApplication();
  const { data: clients } = useListClients();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: prefilledClientId ? Number(prefilledClientId) : 0,
      applicationType: "",
      targetUniversity: "",
      targetProgram: "",
      notes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createApplication.mutate({
      data: {
        clientId: values.clientId,
        applicationType: values.applicationType,
        targetUniversity: values.targetUniversity || undefined,
        targetProgram: values.targetProgram || undefined,
        notes: values.notes || undefined,
      }
    }, {
      onSuccess: (app) => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        toast({ title: "Application created", description: "You can now upload documents." });
        setLocation(`/applications/${app.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create application.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="link-back-applications">
        <ArrowLeft size={14} /> Back to Applications
      </Link>

      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">New Application</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card border border-card-border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Client *</label>
          <select
            {...form.register("clientId")}
            className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
            data-testid="select-client"
          >
            <option value="0">Select a client...</option>
            {(clients ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.nationality}</option>
            ))}
          </select>
          {form.formState.errors.clientId && <p className="text-destructive text-xs mt-1">{form.formState.errors.clientId.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Application Type *</label>
          <select
            {...form.register("applicationType")}
            className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
            data-testid="select-application-type"
          >
            <option value="">Select type...</option>
            <option value="student_visa">Student Visa</option>
            <option value="pr_pathway">PR Pathway</option>
            <option value="university_admission">University Admission</option>
          </select>
          {form.formState.errors.applicationType && <p className="text-destructive text-xs mt-1">{form.formState.errors.applicationType.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target University</label>
          <input {...form.register("targetUniversity")} placeholder="e.g. University of Hong Kong" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-university" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target Program</label>
          <input {...form.register("targetProgram")} placeholder="e.g. MSc Computer Science" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-program" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Internal Notes</label>
          <textarea {...form.register("notes")} rows={3} placeholder="Any notes for internal reference..." className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background resize-none" data-testid="textarea-notes" />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={createApplication.isPending}
            className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
            data-testid="button-submit-application"
          >
            {createApplication.isPending ? "Creating..." : "Create Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
