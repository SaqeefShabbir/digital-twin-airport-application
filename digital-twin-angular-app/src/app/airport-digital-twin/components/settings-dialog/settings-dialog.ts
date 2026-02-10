import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormArray, AbstractControl, FormControl } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

export interface SettingsDialogData {
  autoRefresh: boolean;
  refreshRate: number;
  showCharts: boolean;
  showNotifications: boolean;
  showPerformance: boolean;
  layout: string;
  simulationSpeed: number;
  alertPreferences: any;
  dataSources: any[];
  userPreferences: any;
}

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.html',
  standalone: false,
  styleUrls: ['./settings-dialog.scss']
})
export class SettingsDialog implements OnInit {
  settingsForm: FormGroup;
  activeTabIndex = 0;
  isSaving = false;

  @ViewChild('importSettings', { static: false }) importFileInput!: ElementRef;
  
  // Layout Options
  layouts = [
    { value: 'default', label: 'Default Layout', icon: 'dashboard', description: 'Balanced view with all panels' },
    { value: 'compact', label: 'Compact Layout', icon: 'view_compact', description: 'Dense layout for small screens' },
    { value: 'expanded', label: 'Expanded Layout', icon: 'fullscreen', description: 'Maximize visualization area' },
    { value: 'analytics', label: 'Analytics Focus', icon: 'analytics', description: 'Focus on data and charts' },
    { value: 'operations', label: 'Operations Focus', icon: 'flight_takeoff', description: 'Focus on flight operations' }
  ];
  
  // Refresh Rates
  refreshRates = [
    { value: 1, label: '1 second', description: 'Real-time updates' },
    { value: 2, label: '2 seconds', description: 'Near real-time' },
    { value: 5, label: '5 seconds', description: 'Recommended' },
    { value: 10, label: '10 seconds', description: 'Standard' },
    { value: 30, label: '30 seconds', description: 'Performance mode' },
    { value: 60, label: '1 minute', description: 'Low bandwidth' }
  ];
  
  // Simulation Speeds
  simulationSpeeds = [
    { value: 0.1, label: '0.1x', description: 'Slow motion' },
    { value: 0.5, label: '0.5x', description: 'Half speed' },
    { value: 1, label: '1x', description: 'Real-time' },
    { value: 2, label: '2x', description: 'Double speed' },
    { value: 5, label: '5x', description: 'Fast forward' },
    { value: 10, label: '10x', description: 'Maximum speed' }
  ];
  
  // Data Sources
  dataSources = [
    { id: 'flight_data', name: 'Flight Data API', enabled: true, description: 'Real-time flight information' },
    { id: 'gate_data', name: 'Gate Management System', enabled: true, description: 'Gate status and assignments' },
    { id: 'terminal_data', name: 'Terminal Monitoring', enabled: true, description: 'Passenger flow and wait times' },
    { id: 'weather_data', name: 'Weather Service', enabled: true, description: 'Weather conditions and forecasts' },
    { id: 'baggage_data', name: 'Baggage System', enabled: true, description: 'Baggage tracking and status' },
    { id: 'security_data', name: 'Security System', enabled: true, description: 'Security checkpoints and alerts' },
    { id: 'resource_data', name: 'Resource Management', enabled: true, description: 'Staff and equipment tracking' },
    { id: 'external_api', name: 'External APIs', enabled: false, description: 'Third-party data sources' }
  ];
  
  // Alert Preferences
  alertTypes = [
    { id: 'security_alert', name: 'Security Alerts', enabled: true, sound: true, popup: true, email: false },
    { id: 'flight_alert', name: 'Flight Alerts', enabled: true, sound: true, popup: true, email: true },
    { id: 'gate_alert', name: 'Gate Alerts', enabled: true, sound: true, popup: true, email: false },
    { id: 'terminal_alert', name: 'Terminal Alerts', enabled: true, sound: false, popup: true, email: false },
    { id: 'weather_alert', name: 'Weather Alerts', enabled: true, sound: true, popup: true, email: true },
    { id: 'system_alert', name: 'System Alerts', enabled: true, sound: true, popup: true, email: true },
    { id: 'maintenance_alert', name: 'Maintenance Alerts', enabled: false, sound: false, popup: true, email: false }
  ];
  
