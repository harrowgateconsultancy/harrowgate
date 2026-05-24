import { useListClients } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export default function Clients() {
  const { data: clients, isLoading } = useListClients();
  const [search, setSearch] = useState("");

  const filtered = (clients ?? []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.nationality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients?.length ?? 0} registered clients</p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity"
          data-testid="button-add-client"
        >
          <Plus size={14} />
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name, email or nationality..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-border rounded bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid="input-search-clients"
        />
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4">
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {search ? "No clients match your search." : "No clients yet."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Nationality</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Passport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(client => (
                <tr
                  key={client.id}
                  className="hover:bg-accent transition-colors cursor-pointer"
                  data-testid={`row-client-${client.id}`}
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary">
                      {client.name}
                    </Link>
                    <div className="text-xs text-muted-foreground sm:hidden">{client.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{client.email}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {client.nationality}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs hidden lg:table-cell">
                    {client.passportNumber ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
