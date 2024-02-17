import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnonymousComponent } from './anonymous/anonymous.component';
import { AuthGuard } from './auth.guard';
import { CreateSessionComponent } from './create-session/create-session.component';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { UsersComponent } from './pages/users/users.component';

const routes: Routes = [
  { path: '', 
  component: AnonymousComponent, children: [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
      path: 'login',
      component: LoginComponent
    },
    {
      path: 'create-session',
      component: CreateSessionComponent
    }
  ] },
  
  {
    path: '',
    component: MenuComponent, canActivate: [AuthGuard], children: [
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
      {
        path: 'orders',
        component: OrdersComponent
      },
      {
        path: 'users',
        component: UsersComponent
      },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
