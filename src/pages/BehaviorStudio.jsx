import React, { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BehaviorDocAnalyzer from "@/components/behaviorStudio/BehaviorDocAnalyzer";
import AmendmentDrafter from "@/components/behaviorStudio/AmendmentDrafter";

export default function BehaviorStudio() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    base44.entities.Student.list().then(setStudents).catch(() => setStudents([]));
  }, []);

  return (
    <div>
      <PageHeader
        icon={Brain}
        title="Behavior & Amendments"
        subtitle="Analyze BIPs and FBAs, and draft IEP amendment language. All CaseCue-generated content is a draft that requires educator and IEP team review."
      />
      <Tabs defaultValue="bip">
        <TabsList>
          <TabsTrigger value="bip">BIP Analyzer</TabsTrigger>
          <TabsTrigger value="fba">FBA Assistant</TabsTrigger>
          <TabsTrigger value="amendment">Amendment Drafter</TabsTrigger>
        </TabsList>
        <TabsContent value="bip" className="mt-6">
          <BehaviorDocAnalyzer students={students} analysisType="bip" />
        </TabsContent>
        <TabsContent value="fba" className="mt-6">
          <BehaviorDocAnalyzer students={students} analysisType="fba" />
        </TabsContent>
        <TabsContent value="amendment" className="mt-6">
          <AmendmentDrafter students={students} />
        </TabsContent>
      </Tabs>
    </div>
  );
}