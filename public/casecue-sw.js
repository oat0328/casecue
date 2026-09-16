self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',(event)=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',(event)=>{
  event.notification.close();
  const url=event.notification.data?.url||'/app';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then((clients)=>{
    for(const client of clients){if('focus'in client){client.navigate(url);return client.focus();}}
    if(self.clients.openWindow)return self.clients.openWindow(url);
  }));
});
self.addEventListener('push',(event)=>{
  let data={};try{data=event.data?.json?.()||{}}catch{data={body:event.data?.text?.()||'CaseCue reminder'}}
  event.waitUntil(self.registration.showNotification(data.title||'CaseCue',{body:data.body||'',icon:'/favicon.ico',badge:'/favicon.ico',tag:data.tag||'casecue',renotify:false,data:{url:data.url||'/app'}}));
});