import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

// Settings interfaces
export interface NotificationSetting {
  id: string;
  type: 'email' | 'push' | 'sms' | 'sound';
  enabled: boolean;
  title: string;
  description: string;
  soundFile?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}

export interface SystemPreference {
  id: string;
  name: string;
  value: any;
  type: 'number' | 'string' | 'boolean' | 'select';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  category: 'general' | 'display' | 'performance' | 'security' | 'backup';
}

export interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  enabled: boolean;
  lastBackup?: Date;
  nextBackup?: Date;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  standalone: false,
  styleUrls: ['./settings.scss']
})
export class Settings implements OnInit {
  // Main settings form
  settingsForm: FormGroup;
  
  // Active tab
  activeTab: 'general' | 'notifications' | 'users' | 'system' | 'backup' | 'api' | 'advanced' = 'general';
  
  // Notification settings
  notificationSettings: NotificationSetting[] = [
    { id: '1', type: 'email', enabled: true, title: 'Email Notifications', description: 'Receive notifications via email' },
    { id: '2', type: 'push', enabled: true, title: 'Push Notifications', description: 'Receive push notifications in browser' },
    { id: '3', type: 'sms', enabled: false, title: 'SMS Alerts', description: 'Receive critical alerts via SMS' },
    { id: '4', type: 'sound', enabled: true, title: 'Sound Alerts', description: 'Play sounds for important alerts', soundFile: 'alert.mp3' },
    { id: '5', type: 'email', enabled: true, title: 'Daily Reports', description: 'Receive daily summary reports' },
    { id: '6', type: 'push', enabled: false, title: 'Flight Updates', description: 'Push notifications for flight status changes' },
    { id: '7', type: 'sound', enabled: true, title: 'System Alerts', description: 'Sound alerts for system issues' }
  ];

  // User roles
  userRoles: UserRole[] = [
    { id: '1', name: 'Administrator', permissions: ['all'], description: 'Full system access' },
    { id: '2', name: 'Operations Manager', permissions: ['view', 'edit', 'manage_users'], description: 'Manage operations and users' },
    { id: '3', name: 'Security Officer', permissions: ['view', 'security_controls'], description: 'Security system access' },
    { id: '4', name: 'Maintenance Staff', permissions: ['view', 'maintenance'], description: 'Maintenance system access' },
    { id: '5', name: 'View Only', permissions: ['view'], description: 'Read-only access' }
  ];

  // System preferences
  systemPreferences: SystemPreference[] = [
    { id: '1', name: 'Auto-refresh Interval', value: 30, type: 'number', category: 'general', min: 5, max: 300, step: 5, unit: 'seconds' },
    { id: '2', name: 'Default Timezone', value: 'UTC', type: 'select', category: 'general', options: ['UTC', 'EST', 'CST', 'MST', 'PST', 'GMT', 'CET'] },
    { id: '3', name: 'Theme', value: 'dark', type: 'select', category: 'display', options: ['light', 'dark', 'auto'] },
    { id: '4', name: 'Animation Speed', value: 'normal', type: 'select', category: 'display', options: ['slow', 'normal', 'fast', 'none'] },
    { id: '5', name: 'Data Retention', value: 365, type: 'number', category: 'performance', min: 30, max: 730, step: 30, unit: 'days' },
    { id: '6', name: 'Max Concurrent Requests', value: 10, type: 'number', category: 'performance', min: 1, max: 50, step: 1 },
    { id: '7', name: 'Session Timeout', value: 60, type: 'number', category: 'security', min: 5, max: 240, step: 5, unit: 'minutes' },
    { id: '8', name: 'Two-Factor Auth', value: true, type: 'boolean', category: 'security' },
    { id: '9', name: 'Auto-logout', value: true, type: 'boolean', category: 'security' },
    { id: '10', name: 'Backup Compression', value: true, type: 'boolean', category: 'backup' },
    { id: '11', name: 'Backup Encryption', value: true, type: 'boolean', category: 'backup' }
  ];

