import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Command interface
export interface Command {
  id: string;
  name: string;
  description: string;
  category: 'airfield' | 'terminal' | 'security' | 'systems' | 'emergency';
  type: 'toggle' | 'value' | 'action' | 'schedule';
  currentValue: any;
  targetValue?: any;
  status: 'idle' | 'executing' | 'success' | 'failed';
  lastExecuted?: Date;
  requiresConfirmation: boolean;
  minValue?: number;
  maxValue?: number;
  step?: number;
  unit?: string;
}

// System status interface
export interface SystemStatus {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  uptime: number; // percentage
  responseTime: number; // ms
  lastCheck: Date;
  critical: boolean;
}

// Emergency protocol interface
export interface EmergencyProtocol {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: string[];
  estimatedTime: number; // minutes
  status: 'ready' | 'active' | 'completed';
  assignedTeam: string;
}

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.html',
  standalone: false,
  styleUrls: ['./control-panel.scss'],
})
export class ControlPanel implements OnInit, OnDestroy {

  public windowRef: any = window;

  // Commands data
  commands: Command[] = [
    {
      id: '1',
      name: 'Runway Lights',
      description: 'Control runway lighting system',
      category: 'airfield',
      type: 'toggle',
      currentValue: true,
      status: 'idle',
      requiresConfirmation: false
    },
    {
      id: '2',
      name: 'Security Level',
      description: 'Set airport security level',
      category: 'security',
      type: 'value',
      currentValue: 3,
      targetValue: 3,
      status: 'idle',
      requiresConfirmation: true,
      minValue: 1,
      maxValue: 5,
      step: 1
    },
    {
      id: '3',
      name: 'Terminal HVAC',
      description: 'Adjust terminal temperature',
      category: 'terminal',
      type: 'value',
      currentValue: 22,
      targetValue: 22,
      status: 'idle',
      requiresConfirmation: false,
      minValue: 18,
      maxValue: 26,
      step: 1,
      unit: '°C'
    },
    {
      id: '4',
      name: 'Announcement System',
      description: 'Broadcast airport announcements',
      category: 'systems',
      type: 'action',
      currentValue: false,
      status: 'idle',
      requiresConfirmation: true
    },
    {
      id: '5',
      name: 'Gate Assignment',
      description: 'Auto-assign gates for arriving flights',
      category: 'terminal',
      type: 'action',
      currentValue: false,
      status: 'idle',
      requiresConfirmation: true
    },
    {
      id: '6',
      name: 'Emergency Lighting',
      description: 'Activate emergency lighting system',
      category: 'emergency',
      type: 'toggle',
      currentValue: false,
      status: 'idle',
      requiresConfirmation: true
    },
    {
      id: '7',
      name: 'Fire Suppression',
      description: 'Control fire suppression systems',
      category: 'emergency',
      type: 'toggle',
      currentValue: false,
      status: 'idle',
      requiresConfirmation: true
    },
    {
      id: '8',
      name: 'Baggage System Speed',
      description: 'Adjust baggage conveyor speed',
      category: 'systems',
      type: 'value',
      currentValue: 75,
      targetValue: 75,
      status: 'idle',
      requiresConfirmation: false,
      minValue: 0,
      maxValue: 100,
      step: 5,
      unit: '%'
    }
  ];

  // System status data
  systemStatuses: SystemStatus[] = [
    { id: '1', name: 'Flight Operations', status: 'online', uptime: 99.8, responseTime: 120, lastCheck: new Date(), critical: true },
    { id: '2', name: 'Security Systems', status: 'online', uptime: 99.9, responseTime: 85, lastCheck: new Date(), critical: true },
    { id: '3', name: 'Baggage Handling', status: 'degraded', uptime: 95.2, responseTime: 250, lastCheck: new Date(Date.now() - 300000), critical: true },
    { id: '4', name: 'HVAC Systems', status: 'online', uptime: 98.7, responseTime: 180, lastCheck: new Date(), critical: false },
    { id: '5', name: 'Lighting Control', status: 'online', uptime: 99.5, responseTime: 95, lastCheck: new Date(), critical: false },
    { id: '6', name: 'PA System', status: 'maintenance', uptime: 88.3, responseTime: 350, lastCheck: new Date(Date.now() - 600000), critical: false },
    { id: '7', name: 'Surveillance', status: 'online', uptime: 99.7, responseTime: 110, lastCheck: new Date(), critical: true },
    { id: '8', name: 'Fire Safety', status: 'online', uptime: 100, responseTime: 65, lastCheck: new Date(), critical: true }
  ];

