import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  // Audio element reference
  @ViewChild('notificationSound') notificationSoundRef!: ElementRef<HTMLAudioElement>;
  
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
  
  // UI State
  showSettings = false;
  isSoundEnabled = true;
  autoRefresh = true;
  newAlertsCount = 0;

  // Web Audio API context
  private audioContext: AudioContext | null = null;
  private audioInitialized = false;

  constructor(private fb: FormBuilder) {
    this.settingsForm = this.createSettingsForm();
  }

  ngOnInit(): void {
    this.initializeAlerts();
    this.applyFilters();
    this.startRealTimeAlerts();
    this.updateStatistics();
    this.requestNotificationPermission();
    
    // Initialize audio context on user interaction
    this.initAudioOnUserInteraction();
  }

  ngOnDestroy(): void {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
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
        escalationTime: [5, [Validators.min(1), Validators.max(60)]],
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
        timestamp: new Date(Date.now() - 15 * 60000),
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
        timestamp: new Date(Date.now() - 45 * 60000),
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
        timestamp: new Date(Date.now() - 30 * 60000),
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
        timestamp: new Date(Date.now() - 60 * 60000),
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
        timestamp: new Date(Date.now() - 120 * 60000),
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
        timestamp: new Date(Date.now() - 180 * 60000),
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

  // Initialize audio on user interaction
  private initAudioOnUserInteraction(): void {
    const initAudio = () => {
      if (!this.audioInitialized) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioInitialized = true;
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
  }

  // Play notification sound using Web Audio API
  private playNotificationSound(): void {
    if (!this.isSoundEnabled) return;

    try {
      // Create audio context if not initialized
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Create oscillator for beep sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5 note
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.2);

      // Play second beep for critical alerts
      setTimeout(() => {
        if (this.audioContext) {
          const oscillator2 = this.audioContext.createOscillator();
          const gainNode2 = this.audioContext.createGain();

          oscillator2.type = 'sine';
          oscillator2.frequency.setValueAtTime(880, this.audioContext.currentTime);
          
          gainNode2.gain.setValueAtTime(0.1, this.audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

          oscillator2.connect(gainNode2);
          gainNode2.connect(this.audioContext.destination);

          oscillator2.start();
          oscillator2.stop(this.audioContext.currentTime + 0.15);
        }
      }, 300);

    } catch (error) {
      console.log('Web Audio API error:', error);
      // Fallback to simple beep using Web Audio if available
      this.fallbackBeep();
    }
  }

  // Fallback beep using standard Web Audio
  private fallbackBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
      
      setTimeout(() => audioCtx.close(), 500);
    } catch (e) {
      console.log('Fallback beep also failed:', e);
    }
  }

  // Show browser notification
  private showNotification(alert: Alert): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Airport Alert: ${alert.title}`, {
          body: alert.message,
          icon: 'assets/icons/alert-icon.png',
          tag: alert.id,
          requireInteraction: true,
          silent: !this.isSoundEnabled
        });
      } catch (error) {
        console.log('Notification error:', error);
      }
    }
  }

  // Request notification permission
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }

  // Apply filters to alerts
  applyFilters(): void {
    this.filteredAlerts = this.alerts.filter(alert => {
      if (this.filterOptions.type !== 'all' && alert.type !== this.filterOptions.type) {
        return false;
      }
      
      if (this.filterOptions.severity !== 'all' && alert.severity !== this.filterOptions.severity) {
        return false;
      }
      
      if (this.filterOptions.status !== 'all' && alert.status !== this.filterOptions.status) {
        return false;
      }
      
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
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
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
      }, 45000); // Every 45 seconds
    }
  }

  // Simulate a new alert
  private simulateNewAlert(): void {
    const alertTypes = ['security', 'weather', 'flight', 'system', 'maintenance'] as const;
    const severities = ['critical', 'high', 'medium', 'low'] as const;
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
      type: randomType,
      severity: randomSeverity,
      status: 'active',
      timestamp: new Date(),
      location: randomLocation,
      source: randomSource
    };
    
    this.alerts.unshift(newAlert);
    this.applyFilters();
    this.updateStatistics();
    this.newAlertsCount++;
    
    // Check quiet hours
    if (this.isQuietHours()) {
      console.log('Quiet hours active, sound suppressed');
      return;
    }
    
    // Play sound if enabled for this alert type
    const alertTypeConfig = this.alertTypes.find(at => at.id === randomType);
    if (alertTypeConfig?.soundEnabled && this.isSoundEnabled) {
      this.playNotificationSound();
    }
    
    // Show notification if enabled for this alert type
    if (alertTypeConfig?.popupEnabled && 
        this.settingsForm.get('notificationSettings.popupEnabled')?.value) {
      this.showNotification(newAlert);
    }
  }

  // Check if current time is within quiet hours
  private isQuietHours(): boolean {
    const quietHoursEnabled = this.settingsForm.get('notificationSettings.quietHoursEnabled')?.value;
    if (!quietHoursEnabled) return false;

    const now = new Date();
    const start = this.settingsForm.get('notificationSettings.quietHoursStart')?.value;
    const end = this.settingsForm.get('notificationSettings.quietHoursEnd')?.value;

    if (!start || !end) return false;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // Get alert type name from ID
  getAlertTypeName(typeId: string): string {
    const alertType = this.alertTypes.find(at => at.id === typeId);
    return alertType ? alertType.name : typeId;
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
      const formValues = this.settingsForm.value;
      formValues.alertTypes.forEach((updatedType: any, index: number) => {
        this.alertTypes[index] = { ...this.alertTypes[index], ...updatedType };
      });
      
      this.isSoundEnabled = formValues.notificationSettings.soundEnabled;
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

  // Test sound
  testSound(): void {
    this.playNotificationSound();
  }
}