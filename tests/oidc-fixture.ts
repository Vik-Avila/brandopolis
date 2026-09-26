import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import * as oidc from 'openid-client';
// Test-only OIDC provider: signs real RS256 ID tokens; claims can be overridden per login to exercise validation.
export async function oidcFixture(issuer='https://issuer.example',clientId='test-client') {
  const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'fixture',alg:'RS256',use:'sig'};
  const claims={subject:'',nonce:'',issuer,audience:clientId,expires:'5m' as string|number};
  const config=new oidc.Configuration({issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks'},clientId,'fixture-secret');
  config[oidc.customFetch]=async input=>{
    if(String(input).endsWith('/jwks'))return Response.json({keys:[jwk]});
    const id_token=await new SignJWT({nonce:claims.nonce,sub:claims.subject}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer(claims.issuer).setAudience(claims.audience).setIssuedAt(Math.floor(Date.now()/1000)-600).setExpirationTime(claims.expires).sign(privateKey);
    return Response.json({access_token:'fixture-access',token_type:'Bearer',id_token});
  };
  // Starts the login at the app, then completes the callback as the browser would.
  async function login(base:string,subject:string,override:Partial<typeof claims>={}) {
    const start=await fetch(base+'/auth/login',{redirect:'manual'}),target=new URL(start.headers.get('location')!);
    Object.assign(claims,{subject,nonce:target.searchParams.get('nonce')!,issuer,audience:clientId,expires:'5m'},override);
    const flow=start.headers.getSetCookie()[0].split(';')[0];
    const callback=await fetch(base+`/auth/callback?code=fixture&state=${target.searchParams.get('state')}`,{headers:{Cookie:flow},redirect:'manual'});
    const session=callback.headers.getSetCookie().find(c=>c.startsWith('__Host-brandopolis_session='));
    return {callback,location:callback.headers.get('location'),cookie:session?.split(';')[0]??null,flow,state:target.searchParams.get('state')!};
  }
  return {config,claims,login};
}
