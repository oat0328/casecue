import React from'react';
import{FileDown}from'lucide-react';
import{Button}from'@/components/ui/button';
import{exportAnalyticsPdf}from'@/lib/analyticsExport';

export default function AnalyticsPdfButton({label='Download Analytics PDF',variant='outline',size='sm',...opts}){
 return <Button type="button" variant={variant} size={size} onClick={()=>exportAnalyticsPdf(opts)}><FileDown className="mr-2 h-4 w-4"/>{label}</Button>;
}
