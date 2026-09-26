import { validatePilotEnv } from './pilot-config.js';
// Offline configuration check: no network, no database, no secret values printed.
const {errors,warnings,settings}=validatePilotEnv();
for(const e of errors)console.log(`FAIL ${e}`);
for(const w of warnings)console.log(`WARN ${w}`);
if(settings)console.log(`PASS origin ${settings.origin}; OIDC callback ${settings.oidc.redirectUri}; AI ${settings.ai.enabled?'enabled':'disabled'}`);
console.log(errors.length?'CONFIG INVALID':'CONFIG VALID');
process.exitCode=errors.length?1:0;