  // Emergency protocols
  emergencyProtocols: EmergencyProtocol[] = [
    {
      id: '1',
      name: 'Security Breach',
      description: 'Response to unauthorized access or security threats',
      severity: 'critical',
      steps: [
        'Lockdown affected areas',
        'Alert security teams',
        'Evacuate if necessary',
        'Coordinate with authorities'
      ],
      estimatedTime: 15,
      status: 'ready',
      assignedTeam: 'Security Team A'
    },
    {
      id: '2',
      name: 'Medical Emergency',
      description: 'Response to passenger or staff medical emergencies',
      severity: 'high',
      steps: [
        'Alert medical team',
        'Secure area',
        'Provide first aid',
        'Prepare for ambulance arrival'
      ],
      estimatedTime: 10,
      status: 'ready',
      assignedTeam: 'Medical Response'
    },
    {
      id: '3',
      name: 'Fire Emergency',
      description: 'Response to fire incidents',
      severity: 'critical',
      steps: [
        'Activate fire alarms',
        'Evacuate affected area',
        'Deploy fire suppression',
        'Account for all personnel'
      ],
      estimatedTime: 20,
      status: 'ready',
      assignedTeam: 'Fire Safety Team'
    },
    {
      id: '4',
      name: 'System Failure',
      description: 'Response to critical system failures',
      severity: 'medium',
      steps: [
        'Isolate affected systems',
        'Activate backups',
        'Notify technical teams',
        'Implement workarounds'
      ],
      estimatedTime: 30,
      status: 'ready',
      assignedTeam: 'Technical Support'
    }
  ];

  // Command form
  commandForm: FormGroup;
  
  // Active command being executed
  activeCommand: Command | null = null;
  commandConfirmationOpen = false;
  commandProgress = 0;
  
  // UI State
  selectedCategory: string = 'all';
  showEmergencyPanel = false;
  showSystemDetails = false;
  selectedSystem: SystemStatus | null = null;
  
  // Categories
  categories = [
    { id: 'all', name: 'All Commands', icon: 'apps' },
    { id: 'airfield', name: 'Airfield', icon: 'flight_takeoff' },
    { id: 'terminal', name: 'Terminal', icon: 'apartment' },
    { id: 'security', name: 'Security', icon: 'security' },
    { id: 'systems', name: 'Systems', icon: 'settings' },
    { id: 'emergency', name: 'Emergency', icon: 'warning' }
  ];

  // Statistics
  statistics = {
    totalCommands: 0,
    successfulToday: 12,
    failedToday: 1,
    avgResponseTime: 2.5, // seconds
    systemHealth: 96.5 // percentage
  };

  // Simulation timers
  private simulationTimers: any[] = [];
  
  // Audio for alerts
  private alertSound: HTMLAudioElement;

  constructor(private fb: FormBuilder) {
    this.commandForm = this.createCommandForm();
    this.alertSound = new Audio('assets/sounds/alert.mp3');
    
    // Set up statistics
    this.updateStatistics();
  }

  ngOnInit(): void {
    // Start system status simulation
    this.startSystemStatusSimulation();
  }

  ngOnDestroy(): void {
    // Clear all timers
    this.simulationTimers.forEach(timer => clearInterval(timer));
    this.simulationTimers = [];
  }

  private createCommandForm(): FormGroup {
    return this.fb.group({
      customCommand: ['', Validators.required],
      commandType: ['action', Validators.required],
      targetSystem: ['', Validators.required],
      priority: ['normal', Validators.required],
      scheduledTime: [''],
      requireApproval: [false]
    });
  }

  // Get filtered commands based on selected category
  get filteredCommands(): Command[] {
    if (this.selectedCategory === 'all') {
      return this.commands;
    }
    return this.commands.filter(command => command.category === this.selectedCategory);
  }

  // Get commands by category
  getCommandsByCategory(category: string): Command[] {
    return this.commands.filter(cmd => cmd.category === category);
  }

  getSelectedCategoryName(): string {
    const category = this.categories.find(c => c.id === this.selectedCategory);
    return category ? category.name : 'All Commands';
  }

  // Execute a command
  executeCommand(command: Command, value?: any): void {
    if (command.requiresConfirmation && !this.commandConfirmationOpen) {
      this.activeCommand = command;
      if (value !== undefined) {
        command.targetValue = value;
      }
      this.commandConfirmationOpen = true;
      return;
    }

    this.startCommandExecution(command, value);
  }

  // Start command execution
  private startCommandExecution(command: Command, value?: any): void {
    command.status = 'executing';
    this.commandProgress = 0;
    
    // Update value if provided
    if (value !== undefined) {
      command.targetValue = value;
    }

    // Simulate command execution
    const timer = setInterval(() => {
      this.commandProgress += 10;
      
      if (this.commandProgress >= 100) {
        clearInterval(timer);
        command.status = Math.random() > 0.9 ? 'failed' : 'success';
        command.currentValue = command.targetValue || !command.currentValue;
        command.lastExecuted = new Date();
        
        // Update statistics
        this.updateStatistics();
        
        // Reset confirmation dialog
        this.commandConfirmationOpen = false;
        this.activeCommand = null;
        
        // Play success/failure sound
        this.playCommandSound(command.status);
        
        // Show notification
        this.showCommandNotification(command);
      }
    }, 100);

    this.simulationTimers.push(timer);
  }

