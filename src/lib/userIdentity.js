const text=v=>String(v??'').trim();

export function userDisplayName(user,fallback='CaseCue Staff'){
 const email=text(user?.email||user?.data?.email).toLowerCase();
 const local=email.includes('@')?email.split('@')[0]:'';
 const candidates=[
  user?.data?.profile_display_name,
  user?.profile_display_name,
  user?.data?.full_name,
  user?.full_name,
  user?.data?.display_name,
  user?.display_name,
  user?.data?.name,
  user?.name
 ].map(text).filter(Boolean);
 for(const value of candidates){
  const lower=value.toLowerCase();
  if(lower.includes('@'))continue;
  if(local&&lower===local)continue;
  if(email&&lower===email)continue;
  return value;
 }
 return fallback;
}

export function userFirstName(user,fallback='Staff'){
 const name=userDisplayName(user,'');
 return name?name.split(/\s+/)[0]:fallback;
}
