import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';

// Alert interfaces
export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'security' | 'weather' | 'flight' | 'system' | 'maintenance' | 'baggage';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: Date;
  location: string;
  source: string;
  assignedTo?: string;
  duration?: number; // in minutes
}

export interface AlertTypeConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  soundEnabled: boolean;
  popupEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  severityDefault: Alert['severity'];
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  acknowledgedAlerts: number;
  resolvedToday: number;
  avgResponseTime: number; // in minutes
}

@Component({
  selector: 'app-alert-system',
  templateUrl: './alert-system.html',
  standalone: false,
  styleUrls: ['./alert-system.scss']
})
export class AlertSystem implements OnInit, OnDestroy {
  // Alert data
  alerts: Alert[] = [];
  filteredAlerts: Alert[] = [];

  public windowRef = window;
  
  // Alert type configurations
  alertTypes: AlertTypeConfig[] = [
    { id: 'security', name: 'Security', description: 'Security breaches and incidents', enabled: true, soundEnabled: true, popupEnabled: true, emailEnabled: true, smsEnabled: true, severityDefault: 'critical' },
    { id: 'weather', name: 'Weather', description: 'Weather conditions and warnings', enabled: true, soundEnabled: true, popupEnabled: true, emailEnabled: false, smsEnabled: true, severityDefault: 'high' },
    { id: 'flight', name: 'Flight Operations', description: 'Flight delays, cancellations, issues', enabled: true, soundEnabled: false, popupEnabled: true, emailEnabled: true, smsEnabled: false, severityDefault: 'medium' },
    { id: 'system', name: 'System', description: 'IT and equipment system failures', enabled: true, soundEnabled: true, popupEnabled: true, emailEnabled: true, smsEnabled: true, severityDefault: 'high' },
    { id: 'maintenance', name: 'Maintenance', description: 'Scheduled and unscheduled maintenance', enabled: true, soundEnabled: false, popupEnabled: false, emailEnabled: true, smsEnabled: false, severityDefault: 'low' },
    { id: 'baggage', name: 'Baggage System', description: 'Baggage handling issues', enabled: false, soundEnabled: false, popupEnabled: true, emailEnabled: false, smsEnabled: false, severityDefault: 'medium' }
  ];

  // Statistics
  statistics: AlertStatistics = {
    totalAlerts: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    acknowledgedAlerts: 0,
    resolvedToday: 0,
    avgResponseTime: 8.5
  };

  // Form for alert settings
  settingsForm: FormGroup;
  
  // Filter options
  filterOptions = {
    type: 'all',
    severity: 'all',
    status: 'active',
    timeRange: '24h'
  };

  // Severity options
  severityOptions = ['critical', 'high', 'medium', 'low', 'info'];
  
  // Status options
  statusOptions = ['active', 'acknowledged', 'resolved'];
  