  // Backup schedules
  backupSchedules: BackupSchedule[] = [
    { id: '1', name: 'Daily Operations Backup', frequency: 'daily', time: '02:00', enabled: true, lastBackup: new Date(Date.now() - 86400000), nextBackup: new Date(Date.now() + 3600000) },
    { id: '2', name: 'Weekly Full Backup', frequency: 'weekly', time: '03:00', enabled: true, lastBackup: new Date(Date.now() - 604800000), nextBackup: new Date(Date.now() + 86400000) },
    { id: '3', name: 'Monthly Archive', frequency: 'monthly', time: '04:00', enabled: false, lastBackup: new Date(Date.now() - 2592000000) },
    { id: '4', name: 'Real-time Log Backup', frequency: 'daily', time: '12:00', enabled: true, lastBackup: new Date(Date.now() - 43200000), nextBackup: new Date(Date.now() + 43200000) }
  ];

  // API keys (simulated)
  apiKeys = [
    { id: '1', name: 'Flight Data API', key: 'flt_******7890', created: new Date('2024-01-15'), expires: new Date('2024-12-31'), status: 'active' },
    { id: '2', name: 'Weather API', key: 'wth_******1234', created: new Date('2024-02-20'), expires: new Date('2024-12-31'), status: 'active' },
    { id: '3', name: 'Security API', key: 'sec_******5678', created: new Date('2024-03-10'), expires: new Date('2024-06-30'), status: 'expiring' },
    { id: '4', name: 'Backup API', key: 'bak_******9012', created: new Date('2023-12-01'), expires: new Date('2024-03-31'), status: 'expired' }
  ];

  // Advanced settings
  advancedSettings = {
    debugMode: false,
    verboseLogging: false,
    experimentalFeatures: false,
    developerOptions: false,
    telemetryEnabled: true,
    autoUpdate: true,
    cacheSize: 1024,
    maxLogSize: 100
  };

  // System information
  systemInfo = {
    version: '2.1.0',
    build: '2024.03.15',
    lastUpdate: new Date('2024-03-10'),
    uptime: '15 days, 6 hours',
    databaseSize: '2.4 GB',
    totalUsers: 42,
    activeSessions: 8
  };

  // Import/Export
  importExportStatus = {
    lastExport: new Date(Date.now() - 172800000), // 2 days ago
    lastImport: new Date(Date.now() - 604800000), // 1 week ago
    exportFormat: 'JSON',
    importFormat: 'JSON'
  };

  // UI State
  isSaving = false;
  showApiKey = false;
  selectedApiKey: any = null;
  newApiKeyName = '';
  backupInProgress = false;
  restoreInProgress = false;
  exportInProgress = false;

  // Sound files for notification preview
  soundFiles = ['alert.mp3', 'notification.wav', 'beep.mp3', 'chime.mp3'];

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.createSettingsForm();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private createSettingsForm(): FormGroup {
    return this.fb.group({
      // General settings
      general: this.fb.group({
        airportName: ['International Airport', Validators.required],
        airportCode: ['INT', [Validators.required, Validators.maxLength(3)]],
        timezone: ['UTC', Validators.required],
        language: ['en', Validators.required],
        dateFormat: ['MM/DD/YYYY', Validators.required],
        timeFormat: ['12h', Validators.required],
        currency: ['USD', Validators.required]
      }),

      // Display settings
      display: this.fb.group({
        theme: ['dark', Validators.required],
        density: ['comfortable', Validators.required],
        fontSize: ['medium', Validators.required],
        animationEnabled: [true],
        reducedMotion: [false],
        highContrast: [false]
      }),

      // Notification preferences
      notifications: this.fb.group({
        quietHoursEnabled: [false],
        quietHoursStart: ['22:00'],
        quietHoursEnd: ['06:00'],
        maxNotificationsPerHour: [20, [Validators.min(1), Validators.max(100)]],
        soundVolume: [80, [Validators.min(0), Validators.max(100)]]
      }),

      // User management
      users: this.fb.group({
        defaultRole: ['view_only', Validators.required],
        allowSelfRegistration: [false],
        requireEmailVerification: [true],
        maxLoginAttempts: [5, [Validators.min(1), Validators.max(10)]]
      }),

      // System preferences
      system: this.fb.group({
        autoRefresh: [true],
        refreshInterval: [30, [Validators.min(5), Validators.max(300)]],
        sessionTimeout: [60, [Validators.min(5), Validators.max(240)]],
        dataRetention: [365, [Validators.min(30), Validators.max(730)]],
        maxConcurrentRequests: [10, [Validators.min(1), Validators.max(50)]]
      }),

      // Security settings
      security: this.fb.group({
        twoFactorEnabled: [true],
        autoLogout: [true],
        passwordExpiry: [90, [Validators.min(30), Validators.max(365)]],
        ipWhitelist: this.fb.array([]),
        auditLogging: [true]
      }),

      // Backup settings
      backup: this.fb.group({
        autoBackup: [true],
        backupLocation: ['local', Validators.required],
        backupEncryption: [true],
        backupCompression: [true],
        maxBackupCopies: [10, [Validators.min(1), Validators.max(50)]]
      })
    });
  }

