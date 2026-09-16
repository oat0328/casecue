import React from 'react';
import { Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/lib/useAsync';
import PageHeader from '@/components/PageHeader';
import WorkEvidencePanel from '@/components/evidence/WorkEvidencePanel';
import BatchWorkEvidencePanel from '@/components/evidence/BatchWorkEvidencePanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EvidenceVault(){
  const {data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',300),[]);
  const {data:goals}=useAsync(()=>base44.entities.Goal.list('-updated_date',500),[]);
  return <div><PageHeader title='Student Work & Evidence Vault' subtitle='Grade one assignment or a mixed stack. Approved evidence can flow to Gradebook, IEP goal progress, quantitative data, and CaseCue Proof.' icon={Archive}/><Tabs defaultValue='batch'><TabsList className='mb-4'><TabsTrigger value='batch'>Mass Assignment Grader</TabsTrigger><TabsTrigger value='single'>Single Student Work</TabsTrigger></TabsList><TabsContent value='batch'><BatchWorkEvidencePanel students={students||[]} goals={goals||[]}/></TabsContent><TabsContent value='single'><WorkEvidencePanel students={students||[]} goals={goals||[]}/></TabsContent></Tabs></div>;
}