  // Confirm command execution
  confirmCommandExecution(): void {
    if (this.activeCommand) {
      this.startCommandExecution(this.activeCommand, this.activeCommand.targetValue);
    }
  }

  // Cancel command execution
  cancelCommandExecution(): void {
    this.commandConfirmationOpen = false;
    this.activeCommand = null;
  }

  // Play command sound
  private playCommandSound(status: string): void {
    if (status === 'success') {
      // Success sound
      const successSound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      successSound.play().catch(() => {});
    } else if (status === 'failed') {
      // Error sound
      const errorSound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      errorSound.play().catch(() => {});
    }
  }

  // Show command notification
  private showCommandNotification(command: Command): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const statusText = command.status === 'success' ? 'completed successfully' : 'failed';
      new Notification(`Command ${statusText}`, {
        body: `${command.name} ${statusText}`,
        icon: 'assets/icons/command.png'
      });
    }
  }

  // Update statistics
  private updateStatistics(): void {
    const successfulCommands = this.commands.filter(cmd => 
      cmd.status === 'success' && 
      cmd.lastExecuted && 
      this.isToday(cmd.lastExecuted)
    ).length;

    const failedCommands = this.commands.filter(cmd => 
      cmd.status === 'failed' && 
      cmd.lastExecuted && 
      this.isToday(cmd.lastExecuted)
    ).length;

    this.statistics = {
      totalCommands: this.commands.length,
      successfulToday: successfulCommands,
      failedToday: failedCommands,
      avgResponseTime: 2.5, // Would be calculated from actual data
      systemHealth: this.calculateSystemHealth()
    };
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  private calculateSystemHealth(): number {
    const onlineSystems = this.systemStatuses.filter(sys => sys.status === 'online').length;
    return Math.round((onlineSystems / this.systemStatuses.length) * 1000) / 10;
  }

  // Add this method to your component
  async requestNotificationPermission() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      alert('Your browser does not support notifications');
      return false;
    }

    // Check current permission status
    if (Notification.permission === 'granted') {
      console.log('Notifications are already enabled');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notifications are blocked. Please enable them in browser settings.');
      alert('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted!');
        // You can show a test notification
        this.showTestNotification();
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Optional: Show a test notification
  private showTestNotification() {
    if (Notification.permission === 'granted') {
      const notification = new Notification('Notifications Enabled!', {
        body: 'You will now receive notifications from our app.',
        icon: '/assets/notification-icon.png', // Optional: add your icon
        badge: '/assets/notification-badge.png' // Optional
      });

      // Close notification after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }

  // Start system status simulation
  public startSystemStatusSimulation(): void {
    const timer = setInterval(() => {
      // Randomly update system statuses
      this.systemStatuses.forEach(system => {
        if (Math.random() > 0.95) { // 5% chance to change status
          const statuses: SystemStatus['status'][] = ['online', 'degraded', 'offline', 'maintenance'];
          const currentIndex = statuses.indexOf(system.status);
          const newIndex = (currentIndex + 1) % statuses.length;
          system.status = statuses[newIndex];
          system.lastCheck = new Date();
          system.uptime = Math.max(80, Math.min(100, system.uptime + (Math.random() - 0.5) * 5));
        }
      });
      
      // Update statistics
      this.updateStatistics();
    }, 30000); // Update every 30 seconds

    this.simulationTimers.push(timer);
  }

  // Get status color
  getStatusColor(status: string): string {
    switch(status) {
      case 'online': return 'success';
      case 'degraded': return 'accent';
      case 'offline': return 'warn';
      case 'maintenance': return 'primary';
      default: return 'basic';
    }
  }

  // Get status icon
  getStatusIcon(status: string): string {
    switch(status) {
      case 'online': return 'check_circle';
      case 'degraded': return 'warning';
      case 'offline': return 'error';
      case 'maintenance': return 'build';
      default: return 'help';
    }
  }

  // Get category icon
  getCategoryIcon(category: string): string {
    const categoryMap: {[key: string]: string} = {
      'airfield': 'flight_takeoff',
      'terminal': 'apartment',
      'security': 'security',
      'systems': 'settings',
      'emergency': 'warning'
    };
    return categoryMap[category] || 'settings';
  }

  // Get severity color for emergency protocols
  getSeverityColor(severity: string): string {
    switch(severity) {
      case 'critical': return 'warn';
      case 'high': return 'accent';
      case 'medium': return 'primary';
      case 'low': return 'basic';
      default: return 'basic';
    }
  }

  // Activate emergency protocol
  activateEmergencyProtocol(protocol: EmergencyProtocol): void {
    if (confirm(`Activate ${protocol.name} emergency protocol? This will initiate ${protocol.steps.length} steps.`)) {
      protocol.status = 'active';
      
      // Play emergency alert sound
      this.playEmergencyAlert();
      
      // Show emergency notification
      this.showEmergencyNotification(protocol);
      
      // Simulate protocol execution
      setTimeout(() => {
        protocol.status = 'completed';
      }, protocol.estimatedTime * 60000); // Convert minutes to milliseconds
    }
  }

  // Play emergency alert
  private playEmergencyAlert(): void {
    try {
      this.alertSound.currentTime = 0;
      this.alertSound.play().catch(() => {});
    } catch (error) {
      console.log('Alert sound error:', error);
    }
  }

  // Show emergency notification
  private showEmergencyNotification(protocol: EmergencyProtocol): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Emergency Protocol Activated`, {
        body: `${protocol.name} protocol initiated. ${protocol.steps.length} steps to follow.`,
        icon: 'assets/icons/emergency.png'
      });
    }
  }

  // Toggle emergency panel
  toggleEmergencyPanel(): void {
    this.showEmergencyPanel = !this.showEmergencyPanel;
  }

  // Show system details
  showSystemDetailsDialog(system: SystemStatus): void {
    this.selectedSystem = system;
    this.showSystemDetails = true;
  }

  // Close system details
  closeSystemDetails(): void {
    this.showSystemDetails = false;
    this.selectedSystem = null;
  }

  // Send custom command
  sendCustomCommand(): void {
    if (this.commandForm.valid) {
      const formValue = this.commandForm.value;
      
      const newCommand: Command = {
        id: Date.now().toString(),
        name: formValue.customCommand,
        description: `Custom command for ${formValue.targetSystem}`,
        category: 'systems',
        type: formValue.commandType as any,
        currentValue: null,
        status: 'idle',
        requiresConfirmation: formValue.requireApproval
      };

      this.commands.unshift(newCommand);
      
      // Reset form
      this.commandForm.reset({
        commandType: 'action',
        priority: 'normal',
        requireApproval: false
      });

      // Show success message
      alert(`Custom command "${formValue.customCommand}" added to queue`);
    }
  }

  // Get system health status
  getSystemHealthStatus(): { status: string, color: string, icon: string } {
    const health = this.statistics.systemHealth;
    
    if (health >= 95) {
      return { status: 'Excellent', color: 'success', icon: 'check_circle' };
    } else if (health >= 85) {
      return { status: 'Good', color: 'primary', icon: 'check' };
    } else if (health >= 70) {
      return { status: 'Fair', color: 'accent', icon: 'warning' };
    } else {
      return { status: 'Poor', color: 'warn', icon: 'error' };
    }
  }

  // Format uptime
  formatUptime(uptime: number): string {
    return `${uptime.toFixed(1)}%`;
  }

  // Format response time
  formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  }

  // Get time ago
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Execute quick action
  executeQuickAction(action: string): void {
    let command: Command | undefined;
    
    switch(action) {
      case 'lights_on':
        command = this.commands.find(c => c.name === 'Runway Lights');
        if (command && !command.currentValue) {
          this.executeCommand(command);
        }
        break;
      case 'lights_off':
        command = this.commands.find(c => c.name === 'Runway Lights');
        if (command && command.currentValue) {
          this.executeCommand(command);
        }
        break;
      case 'emergency_lights':
        command = this.commands.find(c => c.name === 'Emergency Lighting');
        if (command) {
          this.executeCommand(command);
        }
        break;
      case 'all_systems_check':
        // Simulate system check
        this.systemStatuses.forEach(system => {
          system.lastCheck = new Date();
        });
        alert('All systems checked successfully');
        break;
    }
  }

  // Reset all commands
  resetAllCommands(): void {
    if (confirm('Reset all commands to default values?')) {
      this.commands.forEach(command => {
        command.status = 'idle';
        command.currentValue = this.getDefaultValue(command);
        command.targetValue = undefined;
      });
      this.updateStatistics();
    }
  }

  private getDefaultValue(command: Command): any {
    switch(command.name) {
      case 'Runway Lights': return true;
      case 'Security Level': return 3;
      case 'Terminal HVAC': return 22;
      case 'Baggage System Speed': return 75;
      default: return false;
    }
  }

  // Export command logs
  exportCommandLogs(): void {
    const logs = {
      exportedAt: new Date().toISOString(),
      commands: this.commands,
      statistics: this.statistics,
      systemStatuses: this.systemStatuses
    };
    
    const dataStr = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `control-panel-logs-${new Date().toISOString()}.json`);
    linkElement.click();
  }
}