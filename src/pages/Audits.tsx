import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { AuditCard } from '@/components/AuditCard';
import { mockAudits } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Audits = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in-progress' | 'completed'>('all');

  const filteredAudits = mockAudits.filter(audit => {
    const matchesSearch = audit.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Audits</h1>
            <p className="text-muted-foreground">Verwaltung und Planung aller Zertifizierungsaudits</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Neues Audit
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Audit oder Kunde suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="scheduled">Geplant</TabsTrigger>
            <TabsTrigger value="in-progress">In Bearbeitung</TabsTrigger>
            <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-6">
            {filteredAudits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Keine Audits gefunden</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAudits.map((audit) => (
                  <AuditCard key={audit.id} audit={audit} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Audits;
