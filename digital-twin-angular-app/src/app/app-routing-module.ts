import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AirportDashboard } from './airport-digital-twin/components/airport-dashboard/airport-dashboard';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: AirportDashboard },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }