import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';

import { AirportDashboard } from './components/airport-dashboard/airport-dashboard';
import { TerminalView } from './components/terminal-view/terminal-view';
import { AlertDialog } from './components/alert-dialog/alert-dialog';
import { SettingsDialog } from './components/settings-dialog/settings-dialog';
import { TerminalDetailDialog } from './components/terminal-detail-dialog/terminal-detail-dialog';
import { GateAssignmentDialog } from './components/gate-assignment-dialog/gate-assignment-dialog';
import { GateManagement } from './components/gate-management/gate-management';
import { BulkGateOperationDialog } from './components/bulk-gate-operation-dialog/bulk-gate-operation-dialog';
import { FlightOperations } from './components/flight-operations/flight-operations';
import { PassengerFlow } from './components/passenger-flow/passenger-flow';
import { ResourceManagement } from './components/resource-management/resource-management';
import { WeatherIntegration } from './components/weather-integration/weather-integration';
import { Analytics } from './components/analytics/analytics';
// import { GateManagementComponent } from './components/gate-management/gate-management.component';
// import { FlightOperationsComponent } from './components/flight-operations/flight-operations.component';
// import { PassengerFlowComponent } from './components/passenger-flow/passenger-flow.component';
// import { ResourceManagementComponent } from './components/resource-management/resource-management.component';
// import { WeatherIntegrationComponent } from './components/weather-integration/weather-integration.component';
// import { AnalyticsComponent } from './components/analytics/analytics.component';
// import { ThreeDVisualizationComponent } from './components/three-d-visualization/three-d-visualization.component';
// import { AlertSystemComponent } from './components/alert-system/alert-system.component';
// import { ControlPanelComponent } from './components/control-panel/control-panel.component';
// import { SettingsComponent } from './components/settings/settings.component';

@NgModule({
  declarations: [
    // GateManagementComponent,
    // FlightOperationsComponent,
    // PassengerFlowComponent,
    // ResourceManagementComponent,
    // WeatherIntegrationComponent,
    // AnalyticsComponent,
    // ThreeDVisualizationComponent,
    // AlertSystemComponent,
    // ControlPanelComponent,
    // SettingsComponent,
    AirportDashboard,
    TerminalView,
    AlertDialog,
    SettingsDialog,
    TerminalDetailDialog,
    GateAssignmentDialog,
    GateManagement,
    BulkGateOperationDialog,
    FlightOperations,
    PassengerFlow,
    ResourceManagement,
    WeatherIntegration,
    Analytics
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatSliderModule
  ],
  exports: [
    AirportDashboard
  ]
})
export class AirportDigitalTwinModule { }