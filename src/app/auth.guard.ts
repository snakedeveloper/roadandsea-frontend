import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { LoginService } from './services/login/login.service';
import { DialogService } from 'src/app/services/dialog.service';

@Injectable( {
  providedIn: 'root'
} )

/**
 * This guard ensures that only logged-in users can activate certain routes.
 */
export class AuthGuard implements CanActivate {
  constructor(
    private loginService: LoginService,
    private router: Router,
    private dialogService: DialogService,
  ) {}

  /**
   * Determines whether the route can be activated.
   * If the user is not logged in, they are redirected to the login page.
   */
  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const isLoggedIn = await this.loginService.isLoggedIn();

    if (!isLoggedIn) {
      // this.dialogService.openSimpleDialog( 'Aby przejść do tej strony, musisz być zalogowany.', 'OK', 'warning' );
      this.router.navigate(['login']);
      return false;
    }

    return true;
  }
}
