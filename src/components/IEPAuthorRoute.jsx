import React from'react';import{Navigate,Outlet}from'react-router-dom';import{useAuth}from'@/lib/AuthContext';import{getActiveWorkspace,workspaceHome}from'@/lib/workspaces';
const ALLOWED=new Set(['sped','speech','ot','psych','nurse']);
export default function IEPAuthorRoute(){const{user}=useAuth();const w=getActiveWorkspace(user);return ALLOWED.has(w)?<Outlet/>:<Navigate to={workspaceHome(w)} replace/>}
