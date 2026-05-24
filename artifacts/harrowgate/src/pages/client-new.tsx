import { useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  nationality: z.string().min(1, "Nationality is required"),
  countryOfOrigin: z.string().optional(),
  dateOfBirth: z.string().optional(),
  passportNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ClientNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", email: "", phone: "", nationality: "",
      countryOfOrigin: "", dateOfBirth: "", passportNumber: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createClient.mutate({ data: values }, {
      onSuccess: (client) => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Client created", description: `${client.name} has been added.` });
        setLocation(`/clients/${client.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create client.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="link-back-clients">
        <ArrowLeft size={14} /> Back to Clients
      </Link>

      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">Add New Client</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card border border-card-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name *</label>
            <input {...form.register("name")} className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-name" />
            {form.formState.errors.name && <p className="text-destructive text-xs mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address *</label>
            <input {...form.register("email")} type="email" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-email" />
            {form.formState.errors.email && <p className="text-destructive text-xs mt-1">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
            <input {...form.register("phone")} className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-phone" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Nationality *</label>
            <input {...form.register("nationality")} className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-nationality" />
            {form.formState.errors.nationality && <p className="text-destructive text-xs mt-1">{form.formState.errors.nationality.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Country of Origin</label>
            <input {...form.register("countryOfOrigin")} className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-country" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date of Birth</label>
            <input {...form.register("dateOfBirth")} type="date" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background" data-testid="input-dob" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Passport Number</label>
            <input {...form.register("passportNumber")} className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background font-mono" data-testid="input-passport" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={createClient.isPending}
            className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            data-testid="button-submit-client"
          >
            {createClient.isPending ? "Creating..." : "Create Client"}
          </button>
        </div>
      </form>
    </div>
  );
}