  private initializeForm(): void {
    // Initialize IP whitelist
    const ipWhitelistArray = this.settingsForm.get('security.ipWhitelist') as FormArray;
    ['192.168.1.0/24', '10.0.0.0/8'].forEach(ip => {
      ipWhitelistArray.push(this.fb.control(ip));
    });
  }

  // Tab navigation
  setActiveTab(tab: string): void {
    this.activeTab = tab as 'general' | 'notifications' | 'users' | 'system' | 'backup' | 'api' | 'advanced';
    window.scrollTo(0, 0);
  }

  // Getter methods for form groups
  get generalFormGroup() {
    return this.settingsForm.get('general') as FormGroup;
  }

  get displayFormGroup() {
    return this.settingsForm.get('display') as FormGroup;
  }

  get notificationsFormGroup() {
    return this.settingsForm.get('notifications') as FormGroup;
  }

  get usersFormGroup() {
    return this.settingsForm.get('users') as FormGroup;
  }

  get systemFormGroup() {
    return this.settingsForm.get('system') as FormGroup;
  }

  get securityFormGroup() {
    return this.settingsForm.get('security') as FormGroup;
  }

  get backupFormGroup() {
    return this.settingsForm.get('backup') as FormGroup;
  }

  get ipWhitelistArray() {
    return this.securityFormGroup.get('ipWhitelist') as FormArray;
  }

