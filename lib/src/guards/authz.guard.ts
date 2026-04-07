import { inject } from "@angular/core";
import { CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AUTHZ_SERVICE_TOKEN, IAuthzService, ITokenService, TOKEN_SERVICE_TOKEN } from "@phobos/core";


export const authzGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authzService = inject(AUTHZ_SERVICE_TOKEN) as IAuthzService;
  const tokenService = inject(TOKEN_SERVICE_TOKEN) as ITokenService;
  const roles = route.data['roles'] as string[];

  if (!roles || roles.length === 0) {
    return tokenService.accessToken() !== null;
  } else {
    return tokenService.accessToken() !== null && roles.some(role => authzService.hasRole(role));
  }
};