import { ConfigError } from '../src/transport/pilot-auth.js';
export function pilotConfig(){
  const databaseUrl=process.env.DATABASE_URL,origin=process.env.PILOT_ORIGIN;
  if(!databaseUrl||!origin)throw new ConfigError('DATABASE_URL and PILOT_ORIGIN are required.');
  const url=new URL(origin);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new ConfigError('PILOT_ORIGIN must be an HTTPS origin.');
  if(process.env.PILOT_DATA_CLASS!=='PILOT')throw new ConfigError('Explicit PILOT_DATA_CLASS=PILOT required; use a dedicated database.');
  const port=Number(process.env.PORT??3000);if(!Number.isInteger(port)||port<1||port>65535)throw new ConfigError('Invalid PORT.');
  const access=process.env.PILOT_REQUEST_ACCESS_URL?.trim()||null;
  if(access&&!['https:','mailto:'].includes(new URL(access).protocol))throw new ConfigError('PILOT_REQUEST_ACCESS_URL must be https: or mailto:.');
  if(!['','true','false'].includes(process.env.TRUST_PROXY??''))throw new ConfigError('TRUST_PROXY must be true or false.');
  return {databaseUrl,origin:url.origin,port,trustProxy:process.env.TRUST_PROXY==='true',requestAccessUrl:access};
}
