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
  return <div><PageHeader title='ProofPort' subtitle='Turn student work into organized, teacher-reviewed evidence for Gradebook, IEP progress, and future IEP writing.' icon={Archive}/><Tabs defaultValue='batch'><TabsList className='mb-4'><TabsTrigger value='batch'>SmartStack Grader</TabsTrigger><TabsTrigger value='single'>QuickGrade</TabsList><TabsContent value='batch'><BatchWorkEvidencePanel students={students||[]} goals={goals||[]}/></TabsContent><TabsContent value='single'><WorkEvidencePanel students={students||[]} goals={goals||[]}/></TabsContent></Tabs></div>;
}
