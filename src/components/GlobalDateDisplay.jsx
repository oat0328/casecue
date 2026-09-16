import { useEffect } from "react";

// CaseCue stores dates as ISO for safe data handling, but teachers should never
// have to read database-style YYYY-MM-DD dates. This presentation guard converts
// rendered text to MM/DD/YYYY across legacy screens while individual components
// are migrated to the shared date formatter. Form/input values are left untouched.
export default function GlobalDateDisplay(){
  useEffect(()=>{
    const rx=/(\d{4})-(\d{2})-(\d{2})/g;
    const format=(s)=>s.replace(rx,(_,y,m,d)=>`${m}/${d}/${y}`);
    const scan=(root)=>{
      if(!root)return;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let n; while((n=walker.nextNode())){
        const parent=n.parentElement;
        if(!parent||['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(parent.tagName))continue;
        if(rx.test(n.nodeValue||'')){rx.lastIndex=0;n.nodeValue=format(n.nodeValue)}else rx.lastIndex=0;
      }
    };
    scan(document.body);
    const observer=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE){const p=n.parentElement;if(p&&!['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(p.tagName))n.nodeValue=format(n.nodeValue||'')}else if(n.nodeType===Node.ELEMENT_NODE)scan(n)})));
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
