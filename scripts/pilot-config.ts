export function pilotConfig(){
  const databaseUrl=process.env.DATABASE_URL,origin=process.env.PILOT_ORIGIN;
  if(!databaseUrl||!origin)throw new Error('DATABASE_URL and PILOT_ORIGIN are required.');
  const url=new URL(origin);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('PILOT_ORIGIN must be an HTTPS origin.');
  if(process.env.PILOT_DATA_CLASS!=='PILOT')throw new Error('Explicit PILOT_DATA_CLASS=PILOT required; use a dedicated database.');
  const port=Number(process.env.PORT??3000);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT.');
  return {databaseUrl,origin:url.origin,port};
}
