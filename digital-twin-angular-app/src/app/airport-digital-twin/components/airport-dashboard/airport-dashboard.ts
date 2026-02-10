import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, interval, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AirportDataService } from '../../services/airport-data.service';
import { AlertService } from '../../services/alert.service';
import { SimulationService } from '../../services/simulation.service';
import { WeatherService } from '../../services/weather.service';

import { AirportMetrics, FlightStatus, GateStatus, TerminalStatus, Alert } from '../../models/airport-models';
import { AlertDialog } from '../alert-dialog/alert-dialog';
import { SettingsDialog } from '../settings-dialog/settings-dialog';

@Component({
  selector: 'app-airport-dashboard',
  templateUrl: './airport-dashboard.html',
  standalone: false,
  styleUrls: ['./airport-dashboard.scss']
})
export class AirportDashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dashboardRef') dashboardRef!: ElementRef;
  @ViewChild('metricsContainer') metricsContainer!: ElementRef;

  // Dashboard state
  selectedTabIndex = 0;
  isFullscreen = false;
  isLoading = true;
  autoRefreshEnabled = true;
  lastUpdateTime = new Date();

  // Real-time data
  airportMetrics: AirportMetrics = {
    totalFlights: 0,
    activeFlights: 0,
    delayedFlights: 0,
    passengerCount: 0,
    securityWaitTime: 0,
    baggageWaitTime: 0,
    gateOccupancy: 0,
    weatherCondition: 'Loading...'
  };

  recentFlights: FlightStatus[] = [];
  gateStatus: GateStatus[] = [];
  terminalStatus: TerminalStatus[] = [];
  activeAlerts: Alert[] = [];

  // Simulation controls
  simulationSpeed = 1.0;
  isSimulationRunning = true;
  simulationTime = new Date();
  
  // Performance metrics
  systemPerformance = {
    cpuUsage: 45,
    memoryUsage: 68,
    networkLatency: 12,
    dataRefreshRate: 5
  };

  // Weather data
  weatherData = {
    temperature: 22,
    condition: 'Sunny',
    humidity: 65,
    windSpeed: 12,
    visibility: 10,
    icon: 'wb_sunny'
  };

  // Filter states
  terminalFilter = 'All';
  statusFilter = 'All';
  timeRangeFilter = 'Today';

  // Dashboard layout
  dashboardLayout = 'default'; // 'default' | 'compact' | 'expanded'
  showCharts = true;
  showNotifications = true;
  showPerformance = true;

  // Subscriptions
  private dataSubscriptions: Subscription[] = [];
  private simulationSubscription?: Subscription;
  private alertSubscription?: Subscription;

  constructor(
    private airportDataService: AirportDataService,
    private alertService: AlertService,
    private simulationService: SimulationService,
    private weatherService: WeatherService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.setupDataSubscriptions();
    this.startSimulation();
    this.setupResizeListener();
  }

  ngAfterViewInit(): void {
    // Initialize any view-specific logic
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  initializeDashboard(): void {
    // Load initial data
    this.loadDashboardData();
    
    // Set initial simulation time
    this.simulationTime = new Date();
    
    // Load user preferences
    this.loadUserPreferences();
  }

  loadDashboardData(): void {
    this.airportDataService.getAirportMetrics().subscribe(metrics => {
      this.airportMetrics = metrics;
      this.lastUpdateTime = new Date();
    });

    this.airportDataService.getFlightStatus().subscribe(flights => {
      this.recentFlights = flights.slice(0, 5); // Show only recent 5 flights
    });

    this.airportDataService.getGateStatus().subscribe(gates => {
      this.gateStatus = gates;
    });

    this.airportDataService.getTerminalStatus().subscribe(terminals => {
      this.terminalStatus = terminals;
    });

    this.weatherService.getCurrentWeather().subscribe(weather => {
      this.weatherData = weather;
      this.airportMetrics.weatherCondition = weather.condition;
    });
  }

  setupDataSubscriptions(): void {
    // Auto-refresh subscription
    const refreshSubscription = interval(this.systemPerformance.dataRefreshRate * 1000)
      .subscribe(() => {
        if (this.autoRefreshEnabled && this.isSimulationRunning) {
          this.refreshDashboardData();
        }
      });

    // Alert subscription
    this.alertSubscription = this.alertService.getAlertsStream().subscribe(alerts => {
      this.activeAlerts = alerts.filter(alert => !alert.acknowledged && alert.priority <= 2);
    });

    // Performance metrics subscription
    const performanceSubscription = interval(10000).subscribe(() => {
      this.updatePerformanceMetrics();
    });

    this.dataSubscriptions.push(refreshSubscription, performanceSubscription);
  }

  startSimulation(): void {
    if (this.simulationSubscription) {
      this.simulationSubscription.unsubscribe();
    }

    this.simulationSubscription = timer(0, 1000).subscribe(() => {
      if (this.isSimulationRunning) {
        // Increment simulation time based on speed
        const increment = 60000 * this.simulationSpeed; // 1 minute * speed
        this.simulationTime = new Date(this.simulationTime.getTime() + increment);
        
        // Update simulation data
        this.simulationService.updateSimulation();
      }
    });
  }

  refreshDashboardData(): void {
    this.airportDataService.refreshMetrics().subscribe(metrics => {
      this.airportMetrics = metrics;
      this.lastUpdateTime = new Date();
    });

    // Refresh other data points
    this.airportDataService.getFlightStatus().subscribe(flights => {
      this.recentFlights = flights.slice(0, 5);
    });
  }

  hasCriticalAlerts(): boolean {
    return this.activeAlerts.some(alert => alert.priority === 1);
  }

  getCriticalAlertCount(): number {
    return this.activeAlerts.filter(alert => alert.priority === 1).length;
  }

  getTerminalOccupancy(terminalId: string): number {
    const terminal = this.terminalStatus.find(t => t.id === terminalId);
    return terminal ? terminal.passengerCount : 0;
  }

  updatePerformanceMetrics(): void {
    // Simulate system performance metrics
    this.systemPerformance = {
      cpuUsage: Math.min(100, Math.max(0, this.systemPerformance.cpuUsage + (Math.random() * 10 - 5))),
      memoryUsage: Math.min(100, Math.max(0, this.systemPerformance.memoryUsage + (Math.random() * 5 - 2.5))),
      networkLatency: Math.max(1, this.systemPerformance.networkLatency + (Math.random() * 2 - 1)),
      dataRefreshRate: this.systemPerformance.dataRefreshRate
    };
  }

  // Event Handlers
  onTabChanged(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index;
    this.saveUserPreferences();
  }

  toggleSimulation(): void {
    this.isSimulationRunning = !this.isSimulationRunning;
    if (this.isSimulationRunning) {
      this.startSimulation();
    }
  }

  changeSimulationSpeed(speed: number): void {
    this.simulationSpeed = speed;
    this.simulationService.setSimulationSpeed(speed);
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    const elem = this.dashboardRef?.nativeElement;
    
    if (this.isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }

  changeLayout(layout: string): void {
    this.dashboardLayout = layout;
    this.saveUserPreferences();
  }

  filterByTerminal(terminal: string): void {
    this.terminalFilter = terminal;
    // Apply filter logic here
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    // Apply filter logic here
  }

  // Alert and Notification Handlers
  viewAlertDetails(alert: Alert): void {
    const dialogRef = this.dialog.open(AlertDialog, {
      width: '500px',
      data: { alert }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.acknowledged) {
        this.alertService.acknowledgeAlert(alert.id).subscribe();
      }
    });
  }

  acknowledgeAllAlerts(): void {
    this.activeAlerts.forEach(alert => {
      this.alertService.acknowledgeAlert(alert.id).subscribe();
    });
  }

  // Settings
  openSettings(): void {
    const dialogRef = this.dialog.open(SettingsDialog, {
      width: '600px',
      data: {
        autoRefresh: this.autoRefreshEnabled,
        refreshRate: this.systemPerformance.dataRefreshRate,
        showCharts: this.showCharts,
        showNotifications: this.showNotifications,
        showPerformance: this.showPerformance,
        layout: this.dashboardLayout
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.autoRefreshEnabled = result.autoRefresh;
        this.systemPerformance.dataRefreshRate = result.refreshRate;
        this.showCharts = result.showCharts;
        this.showNotifications = result.showNotifications;
        this.showPerformance = result.showPerformance;
        this.dashboardLayout = result.layout;
        this.saveUserPreferences();
      }
    });
  }

  // Utility Methods
  getStatusColor(status: string): string {
    switch(status.toLowerCase()) {
      case 'on time':
      case 'available':
      case 'low':
        return '#2ecc71';
      case 'boarding':
      case 'in use':
      case 'medium':
        return '#f39c12';
      case 'delayed':
      case 'occupied':
      case 'maintenance':
      case 'high':
        return '#e74c3c';
      case 'departed':
      case 'arrived':
      case 'closed':
      case 'critical':
        return '#c0392b';
      default:
        return '#95a5a6';
    }
  }

  getPriorityIcon(priority: number): string {
    switch(priority) {
      case 1: return 'error';
      case 2: return 'warning';
      case 3: return 'info';
      default: return 'notifications';
    }
  }

  getPriorityColor(priority: number): string {
    switch(priority) {
      case 1: return '#e74c3c';
      case 2: return '#f39c12';
      case 3: return '#3498db';
      default: return '#95a5a6';
    }
  }

  getWeatherIcon(condition: string): string {
    const conditionMap: { [key: string]: string } = {
      'sunny': 'wb_sunny',
      'cloudy': 'cloud',
      'rainy': 'umbrella',
      'stormy': 'flash_on',
      'snowy': 'ac_unit',
      'foggy': 'cloud',
      'clear': 'wb_sunny'
    };
    return conditionMap[condition.toLowerCase()] || 'wb_sunny';
  }

  // User Preferences
  loadUserPreferences(): void {
    const preferences = localStorage.getItem('airportDashboardPreferences');
    if (preferences) {
      const parsed = JSON.parse(preferences);
      this.autoRefreshEnabled = parsed.autoRefreshEnabled ?? true;
      this.dashboardLayout = parsed.dashboardLayout ?? 'default';
      this.showCharts = parsed.showCharts ?? true;
      this.showNotifications = parsed.showNotifications ?? true;
      this.showPerformance = parsed.showPerformance ?? true;
      this.systemPerformance.dataRefreshRate = parsed.refreshRate ?? 5;
    }
  }

  saveUserPreferences(): void {
    const preferences = {
      autoRefreshEnabled: this.autoRefreshEnabled,
      dashboardLayout: this.dashboardLayout,
      showCharts: this.showCharts,
      showNotifications: this.showNotifications,
      showPerformance: this.showPerformance,
      refreshRate: this.systemPerformance.dataRefreshRate,
      lastTab: this.selectedTabIndex
    };
    localStorage.setItem('airportDashboardPreferences', JSON.stringify(preferences));
  }

  // Performance Optimization
  setupResizeListener(): void {
    window.addEventListener('resize', this.debounce(() => {
      // Handle responsive layout adjustments
    }, 250));
  }

  private debounce(func: Function, wait: number): () => void {
    let timeout: any;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Cleanup
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.dataSubscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.simulationSubscription) {
      this.simulationSubscription.unsubscribe();
    }
    
    if (this.alertSubscription) {
      this.alertSubscription.unsubscribe();
    }
    
    // Save preferences on destroy
    this.saveUserPreferences();
  }
}