  // Theme Options
  themes = [
    { value: 'dark', label: 'Dark Theme', icon: 'dark_mode', description: 'Default dark theme for control rooms' },
    { value: 'light', label: 'Light Theme', icon: 'light_mode', description: 'Light theme for daytime use' },
    { value: 'blue', label: 'Blue Theme', icon: 'palette', description: 'High contrast blue theme' },
    { value: 'terminal', label: 'Terminal Theme', icon: 'computer', description: 'Monochrome terminal style' }
  ];
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SettingsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: SettingsDialogData
  ) {
    this.settingsForm = this.fb.group({
      // Display Settings
      layout: [data.layout || 'default'],
      theme: [data.userPreferences?.theme || 'dark'],
      showCharts: [data.showCharts],
      showNotifications: [data.showNotifications],
      showPerformance: [data.showPerformance],
      showWeather: [data.userPreferences?.showWeather ?? true],
      showTerminalStatus: [data.userPreferences?.showTerminalStatus ?? true],
      showRecentFlights: [data.userPreferences?.showRecentFlights ?? true],
      
      // Data Settings
      autoRefresh: [data.autoRefresh],
      refreshRate: [data.refreshRate || 5],
      simulationSpeed: [data.simulationSpeed || 1],
      dataSources: this.fb.array([]),
      
      // Alert Settings
      enableAlertSounds: [data.alertPreferences?.enableAlertSounds ?? true],
      enableAlertPopup: [data.alertPreferences?.enableAlertPopup ?? true],
      enableEmailAlerts: [data.alertPreferences?.enableEmailAlerts ?? false],
      criticalAlertSound: [data.alertPreferences?.criticalAlertSound || 'siren'],
      warningAlertSound: [data.alertPreferences?.warningAlertSound || 'beep'],
      alertTypes: this.fb.array([]),
      
      // Performance Settings
      enableHardwareAcceleration: [data.userPreferences?.enableHardwareAcceleration ?? true],
      enableWebGL: [data.userPreferences?.enableWebGL ?? true],
      dataCacheSize: [data.userPreferences?.dataCacheSize || 100],
      maxConcurrentRequests: [data.userPreferences?.maxConcurrentRequests || 10],
      
      // User Preferences
      dashboardTitle: [data.userPreferences?.dashboardTitle || 'Airport Digital Twin'],
      timeFormat: [data.userPreferences?.timeFormat || '24h'],
      dateFormat: [data.userPreferences?.dateFormat || 'medium'],
      temperatureUnit: [data.userPreferences?.temperatureUnit || 'celsius']
    });
  }
  
  ngOnInit(): void {
    this.initializeDataSources();
    this.initializeAlertTypes();
  }
  
  initializeDataSources(): void {
    const dataSourcesArray = this.settingsForm.get('dataSources') as FormArray;
    this.dataSources.forEach(source => {
      dataSourcesArray.push(this.fb.group({
        id: [source.id],
        name: [source.name],
        enabled: [source.enabled],
        description: [source.description]
      }));
    });
  }
  
  initializeAlertTypes(): void {
    const alertTypesArray = this.settingsForm.get('alertTypes') as FormArray;
    this.alertTypes.forEach(alert => {
      alertTypesArray.push(this.fb.group({
        id: [alert.id || ''],
        name: [alert.name || ''],
        enabled: [alert.enabled ?? false],
        sound: [alert.sound ?? false],
        popup: [alert.popup ?? false],
        email: [alert.email ?? false]
      }));
    });
  }
  
  get dataSourceControls() {
    return (this.settingsForm.get('dataSources') as FormArray).controls;
  }
  
  get alertTypeControls() {
    return (this.settingsForm.get('alertTypes') as FormArray).controls;
  }
  
  getSourceControls(source: AbstractControl, field: string): FormControl {
    return (source as FormGroup).get(field) as FormControl;
  }

  getAlertTypeControls(alert: AbstractControl, field: string): FormControl {
    return (alert as FormGroup).get(field) as FormControl;
  }

  triggerFileInput(): void {
    if (this.importFileInput && this.importFileInput.nativeElement) {
      this.importFileInput.nativeElement.click();
    }
  }

  toggleAllDataSources(enable: boolean): void {
    const dataSourcesArray = this.settingsForm.get('dataSources') as FormArray;
    dataSourcesArray.controls.forEach(control => {
      control.get('enabled')?.setValue(enable);
    });
  }
  
  toggleAllAlerts(enable: boolean): void {
    const alertTypesArray = this.settingsForm.get('alertTypes') as FormArray;
    alertTypesArray.controls.forEach(control => {
      control.get('enabled')?.setValue(enable);
    });
  }
  
  onAutoRefreshChange(event: MatSlideToggleChange): void {
    if (!event.checked) {
      // If disabling auto-refresh, set refresh rate to manual
      this.settingsForm.patchValue({ refreshRate: 0 });
    }
  }
  
  getSelectedLayoutIcon(): string {
    const layout = this.settingsForm.get('layout')?.value;
    const layoutObj = this.layouts.find(l => l.value === layout);
    return layoutObj?.icon || 'dashboard';
  }
  
  getSelectedThemeIcon(): string {
    const theme = this.settingsForm.get('theme')?.value;
    const themeObj = this.themes.find(t => t.value === theme);
    return themeObj?.icon || 'dark_mode';
  }
  
  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      this.settingsForm.patchValue({
        layout: 'default',
        theme: 'dark',
        showCharts: true,
        showNotifications: true,
        showPerformance: true,
        showWeather: true,
        showTerminalStatus: true,
        showRecentFlights: true,
        autoRefresh: true,
        refreshRate: 5,
        simulationSpeed: 1,
        enableAlertSounds: true,
        enableAlertPopup: true,
        enableEmailAlerts: false,
        criticalAlertSound: 'siren',
        warningAlertSound: 'beep',
        enableHardwareAcceleration: true,
        enableWebGL: true,
        dataCacheSize: 100,
        maxConcurrentRequests: 10,
        dashboardTitle: 'Airport Digital Twin',
        timeFormat: '24h',
        dateFormat: 'medium',
        temperatureUnit: 'celsius'
      });
      
      // Reset data sources
      this.toggleAllDataSources(true);
      
      // Reset alert types (enable all except maintenance)
      const alertTypesArray = this.settingsForm.get('alertTypes') as FormArray;
      alertTypesArray.controls.forEach(control => {
        const id = control.get('id')?.value;
        control.patchValue({
          enabled: id !== 'maintenance_alert',
          sound: id !== 'terminal_alert',
          popup: true,
          email: ['flight_alert', 'weather_alert', 'system_alert'].includes(id)
        });
      });
    }
  }
  
  save(): void {
    this.isSaving = true;
    
    // Simulate API call
    setTimeout(() => {
      const formValue = this.settingsForm.value;
      
      // Prepare settings object
      const settings = {
        display: {
          layout: formValue.layout,
          theme: formValue.theme,
          showCharts: formValue.showCharts,
          showNotifications: formValue.showNotifications,
          showPerformance: formValue.showPerformance,
          showWeather: formValue.showWeather,
          showTerminalStatus: formValue.showTerminalStatus,
          showRecentFlights: formValue.showRecentFlights
        },
        data: {
          autoRefresh: formValue.autoRefresh,
          refreshRate: formValue.refreshRate,
          simulationSpeed: formValue.simulationSpeed,
          dataSources: formValue.dataSources
        },
        alerts: {
          enableAlertSounds: formValue.enableAlertSounds,
          enableAlertPopup: formValue.enableAlertPopup,
          enableEmailAlerts: formValue.enableEmailAlerts,
          criticalAlertSound: formValue.criticalAlertSound,
          warningAlertSound: formValue.warningAlertSound,
          alertTypes: formValue.alertTypes
        },
        performance: {
          enableHardwareAcceleration: formValue.enableHardwareAcceleration,
          enableWebGL: formValue.enableWebGL,
          dataCacheSize: formValue.dataCacheSize,
          maxConcurrentRequests: formValue.maxConcurrentRequests
        },
        user: {
          dashboardTitle: formValue.dashboardTitle,
          timeFormat: formValue.timeFormat,
          dateFormat: formValue.dateFormat,
          temperatureUnit: formValue.temperatureUnit
        }
      };
      
      this.isSaving = false;
      this.dialogRef.close({ 
        saved: true, 
        settings: settings 
      });
    }, 1000);
  }
  
  cancel(): void {
    this.dialogRef.close();
  }
  
  exportSettings(): void {
    const settings = this.settingsForm.value;
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'airport-dashboard-settings.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
  
  importSettings(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const settings = JSON.parse(e.target.result);
        this.settingsForm.patchValue(settings);
        alert('Settings imported successfully!');
      } catch (error) {
        alert('Error importing settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }
}