  // Add IP to whitelist
  addIpToWhitelist(): void {
    this.ipWhitelistArray.push(this.fb.control('', Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/)));
  }

  // Remove IP from whitelist
  removeIpFromWhitelist(index: number): void {
    this.ipWhitelistArray.removeAt(index);
  }

  // Toggle notification setting
  toggleNotificationSetting(setting: NotificationSetting): void {
    setting.enabled = !setting.enabled;
  }

  // Test notification sound
  testNotificationSound(setting: NotificationSetting): void {
    if (setting.type === 'sound' && setting.enabled) {
      // Play test sound
      const audio = new Audio(`assets/sounds/${setting.soundFile || 'alert.mp3'}`);
      audio.play().catch(() => {
        // Fallback to browser beep
        console.log('Test sound played');
      });
    }
  }

  // Create new API key
  createApiKey(): void {
    if (this.newApiKeyName.trim()) {
      const newKey = {
        id: Date.now().toString(),
        name: this.newApiKeyName,
        key: 'api_' + Math.random().toString(36).substr(2, 16),
        created: new Date(),
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        status: 'active'
      };
      
      this.apiKeys.unshift(newKey);
      this.newApiKeyName = '';
      alert(`New API key created: ${newKey.key}`);
    }
  }

  // Revoke API key
  revokeApiKey(apiKey: any): void {
    if (confirm(`Revoke API key "${apiKey.name}"? This action cannot be undone.`)) {
      apiKey.status = 'revoked';
    }
  }

  // Show API key details
  showApiKeyDetails(apiKey: any): void {
    this.selectedApiKey = apiKey;
    this.showApiKey = true;
  }

  // Toggle backup schedule
  toggleBackupSchedule(schedule: BackupSchedule): void {
    schedule.enabled = !schedule.enabled;
    if (schedule.enabled) {
      schedule.nextBackup = this.calculateNextBackup(schedule);
    }
  }

  // Calculate next backup time
  private calculateNextBackup(schedule: BackupSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const next = new Date(now);
    
    next.setHours(hours, minutes, 0, 0);
    
    if (next <= now) {
      if (schedule.frequency === 'daily') {
        next.setDate(next.getDate() + 1);
      } else if (schedule.frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (schedule.frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
      }
    }
    
    return next;
  }

  // Run backup now
  runBackupNow(schedule: BackupSchedule): void {
    this.backupInProgress = true;
    
    // Simulate backup process
    setTimeout(() => {
      schedule.lastBackup = new Date();
      schedule.nextBackup = this.calculateNextBackup(schedule);
      this.backupInProgress = false;
      alert(`Backup "${schedule.name}" completed successfully!`);
    }, 3000);
  }

  // Run system backup
  runSystemBackup(): void {
    this.backupInProgress = true;
    
    setTimeout(() => {
      this.backupInProgress = false;
      this.importExportStatus.lastExport = new Date();
      alert('System backup completed successfully!');
    }, 5000);
  }

  // Restore from backup
  restoreFromBackup(): void {
    if (confirm('Restore from backup? This will overwrite current settings.')) {
      this.restoreInProgress = true;
      
      setTimeout(() => {
        this.restoreInProgress = false;
        this.importExportStatus.lastImport = new Date();
        alert('System restore completed successfully!');
      }, 4000);
    }
  }

  // Export settings
  exportSettings(): void {
    this.exportInProgress = true;
    
    const settingsData = {
      exportedAt: new Date().toISOString(),
      version: this.systemInfo.version,
      settings: this.settingsForm.value,
      notificationSettings: this.notificationSettings,
      systemPreferences: this.systemPreferences,
      backupSchedules: this.backupSchedules,
      apiKeys: this.apiKeys.map(k => ({ ...k, key: undefined })) // Don't export actual keys
    };
    
    setTimeout(() => {
      const dataStr = JSON.stringify(settingsData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `airport-settings-${new Date().toISOString()}.json`);
      linkElement.click();
      
      this.exportInProgress = false;
      this.importExportStatus.lastExport = new Date();
    }, 2000);
  }

  // Import settings
  importSettings(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        this.loadImportedData(data);
        alert('Settings imported successfully!');
      } catch (error) {
        alert('Error importing settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  private loadImportedData(data: any): void {
    // Update form values
    if (data.settings) {
      this.settingsForm.patchValue(data.settings);
    }
    
    // Update notification settings
    if (data.notificationSettings) {
      this.notificationSettings = data.notificationSettings;
    }
    
    // Update import status
    this.importExportStatus.lastImport = new Date();
  }

  // Reset settings to defaults
  resetToDefaults(): void {
    if (confirm('Reset all settings to default values? This cannot be undone.')) {
      this.settingsForm.reset({
        general: {
          airportName: 'International Airport',
          airportCode: 'INT',
          timezone: 'UTC',
          language: 'en',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currency: 'USD'
        },
        display: {
          theme: 'dark',
          density: 'comfortable',
          fontSize: 'medium',
          animationEnabled: true,
          reducedMotion: false,
          highContrast: false
        },
        notifications: {
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '06:00',
          maxNotificationsPerHour: 20,
          soundVolume: 80
        },
        users: {
          defaultRole: 'view_only',
          allowSelfRegistration: false,
          requireEmailVerification: true,
          maxLoginAttempts: 5
        },
        system: {
          autoRefresh: true,
          refreshInterval: 30,
          sessionTimeout: 60,
          dataRetention: 365,
          maxConcurrentRequests: 10
        },
        security: {
          twoFactorEnabled: true,
          autoLogout: true,
          passwordExpiry: 90,
          auditLogging: true
        },
        backup: {
          autoBackup: true,
          backupLocation: 'local',
          backupEncryption: true,
          backupCompression: true,
          maxBackupCopies: 10
        }
      });
      
      // Reset IP whitelist
      const ipWhitelistArray = this.ipWhitelistArray;
      while (ipWhitelistArray.length > 0) {
        ipWhitelistArray.removeAt(0);
      }
      ['192.168.1.0/24', '10.0.0.0/8'].forEach(ip => {
        ipWhitelistArray.push(this.fb.control(ip));
      });
      
      alert('Settings have been reset to default values.');
    }
  }

  // Save settings
  saveSettings(): void {
    if (this.settingsForm.valid) {
      this.isSaving = true;
      
      // Simulate API call
      setTimeout(() => {
        console.log('Settings saved:', this.settingsForm.value);
        this.isSaving = false;
        
        // Show success message
        alert('Settings saved successfully!');
        
        // In a real app, you would persist changes to a backend
        localStorage.setItem('airportSettings', JSON.stringify(this.settingsForm.value));
      }, 1500);
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.settingsForm);
    }
  }

  // Helper to mark form group as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  // Get system preference by category
  getPreferencesByCategory(category: string): SystemPreference[] {
    return this.systemPreferences.filter(pref => pref.category === category);
  }

  // Update system preference
  updateSystemPreference(pref: SystemPreference, value: any): void {
    pref.value = value;
    
    // Apply changes immediately for certain preferences
    if (pref.name === 'Theme') {
      this.applyTheme(value);
    }
  }

  // Apply theme
  private applyTheme(theme: string): void {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    fileInput.click();
  }

  getTabIcon(tab: string): string {
    switch (tab) {
      case 'general': return 'settings';
      case 'notifications': return 'notifications';
      case 'users': return 'people';
      case 'system': return 'dashboard';
      case 'backup': return 'backup';
      case 'api': return 'api';
      case 'advanced': return 'tune';
      default: return 'settings';
    }
  }

  getTabLabel(tab: string): string {
    switch (tab) {
      case 'general': return 'General';
      case 'notifications': return 'Notifications';
      case 'users': return 'Users';
      case 'system': return 'System';
      case 'backup': return 'Backup';
      case 'api': return 'API';
      case 'advanced': return 'Advanced';
      default: return tab;
    }
  }

  // Toggle advanced setting
  toggleAdvancedSetting(setting: keyof typeof this.advancedSettings): void {
    const currentValue = this.advancedSettings[setting];
    if (typeof currentValue === 'boolean') {
      (this.advancedSettings as any)[setting] = !currentValue;
    }
    
    // Apply changes immediately for certain settings
    if (setting === 'debugMode') {
      console.log('Debug mode:', this.advancedSettings.debugMode ? 'enabled' : 'disabled');
    }
  }

  // Clear cache
  clearCache(): void {
    if (confirm('Clear all cached data? This may improve performance but will require reloading data.')) {
      localStorage.removeItem('airportCache');
      alert('Cache cleared successfully!');
    }
  }

  // Clear logs
  clearLogs(): void {
    if (confirm('Clear all system logs? This action cannot be undone.')) {
      // In a real app, this would call an API to clear logs
      alert('Logs cleared successfully!');
    }
  }

  // Format date for display
  formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Get time until next backup
  getTimeUntilNextBackup(schedule: BackupSchedule): string {
    if (!schedule.nextBackup) return 'Not scheduled';
    
    const now = new Date();
    const diffMs = schedule.nextBackup.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `in ${diffMins} minutes`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hours`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays} days`;
    }
  }

  // Get API key status color
  getApiKeyStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'expiring': return 'accent';
      case 'expired': return 'warn';
      case 'revoked': return 'warn';
      default: return 'basic';
    }
  }

  // Get API key status icon
  getApiKeyStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'check_circle';
      case 'expiring': return 'warning';
      case 'expired': return 'error';
      case 'revoked': return 'block';
      default: return 'help';
    }
  }

  // Check if API key is expiring soon (within 30 days)
  isApiKeyExpiringSoon(apiKey: any): boolean {
    if (apiKey.status !== 'active') return false;
    
    const expiryDate = new Date(apiKey.expires);
    const now = new Date();
    const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffDays <= 30;
  }

  // Generate system report
  generateSystemReport(): void {
    const report = {
      generatedAt: new Date().toISOString(),
      systemInfo: this.systemInfo,
      settings: this.settingsForm.value,
      statistics: {
        totalNotifications: this.notificationSettings.length,
        enabledNotifications: this.notificationSettings.filter(n => n.enabled).length,
        totalBackups: this.backupSchedules.length,
        activeBackups: this.backupSchedules.filter(b => b.enabled).length,
        apiKeys: this.apiKeys.length
      }
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `system-report-${new Date().toISOString()}.json`);
    linkElement.click();
  }
}