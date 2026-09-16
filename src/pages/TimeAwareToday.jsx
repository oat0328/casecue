import React, { useEffect } from 'react';
import Today from '@/pages/Today';

function greetingForHour(hour){
  if(hour < 12) return 'Good morning';
  if(hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TimeAwareToday(){
  useEffect(()=>{
    const applyGreeting=()=>{
      const heading=[...document.querySelectorAll('h1')].find(el=>/^Good (morning|afternoon|evening),/.test(el.textContent||''));
      if(!heading) return;
      heading.textContent=(heading.textContent||'').replace(/^Good (morning|afternoon|evening)/,greetingForHour(new Date().getHours()));
    };
    applyGreeting();
    const timer=setInterval(applyGreeting,60000);
    return()=>clearInterval(timer);
  },[]);
  return <Today/>;
}