  // Time range options
  timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' }
  ];

  // Real-time simulation
  private alertInterval: any;
  private soundNotification: HTMLAudioElement;
  
  // UI State
  showSettings = false;
  isSoundEnabled = true;
  autoRefresh = true;
  newAlertsCount = 0;

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.createSettingsForm();
    this.soundNotification = new Audio('assets/sounds/notification.mp3');
    
    // Fallback notification sound (beep)
    this.soundNotification.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
  }

  ngOnInit(): void {
    this.initializeAlerts();
    this.applyFilters();
    this.startRealTimeAlerts();
    this.updateStatistics();
  }

  ngOnDestroy(): void {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }
  }

  private createSettingsForm(): FormGroup {
    return this.fb.group({
      alertTypes: this.fb.array([]),
      notificationSettings: this.fb.group({
        soundEnabled: [true],
        popupEnabled: [true],
        emailEnabled: [false],
        smsEnabled: [false],
        quietHoursEnabled: [false],
        quietHoursStart: ['22:00'],
        quietHoursEnd: ['06:00'],
        maxAlertsPerHour: [20, [Validators.min(1), Validators.max(100)]]
      }),
      escalationSettings: this.fb.group({
        autoEscalate: [true],
        escalationTime: [5, [Validators.min(1), Validators.max(60)]], // minutes
        notifySupervisor: [true],
        supervisorEmail: ['', Validators.email]
      })
    });
  }

  private initializeAlerts(): void {
    // Sample alerts data
    this.alerts = [
      {
        id: '1',
        title: 'Security Breach - Terminal A',
        message: 'Unauthorized access detected at Terminal A security checkpoint',
        type: 'security',
        severity: 'critical',
        status: 'active',
        timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        location: 'Terminal A - Security Checkpoint',
        source: 'Security System',
        assignedTo: 'Security Team A',
        duration: 15
      },
      {
        id: '2',
        title: 'Thunderstorm Warning',
        message: 'Severe thunderstorm approaching airport. Wind gusts up to 60 mph expected.',
        type: 'weather',
        severity: 'high',
        status: 'acknowledged',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        location: 'Entire Airport',
        source: 'Weather Service',
        assignedTo: 'Operations Center',
        duration: 45
      },
      {
        id: '3',
        title: 'Flight AA123 Delayed',
        message: 'Flight AA123 to New York delayed by 90 minutes due to weather conditions',
        type: 'flight',
        severity: 'medium',
        status: 'active',
        timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        location: 'Gate A12',
        source: 'Flight Operations',
        assignedTo: 'Gate Agents'
      },
      {
        id: '4',
        title: 'Baggage System Failure',
        message: 'Conveyor belt system failure at Terminal B baggage claim',
        type: 'baggage',
        severity: 'high',
        status: 'active',
        timestamp: new Date(Date.now() - 60 * 60000), // 1 hour ago
        location: 'Terminal B - Baggage Claim',
        source: 'Baggage System',
        assignedTo: 'Maintenance Team',
        duration: 60
      },
      {
        id: '5',
        title: 'IT System Maintenance',
        message: 'Scheduled maintenance of check-in systems starting at 02:00 AM',
        type: 'system',
        severity: 'low',
        status: 'acknowledged',
        timestamp: new Date(Date.now() - 120 * 60000), // 2 hours ago
        location: 'All Terminals',
        source: 'IT Department',
        assignedTo: 'IT Support'
      },
      {
        id: '6',
        title: 'Runway Inspection',
        message: 'Runway 09L/27R closed for routine inspection',
        type: 'maintenance',
        severity: 'info',
        status: 'resolved',
        timestamp: new Date(Date.now() - 180 * 60000), // 3 hours ago
        location: 'Runway 09L/27R',
        source: 'Airfield Operations',
        assignedTo: 'Airfield Maintenance',
        duration: 45
      }
    ];

    // Initialize alert types form array
    const alertTypesArray = this.settingsForm.get('alertTypes') as FormArray;
    this.alertTypes.forEach(alertType => {
      alertTypesArray.push(this.fb.group({
        id: [alertType.id],
        name: [alertType.name],
        enabled: [alertType.enabled],
        soundEnabled: [alertType.soundEnabled],
        popupEnabled: [alertType.popupEnabled],
        emailEnabled: [alertType.emailEnabled],
        smsEnabled: [alertType.smsEnabled],
        severityDefault: [alertType.severityDefault]
      }));
    });
  }

  // Getter for alert types form array
  get alertTypesFormArray(): FormArray {
    return this.settingsForm.get('alertTypes') as FormArray;
  }

  // Get specific alert type form group
  getAlertTypeFormGroup(index: number): FormGroup {
    return this.alertTypesFormArray.at(index) as FormGroup;
  }

  // Apply filters to alerts
  applyFilters(): void {
    this.filteredAlerts = this.alerts.filter(alert => {
      // Filter by type
      if (this.filterOptions.type !== 'all' && alert.type !== this.filterOptions.type) {
        return false;
      }
      
      // Filter by severity
      if (this.filterOptions.severity !== 'all' && alert.severity !== this.filterOptions.severity) {
        return false;
      }
      
      // Filter by status
      if (this.filterOptions.status !== 'all' && alert.status !== this.filterOptions.status) {
        return false;
      }
      
      // Filter by time range
      const now = new Date();
      const alertTime = alert.timestamp;
      
      switch (this.filterOptions.timeRange) {
        case '1h':
          return (now.getTime() - alertTime.getTime()) <= 60 * 60000;
        case '24h':
          return (now.getTime() - alertTime.getTime()) <= 24 * 60 * 60000;
        case '7d':
          return (now.getTime() - alertTime.getTime()) <= 7 * 24 * 60 * 60000;
        case '30d':
          return (now.getTime() - alertTime.getTime()) <= 30 * 24 * 60 * 60000;
        default:
          return true;
      }
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first
  }

  // Update statistics
  updateStatistics(): void {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    this.statistics = {
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => a.status === 'active').length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
      acknowledgedAlerts: this.alerts.filter(a => a.status === 'acknowledged').length,
      resolvedToday: this.alerts.filter(a => 
        a.status === 'resolved' && a.timestamp >= startOfDay
      ).length,
      avgResponseTime: this.calculateAvgResponseTime()
    };
  }

  private calculateAvgResponseTime(): number {
    const resolvedAlerts = this.alerts.filter(a => a.status === 'resolved' && a.duration);
    if (resolvedAlerts.length === 0) return 0;
    
    const totalDuration = resolvedAlerts.reduce((sum, alert) => sum + (alert.duration || 0), 0);
    return Math.round((totalDuration / resolvedAlerts.length) * 10) / 10;
  }

  // Start real-time alert simulation
  private startRealTimeAlerts(): void {
    if (this.autoRefresh) {
      this.alertInterval = setInterval(() => {
        this.simulateNewAlert();
      }, 30000); // Every 30 seconds
    }
  }

  // Simulate a new alert
  private simulateNewAlert(): void {
    const alertTypes = ['security', 'weather', 'flight', 'system', 'maintenance'];
    const severities = ['critical', 'high', 'medium', 'low'];
    const locations = ['Terminal A', 'Terminal B', 'Terminal C', 'Runway 09L', 'Baggage Claim', 'Security Checkpoint'];
    const sources = ['Automated System', 'Manual Report', 'Sensor Network', 'Weather Service'];
    
    const randomType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    
    const newAlert: Alert = {
      id: (this.alerts.length + 1).toString(),
      title: `${this.getAlertTypeName(randomType)} Alert - ${randomLocation}`,
      message: `Automated alert generated for ${randomLocation}. Please review and take appropriate action.`,
      type: randomType as any,
      severity: randomSeverity as any,
      status: 'active',
      timestamp: new Date(),
      location: randomLocation,
      source: randomSource
    };
    
    this.alerts.unshift(newAlert); // Add to beginning
    this.applyFilters();
    this.updateStatistics();
    this.newAlertsCount++;
    
    // Play sound if enabled
    if (this.isSoundEnabled) {
      this.playNotificationSound();
    }
    
    // Show notification if enabled
    if (this.settingsForm.get('notificationSettings.popupEnabled')?.value) {
      this.showNotification(newAlert);
    }
  }

  // Get alert type name from ID
  getAlertTypeName(typeId: string): string {
    const alertType = this.alertTypes.find(at => at.id === typeId);
    return alertType ? alertType.name : typeId;
  }

  // Play notification sound
  private playNotificationSound(): void {
    try {
      this.soundNotification.currentTime = 0;
      this.soundNotification.play().catch(e => console.log('Sound play failed:', e));
    } catch (error) {
      console.log('Sound notification error:', error);
    }
  }

  // Show browser notification
  private showNotification(alert: Alert): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Airport Alert: ${alert.title}`, {
        body: alert.message,
        icon: 'assets/icons/airport-icon.png',
        tag: alert.id
      });
    }
  }

  // Request notification permission
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }

  // Acknowledge alert
  acknowledgeAlert(alert: Alert): void {
    const alertIndex = this.alerts.findIndex(a => a.id === alert.id);
    if (alertIndex !== -1) {
      this.alerts[alertIndex].status = 'acknowledged';
      this.alerts[alertIndex].assignedTo = 'Current User';
      this.applyFilters();
      this.updateStatistics();
    }
  }

  // Resolve alert
  resolveAlert(alert: Alert): void {
    const alertIndex = this.alerts.findIndex(a => a.id === alert.id);
    if (alertIndex !== -1) {
      this.alerts[alertIndex].status = 'resolved';
      const createdTime = this.alerts[alertIndex].timestamp.getTime();
      const resolvedTime = new Date().getTime();
      this.alerts[alertIndex].duration = Math.round((resolvedTime - createdTime) / 60000);
      this.applyFilters();
      this.updateStatistics();
    }
  }

  // Get severity color
  getSeverityColor(severity: Alert['severity']): string {
    const colors = {
      critical: 'warn',
      high: 'accent',
      medium: 'primary',
      low: 'basic',
      info: 'basic'
    };
    return colors[severity] || 'basic';
  }

  // Get severity icon
  getSeverityIcon(severity: Alert['severity']): string {
    const icons = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'info',
      info: 'notifications'
    };
    return icons[severity] || 'notifications';
  }

  // Get alert type icon
  getAlertTypeIcon(type: Alert['type']): string {
    const icons = {
      security: 'security',
      weather: 'cloud',
      flight: 'flight',
      system: 'computer',
      maintenance: 'build',
      baggage: 'luggage'
    };
    return icons[type] || 'notification_important';
  }

  // Format timestamp
  formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Clear new alerts count
  clearNewAlerts(): void {
    this.newAlertsCount = 0;
  }

  // Toggle settings panel
  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  // Save settings
  saveSettings(): void {
    if (this.settingsForm.valid) {
      // Update alert types configuration
      const formValues = this.settingsForm.value;
      formValues.alertTypes.forEach((updatedType: any, index: number) => {
        this.alertTypes[index] = { ...this.alertTypes[index], ...updatedType };
      });
      
      // Update sound enabled
      this.isSoundEnabled = formValues.notificationSettings.soundEnabled;
      
      // Update auto-refresh based on settings
      this.autoRefresh = true; // Always auto-refresh for demo
      
      this.showSettings = false;
      console.log('Settings saved:', formValues);
    }
  }

  // Export alerts
  exportAlerts(): void {
    const exportData = {
      exportedAt: new Date().toISOString(),
      alerts: this.alerts,
      statistics: this.statistics,
      filters: this.filterOptions
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `airport-alerts-${new Date().toISOString()}.json`);
    linkElement.click();
  }

  // Toggle auto refresh
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startRealTimeAlerts();
    } else if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }
  }
}
