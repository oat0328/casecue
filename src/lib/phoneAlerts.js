const KEY='casecue-phone-alerts';
export const defaultPhoneAlertPrefs={enabled:false,group_reminders:true,meeting_reminders:true,tomorrow_ready:true,progress_reminders:true,lead_minutes:15};
export function getPhoneAlertPrefs(){try{return{...defaultPhoneAlertPrefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{...defaultPhoneAlertPrefs}}}
export function savePhoneAlertPrefs(prefs){localStorage.setItem(KEY,JSON.stringify({...defaultPhoneAlertPrefs,...prefs}));}
export async function ensureNotificationPermission(){
  if(!('Notification'in window))throw new Error('This browser does not support system notifications.');
  let permission=Notification.permission;
  if(permission==='default') permission=await Notification.requestPermission();
  if(permission!=='granted') throw new Error('Notifications are blocked for CaseCue on this device.');
  if('serviceWorker'in navigator){try{return await navigator.serviceWorker.register('/casecue-sw.js')}catch{return null}}
  return null;
}
export async function showCaseCueNotification(title,body,url='/app',tag='casecue'){
  if(!('Notification'in window)||Notification.permission!=='granted')return false;
  if('serviceWorker'in navigator){try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'/favicon.ico',badge:'/favicon.ico',tag,data:{url}});return true}catch{}}
  new Notification(title,{body,tag});return true;
}
export function oncePerDay(key){const day=new Date().toISOString().slice(0,10);const k=`casecue-alert-fired:${key}`;if(localStorage.getItem(k)===day)return false;localStorage.setItem(k,day);return true;}
