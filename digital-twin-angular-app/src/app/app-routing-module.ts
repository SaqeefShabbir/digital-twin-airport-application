import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AirportDashboardComponent } from './airport-digital-twin/components/airport-dashboard/airport-dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: AirportDashboardComponent },
  { path: '**', redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }