import React from 'react';
import { Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/lib/useAsync';
import PageHeader from '@/components/PageHeader';
import WorkEvidencePanel from '@/components/evidence/WorkEvidencePanel';

export default function EvidenceVault(){
  const {data:students}=useAsync(()=>base44.entities.Student.list('-updated_date',300),[]);
  const {data:goals}=useAsync(()=>base44.entities.Goal.list('-updated_date',500),[]);
  return <div><PageHeader title='Student Work & Evidence Vault' subtitle='Upload work samples, review CaseCue scoring and observations, then connect approved evidence to Gradebook, goals, progress reports, and CaseCue Proof.' icon={Archive}/><WorkEvidencePanel students={students||[]} goals={goals||[]}/></div>;
}
